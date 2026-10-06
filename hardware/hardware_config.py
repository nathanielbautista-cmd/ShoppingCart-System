"""GPIO assignments for the iCart load cells and physical controls."""
from pathlib import Path


GPIO_CHIP = 0

# BCM GPIO numbering, not physical header pin numbers.
HX711_SENSORS = {
    "hx711_1": {"dt_pin": 5, "sck_pin": 6},
    "hx711_2": {"dt_pin": 13, "sck_pin": 16},
    "hx711_3": {"dt_pin": 19, "sck_pin": 20},
    "hx711_4": {"dt_pin": 21, "sck_pin": 26},
}

# Phase 5.1 safety gate: only one physically wired HX711 is read at first.
ACTIVE_SENSOR_IDS = ("hx711_1",)

RAW_SAMPLE_COUNT = 15
RAW_READY_TIMEOUT_SECONDS = 2.0
STABILITY_TOLERANCE_GRAMS = 10.0
OUTLIER_MAD_MULTIPLIER = 3.5

CALIBRATION_FILE = Path(__file__).with_name("calibration_data.json")

# BCM GPIO numbering. Buttons are wired between the GPIO and GND, so their
# normal state is HIGH through the Pi's internal pull-up resistor.
BUTTON_PINS = {
    "power": 23,
    "restart": 24,
    "add_product": 17,
    "remove_product": 27,
}
POWER_INDICATOR_LED_PIN = 25
BUTTON_DEBOUNCE_SECONDS = 0.15


def get_sensor_pins(sensor_id: str) -> dict:
    try:
        return HX711_SENSORS[sensor_id]
    except KeyError as error:
        available = ", ".join(HX711_SENSORS)
        raise ValueError(f"Unknown sensor '{sensor_id}'. Available: {available}") from error
