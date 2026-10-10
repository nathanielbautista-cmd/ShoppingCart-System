#!/usr/bin/env python3
"""Publish live HX711 basket-weight readings to the iCart backend."""

import argparse
import json
import logging
import time
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen

from hardware_config import ACTIVE_SENSOR_IDS
from load_cell import CalibrationRequiredError, LoadCell


logging.basicConfig(level=logging.INFO, format="[Load cells] %(message)s")
logger = logging.getLogger("icart.load_cells")


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


def run(api_url: str, interval_seconds: float) -> None:
    cells = [LoadCell(sensor_id) for sensor_id in ACTIVE_SENSOR_IDS]
    logger.info("Publishing %s to %s", ", ".join(ACTIVE_SENSOR_IDS), api_url)
    try:
        while True:
            try:
                readings = [cell.read_weight() for cell in cells]
                payload = {
                    "grams": max(0.0, round(sum(reading.grams for reading in readings), 1)),
                    "stable": all(reading.stable for reading in readings),
                    "spreadGrams": round(sum(reading.spread_grams for reading in readings), 1),
                    "sampleCount": sum(reading.sample_count for reading in readings),
                    "sensorCount": len(readings),
                    "measuredAt": datetime.now(timezone.utc).isoformat(),
                }
                post_reading(api_url, payload)
                logger.info(
                    "%.1f g | %s | spread %.1f g | %d samples",
                    payload["grams"],
                    "STABLE" if payload["stable"] else "UNSTABLE",
                    payload["spreadGrams"],
                    payload["sampleCount"],
                )
            except (URLError, RuntimeError, TimeoutError) as error:
                logger.error("Could not publish reading: %s", error)
            time.sleep(interval_seconds)
    finally:
        for cell in cells:
            cell.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="iCart live HX711 service")
    parser.add_argument("--api-url", default="http://127.0.0.1:5000", help="Backend base URL")
    parser.add_argument("--interval", type=float, default=0.35, help="Seconds between readings")
    args = parser.parse_args()

    if args.interval <= 0:
        parser.error("--interval must be greater than zero")

    try:
        run(args.api_url, args.interval)
    except CalibrationRequiredError as error:
        logger.error("Calibration required: %s", error)
        raise SystemExit(2) from error
    except KeyboardInterrupt:
        logger.info("Stopped")


if __name__ == "__main__":
    main()
