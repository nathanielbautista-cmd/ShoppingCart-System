#!/usr/bin/env python3
"""GPIO button bridge for the iCart touchscreen.

The service posts button events to the backend; it never edits the database
directly.  This lets the kiosk UI decide which scanned/selected product should
be added or removed. GPIO numbers are BCM numbers.
"""
import argparse
import json
import logging
import os
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

try:
    import lgpio
except ImportError:
    lgpio = None

from hardware_config import (
    ALARM_LED_PIN,
    BUTTON_DEBOUNCE_SECONDS,
    BUTTON_PINS,
    GPIO_CHIP,
    POWER_INDICATOR_LED_PIN,
)

logging.basicConfig(level=logging.INFO, format="[Cart controls] %(message)s")
logger = logging.getLogger("icart.controls")

DEFAULT_API_URL = os.environ.get("ICART_API_URL", "http://127.0.0.1:5000")


class CartControls:
    def __init__(self, api_url: str):
        if lgpio is None:
            raise RuntimeError("lgpio is not installed. Install python3-lgpio on the Raspberry Pi.")
        api_base_url = api_url.rstrip("/") + "/api/hardware"
        self.events_url = api_base_url + "/events"
        self.outputs_url = api_base_url + "/outputs"
        self.handle = lgpio.gpiochip_open(GPIO_CHIP)
        # The touchscreen application also boots powered on. Keep the physical
        # controller in the same state so Add/Remove work immediately after a
        # service or Raspberry Pi restart.
        self.powered = True
        self.previous = {}
        self.last_press = {name: 0.0 for name in BUTTON_PINS}
        self.alarm_active = False
        self.alarm_led_on = False
        self.last_output_sync = 0.0
        self.output_connected = None
        try:
            for name, pin in BUTTON_PINS.items():
                lgpio.gpio_claim_input(self.handle, pin, lgpio.SET_PULL_UP)
                self.previous[name] = lgpio.gpio_read(self.handle, pin)
            lgpio.gpio_claim_output(self.handle, POWER_INDICATOR_LED_PIN, 1)
            lgpio.gpio_claim_output(self.handle, ALARM_LED_PIN, 0)
        except Exception:
            lgpio.gpiochip_close(self.handle)
            raise

    def close(self):
        if self.handle is not None:
            lgpio.gpio_write(self.handle, POWER_INDICATOR_LED_PIN, 0)
            lgpio.gpio_write(self.handle, ALARM_LED_PIN, 0)
            lgpio.gpiochip_close(self.handle)
            self.handle = None

    def emit(self, action: str):
        payload = json.dumps({"action": action}).encode("utf-8")
        request = Request(self.events_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(request, timeout=2) as response:
                if not 200 <= response.status < 300:
                    raise RuntimeError(f"backend returned HTTP {response.status}")
            logger.info("%s", action)
        except (URLError, RuntimeError) as error:
            logger.error("Could not deliver %s: %s", action, error)

    def sync_outputs(self):
        request = Request(self.outputs_url, method="GET")
        try:
            with urlopen(request, timeout=0.5) as response:
                if not 200 <= response.status < 300:
                    raise RuntimeError(f"backend returned HTTP {response.status}")
                payload = json.loads(response.read().decode("utf-8"))
            self.alarm_active = payload.get("alarmActive") is True
            if self.output_connected is not True:
                logger.info("Alarm LED connected: GPIO%s", ALARM_LED_PIN)
            self.output_connected = True
        except (URLError, RuntimeError, ValueError, json.JSONDecodeError) as error:
            if self.output_connected is not False:
                logger.error("Could not read hardware outputs: %s", error)
            self.output_connected = False

    def update_alarm_led(self, now: float):
        # Blink twice per second while the browser alarm is active.
        should_be_on = self.powered and self.alarm_active and int(now * 4) % 2 == 0
        if should_be_on != self.alarm_led_on:
            self.alarm_led_on = should_be_on
            lgpio.gpio_write(self.handle, ALARM_LED_PIN, int(should_be_on))

    def press(self, name: str):
        if name == "power":
            self.powered = not self.powered
            lgpio.gpio_write(self.handle, POWER_INDICATOR_LED_PIN, int(self.powered))
            if not self.powered:
                self.alarm_led_on = False
                lgpio.gpio_write(self.handle, ALARM_LED_PIN, 0)
            self.emit("power_on" if self.powered else "power_off")
        elif name == "restart":
            self.emit("restart")
        elif self.powered:
            self.emit(name)
        else:
            logger.info("Ignored %s: cart is powered off", name)

    def run(self):
        logger.info(
            "Ready: power=GPIO23, restart=GPIO24, add=GPIO17, delete=GPIO27, "
            "power LED=GPIO25, red alarm LED=GPIO%s",
            ALARM_LED_PIN,
        )
        # Publish the initial state so the touchscreen and physical controller
        # agree after either service is restarted.
        self.emit("power_on")
        try:
            while True:
                now = time.monotonic()
                if now - self.last_output_sync >= 0.5:
                    self.last_output_sync = now
                    self.sync_outputs()
                self.update_alarm_led(now)
                for name, pin in BUTTON_PINS.items():
                    state = lgpio.gpio_read(self.handle, pin)

                    if self.previous[name] == 1 and state == 0 and now - self.last_press[name] >= BUTTON_DEBOUNCE_SECONDS:
                        self.last_press[name] = now
                        self.press(name)
                    self.previous[name] = state
                time.sleep(0.01)
        finally:
            self.close()


def main():
    parser = argparse.ArgumentParser(description="iCart physical button service")
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help="Backend base URL (or set ICART_API_URL)",
    )
    args = parser.parse_args()
    CartControls(args.api_url).run()


if __name__ == "__main__":
    main()
