"""Tare, calibration, and stable gram readings built on the HX711 reader."""
import json
import statistics
from dataclasses import dataclass
from typing import Iterable

from hardware_config import (
    CALIBRATION_MIN_SIGNAL_TO_NOISE_RATIO,
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
        # Quantized HX711 samples often contain the exact same value. In that
        # case MAD is zero even when one electrical-noise spike is present.
        # Keeping every sample would let that spike inflate the spread and
        # incorrectly mark an otherwise motionless scale as unstable.
        median_samples = [value for value in values if value == median]
        return median_samples or values
    limit = mad * OUTLIER_MAD_MULTIPLIER
    return [value for value in values if abs(value - median) <= limit]


def summarize_samples(samples: Iterable[float]) -> tuple[float, float, int]:
    """Return a spike-resistant center, spread, and retained sample count."""
    values = list(samples)
    if not values:
        raise ValueError("At least one HX711 sample is required")
    filtered = filter_outliers(values) or values
    return (
        float(statistics.median(filtered)),
        float(max(filtered) - min(filtered)),
        len(filtered),
    )


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
        baseline, _spread, _sample_count = summarize_samples(self.raw_samples(count))
        return baseline

    def tare(self) -> float:
        """Store the empty-platform raw baseline while preserving calibration."""
        baseline, spread, sample_count = summarize_samples(self.raw_samples())
        data = load_calibration_data()
        sensor_data = data.setdefault(self.sensor_id, {})
        sensor_data["tare_offset"] = baseline
        sensor_data["tare_spread_raw"] = spread
        sensor_data["tare_sample_count"] = sample_count
        save_calibration_data(data)
        return baseline

    def calibrate(self, reference_grams: float) -> float:
        if reference_grams <= 0:
            raise ValueError("Reference weight must be greater than zero grams")
        data = load_calibration_data()
        sensor_data = data.get(self.sensor_id, {})
        if "tare_offset" not in sensor_data:
            raise CalibrationRequiredError("Tare the empty platform before calibration")

        loaded_raw, loaded_spread, loaded_sample_count = summarize_samples(self.raw_samples())
        raw_change = loaded_raw - float(sensor_data["tare_offset"])
        raw_noise = max(
            float(sensor_data.get("tare_spread_raw", 0.0)),
            loaded_spread,
            1.0,
        )
        signal_to_noise_ratio = abs(raw_change) / raw_noise
        if signal_to_noise_ratio < CALIBRATION_MIN_SIGNAL_TO_NOISE_RATIO:
            raise CalibrationRequiredError(
                "Calibration signal is too noisy. Keep the platform still and check the "
                "load-cell mounting, E+/E-/A+/A- wiring, and power supply before retrying. "
                f"Signal-to-noise ratio was {signal_to_noise_ratio:.1f}; "
                f"at least {CALIBRATION_MIN_SIGNAL_TO_NOISE_RATIO:.1f} is required."
            )

        calibration_factor = raw_change / reference_grams

        sensor_data["calibration_factor"] = calibration_factor
        sensor_data["reference_grams"] = reference_grams
        sensor_data["loaded_spread_raw"] = loaded_spread
        sensor_data["loaded_sample_count"] = loaded_sample_count
        sensor_data["calibration_signal_to_noise_ratio"] = round(signal_to_noise_ratio, 2)
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
        measured_grams, spread, sample_count = summarize_samples(grams)
        return WeightReading(
            # The median is much less sensitive than the mean to an occasional
            # corrupt bit-banged HX711 sample.
            grams=round(measured_grams, 1),
            stable=spread <= STABILITY_TOLERANCE_GRAMS,
            sample_count=sample_count,
            spread_grams=round(spread, 1),
        )
