#!/usr/bin/env python3
"""Manual Phase 5.1 test commands for one HX711 load cell."""
import argparse
import time

from hardware_config import HX711_SENSORS
from load_cell import CalibrationRequiredError, LoadCell


def main() -> None:
    parser = argparse.ArgumentParser(description="iCart load-cell test")
    parser.add_argument("action", choices=("raw", "weight", "monitor"))
    parser.add_argument("--sensor", default="hx711_1")
    parser.add_argument("--count", type=int, default=1, help="Monitor readings; 0 means continuous")
    args = parser.parse_args()

    if args.sensor not in HX711_SENSORS:
        parser.error(f"Unknown sensor '{args.sensor}'. Choose from: {', '.join(HX711_SENSORS)}")

    pins = HX711_SENSORS[args.sensor]
    print(f"Testing {args.sensor}: DT GPIO{pins['dt_pin']}, SCK GPIO{pins['sck_pin']}")
    try:
        with LoadCell(args.sensor) as cell:
            if args.action == "raw":
                samples = cell.raw_samples()
                print(f"Raw samples: {samples}")
                print(f"Raw baseline: {cell.raw_baseline():.1f}")
                return

            remaining = args.count
            while remaining != 0:
                reading = cell.read_weight()
                status = "STABLE" if reading.stable else "UNSTABLE"
                print(
                    f"Weight: {reading.grams:.1f} g | Status: {status} | "
                    f"Spread: {reading.spread_grams:.1f} g | Samples: {reading.sample_count}"
                )
                if args.action == "weight":
                    return
                if remaining > 0:
                    remaining -= 1
                time.sleep(0.5)
    except CalibrationRequiredError as error:
        print(f"Calibration required: {error}")
    except Exception as error:
        print(f"Hardware error: {error}")


if __name__ == "__main__":
    main()
