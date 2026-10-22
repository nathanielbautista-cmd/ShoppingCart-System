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
