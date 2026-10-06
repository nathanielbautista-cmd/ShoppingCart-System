"""Tare, calibration, and stable gram readings built on the HX711 reader."""
import json
import statistics
from dataclasses import dataclass
from typing import Iterable

from hardware_config import (
    CALIBRATION_FILE,
    OUTLIER_MAD_MULTIPLIER,
    RAW_SAMPLE_COUNT,
    STABILITY_TOLERANCE_GRAMS,
    get_sensor_pins,
)
from hx711 import HX711


class CalibrationRequiredError(RuntimeError):
    """Raised when a gram reading is requested before calibration."""


@dataclass
class WeightReading:
    grams: float
    stable: bool
    sample_count: int
    spread_grams: float


def load_calibration_data() -> dict:
    if not CALIBRATION_FILE.exists():
        return {}
    with CALIBRATION_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_calibration_data(data: dict) -> None:
    with CALIBRATION_FILE.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, sort_keys=True)
        file.write("\n")


def filter_outliers(samples: Iterable[float]) -> list[float]:
    values = list(samples)
    if len(values) < 3:
        return values
    median = statistics.median(values)
    deviations = [abs(value - median) for value in values]
    mad = statistics.median(deviations)
    if mad == 0:
        return values
    limit = mad * OUTLIER_MAD_MULTIPLIER
    return [value for value in values if abs(value - median) <= limit]


class LoadCell:
    def __init__(self, sensor_id: str):
        self.sensor_id = sensor_id
        pins = get_sensor_pins(sensor_id)
        self.hx711 = HX711(pins["dt_pin"], pins["sck_pin"])

    def close(self) -> None:
        self.hx711.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()

    def raw_samples(self, count: int = RAW_SAMPLE_COUNT) -> list[int]:
        return [self.hx711.read_raw() for _ in range(count)]

    def raw_baseline(self, count: int = RAW_SAMPLE_COUNT) -> float:
        filtered = filter_outliers(self.raw_samples(count))
        return float(statistics.median(filtered))

    def tare(self) -> float:
        """Store the empty-platform raw baseline while preserving calibration."""
        baseline = self.raw_baseline()
        data = load_calibration_data()
        sensor_data = data.setdefault(self.sensor_id, {})
        sensor_data["tare_offset"] = baseline
        save_calibration_data(data)
        return baseline

    def calibrate(self, reference_grams: float) -> float:
        if reference_grams <= 0:
            raise ValueError("Reference weight must be greater than zero grams")
        data = load_calibration_data()
        sensor_data = data.get(self.sensor_id, {})
        if "tare_offset" not in sensor_data:
            raise CalibrationRequiredError("Tare the empty platform before calibration")

        loaded_raw = self.raw_baseline()
        calibration_factor = (loaded_raw - sensor_data["tare_offset"]) / reference_grams
        if calibration_factor == 0:
            raise CalibrationRequiredError("No weight change detected. Check the load cell and reference weight.")

        sensor_data["calibration_factor"] = calibration_factor
        sensor_data["reference_grams"] = reference_grams
        data[self.sensor_id] = sensor_data
        save_calibration_data(data)
        return calibration_factor

    def read_weight(self, count: int = RAW_SAMPLE_COUNT) -> WeightReading:
        sensor_data = load_calibration_data().get(self.sensor_id, {})
        if "tare_offset" not in sensor_data or "calibration_factor" not in sensor_data:
            raise CalibrationRequiredError("Run tare and calibration before requesting grams")

        tare_offset = float(sensor_data["tare_offset"])
        factor = float(sensor_data["calibration_factor"])
        grams = [(sample - tare_offset) / factor for sample in self.raw_samples(count)]
        filtered = filter_outliers(grams)
        if not filtered:
            filtered = grams
        spread = max(filtered) - min(filtered)
        return WeightReading(
            grams=round(float(statistics.mean(filtered)), 1),
            stable=spread <= STABILITY_TOLERANCE_GRAMS,
            sample_count=len(filtered),
            spread_grams=round(spread, 1),
        )
