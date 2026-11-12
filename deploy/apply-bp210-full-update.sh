#!/bin/bash
set -euo pipefail

APP_USER="icart"
APP_DIR="/home/icart/icart"
ARCHIVE="${APP_DIR}/deploy/icart-bp210-full-deploy.tar.gz"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this updater with sudo." >&2
  exit 1
fi

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Deployment archive is missing: ${ARCHIVE}" >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y python3-usb espeak-ng alsa-utils
usermod -aG lp,audio "${APP_USER}"

staging="$(mktemp -d "${APP_DIR}/deploy/staging-bp210-XXXXXX")"
cleanup() {
  if [[ "${staging}" == "${APP_DIR}/deploy/staging-bp210-"* && -d "${staging}" ]]; then
    rm -rf -- "${staging}"
  fi
}
trap cleanup EXIT

tar -xzf "${ARCHIVE}" -C "${staging}"
chown -R "${APP_USER}:${APP_USER}" "${staging}"

cd "${staging}/backend"
sudo -u "${APP_USER}" npm ci --omit=dev
sudo -u "${APP_USER}" node --check controllers/paymentController.js
sudo -u "${APP_USER}" node --check services/receiptPrinterService.js
sudo -u "${APP_USER}" node --test tests/qrph-payment.test.js

python3 -m py_compile "${staging}/hardware/bp210_printer.py"
sudo -u "${APP_USER}" -g lp python3 "${staging}/hardware/bp210_printer.py" --probe

stamp="$(date +%Y%m%d-%H%M%S)"
backup="${APP_DIR}/deploy/backups/bp210-${stamp}"
install -d -o "${APP_USER}" -g "${APP_USER}" "${backup}"

cd "${APP_DIR}"
tar -czf "${backup}/backend-source.tar.gz" \
  --exclude='backend/node_modules' \
  --exclude='backend/data' \
  --exclude='backend/backups' \
  --exclude='backend/.env' \
  backend
cp -a dist "${backup}/dist"
cp -a deploy/start-kiosk.sh "${backup}/start-kiosk.sh"
cp -a /etc/systemd/system/icart-backend.service "${backup}/icart-backend.service"
sudo -u "${APP_USER}" npm --prefix backend run backup

systemctl stop icart-backend.service
cp -a "${staging}/backend/." "${APP_DIR}/backend/"
cp -a "${staging}/dist/." "${APP_DIR}/dist/"
install -m 0755 -o "${APP_USER}" -g "${APP_USER}" \
  "${staging}/hardware/bp210_printer.py" "${APP_DIR}/hardware/bp210_printer.py"
install -m 0755 -o "${APP_USER}" -g "${APP_USER}" \
  "${staging}/deploy/start-kiosk.sh" "${APP_DIR}/deploy/start-kiosk.sh"
install -m 0644 "${staging}/deploy/systemd/icart-backend.service" \
  /etc/systemd/system/icart-backend.service

cp -a "${staging}/dist/." /var/www/icart/
chown -R www-data:www-data /var/www/icart

systemctl daemon-reload
systemctl restart icart-backend.service

for attempt in {1..30}; do
  if curl --fail --silent --max-time 3 http://127.0.0.1:5000/api/health >/dev/null; then
    echo "BP210 automatic receipt printing deployment is healthy."
    echo "Backup: ${backup}"
    systemctl --no-pager --full status icart-backend.service | sed -n '1,14p'
    exit 0
  fi
  sleep 1
done

echo "The backend did not become healthy after the BP210 deployment." >&2
systemctl --no-pager --full status icart-backend.service || true
journalctl -u icart-backend.service -n 80 --no-pager || true
exit 1
