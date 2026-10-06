# iCart Phase 4 Scanner

This module reads the OJ-MP6300 scanner as a USB HID keyboard. The confirmed
device is `YOKO HID GUM` with USB vendor ID `1d82` and product ID `5c92`.

It reads clean barcode strings. The customer kiosk uses the scanner's normal
USB keyboard-wedge output directly in the browser: scan a product while the
customer shopping screen is open and the iCart frontend performs the MongoDB
product lookup and cart update automatically. No product-selection button is
required.

## Browser / kiosk setup

1. Configure the scanner's suffix to **Enter** (preferred) or **Tab**.
2. Open the iCart customer shopping screen; do not leave a text field focused.
3. Scan a barcode. The frontend displays either the detected product or the
   backend error (for example, an unknown or inactive barcode).
4. Confirm the barcode exists in the MongoDB `products` collection. The seed
   barcode `4800012345678` can be used for a first physical test.

The Python service below is a Raspberry Pi diagnostic/service option. It is
useful to confirm that Linux sees the physical device, but it should not be
used to create a second cart update while the browser is also receiving the
scanner's keyboard output.

## Install on Raspberry Pi

```bash
cd ~/icart/scanner
python3 -m pip install --user -r requirements.txt
sudo groupadd -f icart
sudo usermod -aG icart icart
sudo cp udev/99-icart-scanner.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Unplug and reconnect the scanner after applying the rule. Log out and back in
so the `icart` group membership is refreshed.

## Test

```bash
cd ~/icart/scanner
python3 scanner_test.py
```

Expected output:

```text
[Scanner] READY (/dev/input/by-id/usb-YOKO_HID_GUM_035294-event-kbd - YOKO HID GUM)
[Scanner] Barcode: 4800024562692
```

Test one normal scan, the same barcode twice, different barcodes, unplugging,
reconnecting, and several consecutive scans. The same barcode inside 500 ms is
ignored; a different barcode is never suppressed by debounce.

## Service

After manual testing passes, the systemd template can run the service as the
non-root `icart` user. The service uses the stable `/dev/input/by-id/...` path,
not `/dev/input/event5`, because event numbers may change after reconnecting.
