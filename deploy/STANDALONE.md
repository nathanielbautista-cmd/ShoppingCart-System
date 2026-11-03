# Standalone Raspberry Pi deployment

The kiosk now runs its frontend, Node.js API, hardware services, and SQLite database on the Raspberry Pi. A laptop and MongoDB are not required after deployment.

## Layout on the Pi

- Application: `/home/icart/icart`
- Frontend served by Nginx: `/var/www/icart`
- SQLite database: `/home/icart/icart/backend/data/icart.db`
- Daily backups: `/home/icart/icart/backend/backups`
- API: `http://127.0.0.1:5000`
- Kiosk URL: `http://127.0.0.1/`

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
