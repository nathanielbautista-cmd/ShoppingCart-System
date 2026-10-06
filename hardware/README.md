# iCart Phase 5: Load Cells and HX711

Phase 5.1 reads only `hx711_1` until it is proven stable and calibrated.
The other three pin assignments are recorded but intentionally disabled.

## Confirm wiring before power

Use BCM GPIO numbering:

| HX711 | DT | SCK |
| --- | --- | --- |
| #1 | GPIO5 | GPIO6 |
| #2 | GPIO13 | GPIO16 |
| #3 | GPIO19 | GPIO20 |
| #4 | GPIO21 | GPIO26 |

For the first test, connect only HX711 #1 to Raspberry Pi:

```text
Raspberry Pi 3.3V  -> HX711 VCC
Raspberry Pi GND   -> HX711 GND
GPIO5              -> HX711 DT/DOUT
GPIO6              -> HX711 SCK/CLK
```

Check the labels printed on your specific HX711 board. Typical load-cell wiring
is red -> E+, black -> E-, white -> A+, and green -> A-, but verify the load
cell documentation before applying power. All modules must share Pi ground.

## Install

```bash
sudo apt install -y python3-lgpio
```

## Physical cart buttons

All button GPIO values use BCM numbering. Wire each normally-open button
between its GPIO and GND (the service enables the internal pull-up):

| Control | GPIO |
| --- | --- |
| Power on/off | 23 |
| Restart touchscreen | 24 |
| Add scanned product | 17 |
| Remove selected product | 27 |
| Power LED (output) | 25 |

Run the backend first, then start the bridge on the Pi:

```bash
python3 cart_controls.py --api-url http://127.0.0.1:5000
```

The LED is on only while the cart is powered on. Add confirms the currently
scanned product and Remove confirms the selected removal without waiting for a
load-cell reading. They do nothing unless the cart is powered on, so an
accidental press cannot alter a cart while it is off.

Copy this `hardware` folder to the Pi, then test from that folder.

## Test one cell

With the empty platform still:

```bash
python3 hardware_test.py raw
python3 calibration.py tare
```

Put a known weight, such as 220 g, on the platform and keep it still:

```bash
python3 calibration.py calibrate --reference-grams 220
python3 hardware_test.py weight
python3 hardware_test.py monitor --count 10
```

Expected output after calibration:

```text
Weight: 220.0 g | Status: STABLE | Spread: 3.1 g | Samples: 15
```

Calibration is saved locally as `calibration_data.json`, which is created only
after successful tare/calibration. For diagnostics, test one selected module at
a time, for example `python3 hardware_test.py raw --sensor hx711_2`. Do not
calibrate HX711 #2 through #4 until HX711 #1 reports stable, realistic weights.
