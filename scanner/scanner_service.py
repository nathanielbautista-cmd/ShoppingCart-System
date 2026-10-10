#!/usr/bin/env python3
"""Standalone USB HID keyboard scanner reader for the iCart OJ-MP6300.

This Phase 4 service reads barcode keystrokes only. It deliberately does not
call MongoDB, modify carts, look up products, or apply checkout rules.
"""
import logging
import time
from pathlib import Path
from typing import Callable, Optional

from evdev import InputDevice, ecodes

from scanner_config import (
    LOG_LEVEL,
    RECONNECT_DELAY_SECONDS,
    SCANNER_DEBOUNCE_MS,
    SCANNER_DEVICE,
    SCANNER_PRODUCT_ID,
    SCANNER_VENDOR_ID,
)

logging.basicConfig(level=LOG_LEVEL, format="[Scanner] %(message)s")
logger = logging.getLogger("icart.scanner")

KEY_TO_CHARACTER = {
    ecodes.KEY_0: "0", ecodes.KEY_1: "1", ecodes.KEY_2: "2",
    ecodes.KEY_3: "3", ecodes.KEY_4: "4", ecodes.KEY_5: "5",
    ecodes.KEY_6: "6", ecodes.KEY_7: "7", ecodes.KEY_8: "8",
    ecodes.KEY_9: "9",
    ecodes.KEY_A: "a", ecodes.KEY_B: "b", ecodes.KEY_C: "c",
    ecodes.KEY_D: "d", ecodes.KEY_E: "e", ecodes.KEY_F: "f",
    ecodes.KEY_G: "g", ecodes.KEY_H: "h", ecodes.KEY_I: "i",
    ecodes.KEY_J: "j", ecodes.KEY_K: "k", ecodes.KEY_L: "l",
    ecodes.KEY_M: "m", ecodes.KEY_N: "n", ecodes.KEY_O: "o",
    ecodes.KEY_P: "p", ecodes.KEY_Q: "q", ecodes.KEY_R: "r",
    ecodes.KEY_S: "s", ecodes.KEY_T: "t", ecodes.KEY_U: "u",
    ecodes.KEY_V: "v", ecodes.KEY_W: "w", ecodes.KEY_X: "x",
    ecodes.KEY_Y: "y", ecodes.KEY_Z: "z",
    ecodes.KEY_MINUS: "-", ecodes.KEY_SLASH: "/", ecodes.KEY_DOT: ".",
}
TERMINATION_KEYS = {ecodes.KEY_ENTER, ecodes.KEY_KPENTER}


class ScannerService:
    def __init__(self, on_barcode: Optional[Callable[[str], None]] = None):
        self.on_barcode = on_barcode or self._print_barcode
        self.device: Optional[InputDevice] = None
        self.buffer = ""
        self.last_barcode = ""
        self.last_barcode_time = 0.0

    @staticmethod
    def _print_barcode(barcode: str) -> None:
        logger.info("Barcode: %s", barcode)

    def _open_device(self) -> InputDevice:
        path = Path(SCANNER_DEVICE)
        if not path.exists():
            raise FileNotFoundError(f"Scanner not found at {SCANNER_DEVICE}")

        device = InputDevice(str(path))
        if device.info.vendor != SCANNER_VENDOR_ID or device.info.product != SCANNER_PRODUCT_ID:
            vendor, product = device.info.vendor, device.info.product
            device.close()
            raise RuntimeError(
                f"Unexpected input device: vendor=0x{vendor:04x}, product=0x{product:04x}"
            )
        return device

    def _emit_barcode(self) -> None:
        barcode = self.buffer.rstrip("\r\n")
        self.buffer = ""
        if not barcode:
            return

        now = time.monotonic()
        elapsed_ms = (now - self.last_barcode_time) * 1000
        if barcode == self.last_barcode and elapsed_ms < SCANNER_DEBOUNCE_MS:
            logger.info("Duplicate ignored: %s", barcode)
            return

        self.last_barcode = barcode
        self.last_barcode_time = now
        self.on_barcode(barcode)

    def _read_events(self) -> None:
        assert self.device is not None
        for event in self.device.read_loop():
            if event.type != ecodes.EV_KEY or event.value != 1:
                continue
            if event.code in TERMINATION_KEYS:
                self._emit_barcode()
                continue
            character = KEY_TO_CHARACTER.get(event.code)
            if character is not None:
                self.buffer += character

    def start(self) -> None:
        logger.info("Starting USB HID keyboard scanner service")
        while True:
            try:
                self.device = self._open_device()
                logger.info("READY (%s - %s)", self.device.path, self.device.name)
                self._read_events()
            except KeyboardInterrupt:
                logger.info("Stopped")
                return
            except (FileNotFoundError, OSError, RuntimeError) as error:
                logger.error("%s", error)
                logger.info("Waiting for scanner reconnect...")
                time.sleep(RECONNECT_DELAY_SECONDS)
            finally:
                if self.device is not None:
                    self.device.close()
                    self.device = None


if __name__ == "__main__":
    ScannerService().start()
