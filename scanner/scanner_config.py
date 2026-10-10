"""Configuration for the Phase 4 OJ-MP6300 scanner service."""
import os

SCANNER_DEVICE = os.environ.get(
    "SCANNER_DEVICE",
    "/dev/input/by-id/usb-YOKO_HID_GUM_035294-event-kbd",
)

SCANNER_VENDOR_ID = int(os.environ.get("SCANNER_VENDOR_ID", "1d82"), 16)
SCANNER_PRODUCT_ID = int(os.environ.get("SCANNER_PRODUCT_ID", "5c92"), 16)
SCANNER_DEBOUNCE_MS = int(os.environ.get("SCANNER_DEBOUNCE_MS", "500"))
RECONNECT_DELAY_SECONDS = float(os.environ.get("SCANNER_RECONNECT_DELAY_SECONDS", "2"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
