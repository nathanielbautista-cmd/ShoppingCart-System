#!/usr/bin/env python3
"""Publish live HX711 basket-weight readings to the iCart backend."""

import argparse
import json
import logging
import os
import socket
import time
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen

from hardware_config import ACTIVE_SENSOR_IDS, LIVE_SAMPLE_COUNT
from load_cell import CalibrationRequiredError, LoadCell


logging.basicConfig(level=logging.INFO, format="[Load cells] %(message)s")
logger = logging.getLogger("icart.load_cells")


DEFAULT_API_URL = os.environ.get("ICART_API_URL", "http://127.0.0.1:5000")
DEFAULT_DEVICE_ID = os.environ.get("ICART_DEVICE_ID", socket.gethostname())


def post_reading(api_url: str, payload: dict) -> None:
    request = Request(
        api_url.rstrip("/") + "/api/hardware/weight",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=2) as response:
        if not 200 <= response.status < 300:
            raise RuntimeError(f"backend returned HTTP {response.status}")


def make_payload(cells: list, device_id: str) -> dict:
    readings = [cell.read_weight(count=LIVE_SAMPLE_COUNT) for cell in cells]
    return {
        # Preserve small negative empty-scale drift. Clamping it to zero hides
        # light additions (for example -8 g -> +2 g is a real +10 g change).
        "grams": round(sum(reading.grams for reading in readings), 1),
        "stable": all(reading.stable for reading in readings),
        "spreadGrams": round(sum(reading.spread_grams for reading in readings), 1),
        "sampleCount": sum(reading.sample_count for reading in readings),
        "sensorCount": len(readings),
        "sensorIds": [cell.sensor_id for cell in cells],
        "deviceId": device_id,
        "measuredAt": datetime.now(timezone.utc).isoformat(),
    }


def run(api_url: str, interval_seconds: float, device_id: str, once: bool = False) -> None:
    cells = [LoadCell(sensor_id) for sensor_id in ACTIVE_SENSOR_IDS]
    logger.info(
        "Publishing %s from %s to %s",
        ", ".join(ACTIVE_SENSOR_IDS),
        device_id,
        api_url,
    )
    try:
        while True:
            try:
                payload = make_payload(cells, device_id)
                post_reading(api_url, payload)
                logger.info(
                    "%.1f g | %s | spread %.1f g | %d samples",
                    payload["grams"],
                    "STABLE" if payload["stable"] else "UNSTABLE",
                    payload["spreadGrams"],
                    payload["sampleCount"],
                )
            except (URLError, RuntimeError, TimeoutError, OSError) as error:
                logger.error("Could not publish reading: %s", error)
                if once:
                    raise
            if once:
                return
            time.sleep(interval_seconds)
    finally:
        for cell in cells:
            cell.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="iCart live HX711 service")
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help="Backend base URL (or set ICART_API_URL)",
    )
    parser.add_argument(
        "--device-id",
        default=DEFAULT_DEVICE_ID,
        help="Cart/Pi identifier sent with readings (or set ICART_DEVICE_ID)",
    )
    parser.add_argument("--interval", type=float, default=0.10, help="Seconds between readings")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Read and publish once, then exit (useful for connection testing)",
    )
    args = parser.parse_args()

    if args.interval <= 0:
        parser.error("--interval must be greater than zero")

    try:
        run(args.api_url, args.interval, args.device_id, args.once)
    except CalibrationRequiredError as error:
        logger.error("Calibration required: %s", error)
        raise SystemExit(2) from error
    except KeyboardInterrupt:
        logger.info("Stopped")


if __name__ == "__main__":
    main()
