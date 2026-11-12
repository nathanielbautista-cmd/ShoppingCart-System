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

## DFPlayer Mini speaker

The DFPlayer Mini uses the Raspberry Pi primary UART and does not conflict
with the HX711 or cart-control GPIO assignments:

| Raspberry Pi physical pin | GPIO / function | DFPlayer Mini pin |
| --- | --- | --- |
| 2 | 5V | VCC |
| 6 | GND | GND |
| 8 | GPIO14 / TXD | RX, through a 1 kOhm resistor |
| 10 | GPIO15 / RXD | TX |

Connect the actual speaker only between the DFPlayer `SPK_1` and `SPK_2`
pins; neither speaker lead goes to Pi ground. Use a stable 5 V supply if the
module resets or the sound distorts at higher volume, and make sure its ground
is shared with the Pi.

On the microSD card, create an `mp3` folder and put numbered files in it, for
example `/mp3/0001.mp3`. The default deployment uses track 1 as a temporary
test/default prompt. To use separate recorded prompts, set the
`ICART_DFPLAYER_TRACK_*` variables in `backend/.env`; their names and values
are listed in `backend/.env.example`.

Enable the Pi UART once, then reboot:

```bash
sudo raspi-config nonint do_serial 0
sudo reboot
```

This turns on `/dev/serial0` and disables the serial login console so it will
not send text into the DFPlayer. After deployment, test a known track:

```bash
sudo -u icart /usr/bin/python3 /home/icart/icart/hardware/dfplayer_player.py --track 1
```

The `icart-backend` service has access to the `dialout` group and, when
`ICART_DFPLAYER_ENABLED=true`, uses the DFPlayer before Piper/eSpeak. Check
the selected output with:

```bash
curl http://127.0.0.1/api/hardware/voice/status
```

## Physical cart buttons

All button GPIO values use BCM numbering. Wire each normally-open button
between its GPIO and GND (the service enables the internal pull-up):

| Control | GPIO |
| --- | --- |
| Power on/off | 23 |
| Restart touchscreen | 24 |
| Add scanned product | 17 |
| Remove product | 27 |
| Power LED (output) | 25 |
| Red alarm LED (output) | 18 |

Run the backend first, then start the bridge on the Pi:

```bash
python3 cart_controls.py --api-url http://127.0.0.1:5000
```

The controller starts powered on so Add and Remove work immediately after a
Raspberry Pi or service restart. The power LED is on only while the cart is powered on. Wire GPIO18 through a
220-330 ohm resistor to the red LED's long leg (anode), then wire its short leg (cathode) to GND. It blinks when
an unscanned item remains in the basket for
10 seconds and stops as soon as the item is removed. Add starts or retries HX711
verification for the currently scanned product. Remove verifies a product
already selected on the touchscreen; without a selection, it arms the normal
automatic weight-matched removal flow. Neither button bypasses the scale.
They do nothing after the cart has been powered off.

Power on/off is a safe touchscreen state: it blanks or restores the kiosk and
controls the power LED, but it does not cut power to the Raspberry Pi. Restart
reloads the kiosk page with one normal press; it does not reboot the Raspberry
Pi operating system. Repeat restart signals are ignored for 10 seconds while
the browser reloads.

Run the live load-cell publisher in a second terminal after calibration:

```bash
python3 load_cell_service.py --api-url http://127.0.0.1:5000
```

The standalone deployment runs the Node backend on the same Raspberry Pi, so
keep `127.0.0.1`. The kiosk continues working even when the laptop and Wi-Fi
are off. The health endpoint remains local, and the customer top bar will show
**Scale ready** after a load-cell reading is published.

Instead of passing the address every time, set `ICART_API_URL` and an optional
cart name:

```bash
export ICART_API_URL=http://127.0.0.1:5000
export ICART_DEVICE_ID=cart-pi-01
python3 load_cell_service.py
```

Copy this `hardware` folder to the Pi, then test from that folder.

## Start automatically on Raspberry Pi

After the manual weight test succeeds, install the included `systemd` unit so
the HX711 publisher starts at boot and restarts if it exits. The template
assumes the project is at `/home/icart/icart` and the backend runs on the same
Pi at port 5000. Edit `WorkingDirectory`, `ExecStart`, or the
`ICART_API_URL` environment value if your setup differs.

For a backend on another computer, create both `/etc/default/icart-load-cell`
and `/etc/default/icart-cart-controls` before starting the units. Put the same
backend address in each file:

```ini
ICART_API_URL=http://192.168.1.50:5000
ICART_DEVICE_ID=cart-pi-01
```

```bash
cd /home/icart/icart/hardware
sudo usermod -aG gpio icart
sudo install -m 0644 systemd/icart-load-cell.service /etc/systemd/system/icart-load-cell.service
sudo install -m 0644 systemd/icart-cart-controls.service /etc/systemd/system/icart-cart-controls.service
sudo systemctl daemon-reload
sudo systemctl enable --now icart-load-cell.service icart-cart-controls.service
```

Log out and back in after changing group membership, then restart the service.
Confirm that it is publishing readings:

```bash
sudo systemctl status icart-load-cell.service --no-pager
sudo systemctl status icart-cart-controls.service --no-pager
sudo journalctl -u icart-load-cell.service -n 50 --no-pager
sudo journalctl -u icart-cart-controls.service -n 50 --no-pager
curl http://127.0.0.1:5000/api/hardware/weight-status
```

Use the backend PC address in the final command when it is not running on the
Pi. The command must return `"connected":true` and a JSON `reading`. If it reports that no reading
is available, check the service log for GPIO wiring, calibration, permissions,
or backend-connection errors. Do not bypass this check: the customer UI keeps
the product pending until a real, stable weight change is measured.

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

The calibration command now rejects a reference-weight signal that is too
close to the measured electrical/mechanical noise. This prevents a tiny,
incorrect calibration factor from turning normal raw jitter into hundreds of
grams. Fix loose wiring, mounting, basket contact, or power noise if it reports
`Calibration signal is too noisy`, then repeat both tare and calibration.

Live service logs include the retained sample count and spread. The publisher
must report `STABLE` with a spread of 10 g or less before product verification
can safely use the reading.

Calibration is saved locally as `calibration_data.json`, which is created only
after successful tare/calibration. For diagnostics, test one selected module at
a time, for example `python3 hardware_test.py raw --sensor hx711_2`. Do not
calibrate HX711 #2 through #4 until HX711 #1 reports stable, realistic weights.
