# Standalone Raspberry Pi deployment

The kiosk now runs its frontend, Node.js API, hardware services, and SQLite database on the Raspberry Pi. A laptop and MongoDB are not required after deployment.

## Layout on the Pi

- Application: `/home/icart/icart`
- Frontend served by Nginx: `/var/www/icart`
- SQLite database: `/home/icart/icart/backend/data/icart.db`
- Daily backups: `/home/icart/icart/backend/backups`
- API: `http://127.0.0.1:5000`
- Kiosk URL: `http://127.0.0.1/`

## Remote admin access

The kiosk welcome screen is customer-only. The admin sign-in is available at
`/admin` through Tailscale, while the account, API, and database remain on the
Pi. The Nginx configuration denies `/admin` requests from devices outside the
Tailscale network. Do not expose the kiosk ports to the public internet with
router port forwarding.

1. Install Tailscale on the Pi using the [official Linux instructions](https://tailscale.com/docs/install/linux). On Raspberry Pi OS, the commands are:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. Install Tailscale on the admin phone or laptop and sign in to the same
   Tailscale account, or invite that user to the private network.
3. Get the Pi's Tailscale IP from the Tailscale device list, then open
   `http://<TAILSCALE-IP>/admin` on the admin device.
4. Sign in with the iCart admin account.

On a fresh Pi deployment, update Nginx with the configuration in
`deploy/nginx/icart-kiosk.conf` so this access rule is applied. Devices on the
local Wi-Fi cannot open `/admin`; the Pi and admin device must both be
connected to Tailscale.

For the Windows kiosk development setup, install Tailscale on the kiosk PC
and admin device, then open `http://<TAILSCALE-IP>:3000/admin`. The Vite
development server also restricts `/admin` to Tailscale IPv4 clients. Windows
Firewall must allow inbound TCP port 3000 for Tailscale traffic. This Windows
launcher uses Vite's development server; use the Pi Nginx setup for a
production deployment.

## Install

Build the frontend before copying the repository to the Pi:

```bash
npm install
npm run build
```

On the Pi, after the repository and `dist` folder are in `/home/icart/icart`:

```bash
cd /home/icart/icart
chmod +x deploy/install-standalone.sh
sudo ./deploy/install-standalone.sh
```

The installer seeds the sample products and default accounts only when the SQLite database does not yet exist.

## Touch scrolling and voice assistance

The kiosk launcher enables Chromium touch events. The frontend also converts
mouse-like finger drags from older USB touch controllers into list scrolling.

Voice prompts are sent to the local Pi speaker. The installer provides the
offline eSpeak fallback automatically. For a natural neural voice, install
Piper and copy both `en_US-lessac-medium.onnx` and
`en_US-lessac-medium.onnx.json` into `/home/icart/icart/voice/`. Then restart
the backend and verify the selected voice engine:

```bash
sudo systemctl restart icart-backend
curl http://127.0.0.1/api/hardware/voice/status
```

### DFPlayer Mini UART speaker

For a DFPlayer Mini wired to physical pins 2, 6, 8, and 10, enable the UART
once and reboot. The deployment config uses `/dev/serial0` and plays
`/mp3/0001.mp3` from the DFPlayer microSD card as the default alert until
separate prompt tracks are configured.

```bash
cd /home/icart/icart
chmod +x deploy/enable-dfplayer-uart.sh
sudo ./deploy/enable-dfplayer-uart.sh
sudo reboot
```

After reboot, test the speaker and restart the backend:

```bash
sudo -u icart /usr/bin/python3 hardware/dfplayer_player.py --track 1
sudo systemctl restart icart-backend
curl http://127.0.0.1/api/hardware/voice/status
```

## Receipt printer

Install the BP210 driver and configure the BP210 as the Raspberry Pi desktop's
default printer with 58 mm paper before starting the kiosk. The kiosk launcher
uses Chromium's `--kiosk-printing` mode, so a completed QR Ph payment prints the
receipt once without opening the print dialog.

For Windows laptop testing, connect the BP210 through USB and run PowerShell as
Administrator once:

```powershell
powershell.exe -ExecutionPolicy Bypass -File deploy/setup-bp210-windows.ps1 -PortName USB002 -PrintTestReceipt
```

Then launch the local backend, frontend, Chrome kiosk mode, and silent printing
with one command:

```powershell
npm run kiosk:windows
```

The Windows launcher checks that `BP210` is ready, makes it the default printer,
starts any missing local iCart services, and opens Chrome with
`--kiosk-printing`. Use `npm run printer:check` to verify the printer without
launching the kiosk, or `npm run printer:test` to print another test receipt.

## Check status

```bash
curl http://127.0.0.1/api/health
sudo systemctl status icart-backend nginx icart-db-backup.timer
sudo journalctl -u icart-backend -n 100 --no-pager
```

Create a manual database backup with:

```bash
cd /home/icart/icart/backend
npm run backup
```
