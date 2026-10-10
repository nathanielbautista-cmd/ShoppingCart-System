#!/usr/bin/env python3
"""GPIO button bridge for the iCart touchscreen.

The service posts button events to the backend; it never edits the database
directly.  This lets the kiosk UI decide which scanned/selected product should
be added or removed. GPIO numbers are BCM numbers.
"""
import argparse
import json
import logging
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

try:
    import lgpio
except ImportError:
    lgpio = None

from hardware_config import (
    BUTTON_DEBOUNCE_SECONDS,
    BUTTON_PINS,
    GPIO_CHIP,
    POWER_INDICATOR_LED_PIN,
)

logging.basicConfig(level=logging.INFO, format="[Cart controls] %(message)s")
logger = logging.getLogger("icart.controls")


class CartControls:
    def __init__(self, api_url: str):
        if lgpio is None:
            raise RuntimeError("lgpio is not installed. Install python3-lgpio on the Raspberry Pi.")
        self.api_url = api_url.rstrip("/") + "/api/hardware/events"
        self.handle = lgpio.gpiochip_open(GPIO_CHIP)
        self.powered = False
        self.previous = {}
        self.last_press = {name: 0.0 for name in BUTTON_PINS}
        try:
            for name, pin in BUTTON_PINS.items():
                lgpio.gpio_claim_input(self.handle, pin, lgpio.SET_PULL_UP)
                self.previous[name] = lgpio.gpio_read(self.handle, pin)
            lgpio.gpio_claim_output(self.handle, POWER_INDICATOR_LED_PIN, 0)
        except Exception:
            lgpio.gpiochip_close(self.handle)
            raise

    def close(self):
        if self.handle is not None:
            lgpio.gpio_write(self.handle, POWER_INDICATOR_LED_PIN, 0)
            lgpio.gpiochip_close(self.handle)
            self.handle = None

    def emit(self, action: str):
        payload = json.dumps({"action": action}).encode("utf-8")
        request = Request(self.api_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(request, timeout=2) as response:
                if not 200 <= response.status < 300:
                    raise RuntimeError(f"backend returned HTTP {response.status}")
            logger.info("%s", action)
        except (URLError, RuntimeError) as error:
            logger.error("Could not deliver %s: %s", action, error)

    def press(self, name: str):
        if name == "power":
            self.powered = not self.powered
            lgpio.gpio_write(self.handle, POWER_INDICATOR_LED_PIN, int(self.powered))
            self.emit("power_on" if self.powered else "power_off")
        elif name == "restart":
            self.emit("restart")
        elif self.powered:
            self.emit(name)
        else:
            logger.info("Ignored %s: cart is powered off", name)

    def run(self):
        logger.info("Ready: power=GPIO23, restart=GPIO24, add=GPIO17, delete=GPIO27, LED=GPIO25")
        # Publish the controller's initial state so a page that was already open
        # cannot remain visibly on after this service is restarted.
        self.emit("power_off")
        try:
            while True:
                now = time.monotonic()
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
    parser.add_argument("--api-url", default="http://127.0.0.1:5000", help="Backend base URL")
    args = parser.parse_args()
    CartControls(args.api_url).run()


if __name__ == "__main__":
    main()
