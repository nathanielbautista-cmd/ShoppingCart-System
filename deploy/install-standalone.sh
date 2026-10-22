#!/bin/bash
set -euo pipefail

APP_USER="icart"
APP_DIR="/home/icart/icart"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer with sudo." >&2
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  echo "Required Linux user '${APP_USER}' does not exist." >&2
  exit 1
fi

if [[ ! -f "${APP_DIR}/backend/package-lock.json" || ! -f "${APP_DIR}/dist/index.html" ]]; then
  echo "Backend files or the built frontend are missing from ${APP_DIR}." >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  nodejs npm nginx curl build-essential python3 make g++

install -d -o "${APP_USER}" -g "${APP_USER}" \
  "${APP_DIR}/backend/data" "${APP_DIR}/backend/backups"

cd "${APP_DIR}/backend"
sudo -u "${APP_USER}" npm ci --omit=dev

if [[ ! -f "${APP_DIR}/backend/data/icart.db" ]]; then
  sudo -u "${APP_USER}" npm run seed
fi

install -d /var/www/icart
cp -a "${APP_DIR}/dist/." /var/www/icart/
chown -R www-data:www-data /var/www/icart

install -m 0644 "${APP_DIR}/deploy/nginx/icart-kiosk.conf" /etc/nginx/sites-available/icart-kiosk
ln -sfn /etc/nginx/sites-available/icart-kiosk /etc/nginx/sites-enabled/icart-kiosk
rm -f /etc/nginx/sites-enabled/default

install -m 0644 "${APP_DIR}/deploy/systemd/icart-backend.service" /etc/systemd/system/icart-backend.service
install -m 0644 "${APP_DIR}/deploy/systemd/icart-db-backup.service" /etc/systemd/system/icart-db-backup.service
install -m 0644 "${APP_DIR}/deploy/systemd/icart-db-backup.timer" /etc/systemd/system/icart-db-backup.timer
install -m 0644 "${APP_DIR}/hardware/systemd/icart-cart-controls.service" /etc/systemd/system/icart-cart-controls.service
install -m 0644 "${APP_DIR}/hardware/systemd/icart-load-cell.service" /etc/systemd/system/icart-load-cell.service
install -m 0644 "${APP_DIR}/deploy/defaults/icart-cart-controls" /etc/default/icart-cart-controls
chmod 0755 "${APP_DIR}/deploy/start-kiosk.sh"

nginx -t
systemctl daemon-reload
systemctl enable --now icart-backend.service
systemctl enable --now nginx.service
systemctl restart nginx.service
systemctl enable --now icart-db-backup.timer

systemctl enable --now icart-cart-controls.service
systemctl enable --now icart-load-cell.service
systemctl restart icart-cart-controls.service icart-load-cell.service

for attempt in {1..30}; do
  if curl --fail --silent --max-time 3 http://127.0.0.1/api/health >/dev/null; then
    echo "iCart standalone installation is healthy."
    exit 0
  fi
  sleep 1
done

echo "Installation finished, but the health check failed." >&2
systemctl --no-pager --full status icart-backend.service nginx.service || true
exit 1
