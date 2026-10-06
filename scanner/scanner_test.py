#!/usr/bin/env python3
"""Manual Phase 4 test runner for the OJ-MP6300 USB keyboard scanner."""
from scanner_service import ScannerService


if __name__ == "__main__":
    print("iCart scanner test. Scan a barcode; press Ctrl-C to stop.")
    ScannerService().start()
