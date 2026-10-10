#!/usr/bin/env python3
"""Tare and calibrate one HX711 load cell with a known reference weight."""
import argparse

from load_cell import CalibrationRequiredError, LoadCell, load_calibration_data


def main() -> None:
    parser = argparse.ArgumentParser(description="iCart HX711 calibration")
    parser.add_argument("action", choices=("tare", "calibrate", "show"))
    parser.add_argument("--sensor", default="hx711_1")
    parser.add_argument("--reference-grams", type=float)
    args = parser.parse_args()

    if args.action == "show":
        print(load_calibration_data().get(args.sensor, {}))
        return
    if args.action == "calibrate" and args.reference_grams is None:
        parser.error("--reference-grams is required for calibration")

    try:
        with LoadCell(args.sensor) as cell:
            if args.action == "tare":
                print("Keep the platform empty and still while samples are collected.")
                print(f"Tare offset: {cell.tare():.1f}")
            else:
                print("Keep the reference weight still while samples are collected.")
                factor = cell.calibrate(args.reference_grams)
                print(f"Calibration factor: {factor:.6f} raw units per gram")
    except CalibrationRequiredError as error:
        print(f"Calibration failed: {error}")
        raise SystemExit(2) from error


if __name__ == "__main__":
    main()
