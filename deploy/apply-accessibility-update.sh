#!/bin/bash
set -euo pipefail

APP_USER="icart"
APP_DIR="/home/icart/icart"
ARCHIVE="${APP_DIR}/deploy/icart-accessibility-update.tar.gz"
DOWNLOAD_DIR="/tmp/icart-natural-voice"
PIPER_ARCHIVE="${DOWNLOAD_DIR}/piper_armv7.tar.gz"
PIPER_VERSION_DIR="/opt/icart-piper-1.2.0"
VOICE_MODEL="en_US-lessac-medium.onnx"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this updater with sudo." >&2
  exit 1
fi

for required in \
  "${ARCHIVE}" \
  "${PIPER_ARCHIVE}" \
  "${DOWNLOAD_DIR}/${VOICE_MODEL}" \
  "${DOWNLOAD_DIR}/${VOICE_MODEL}.json"; do
  if [[ ! -f "${required}" ]]; then
    echo "Required deployment file is missing: ${required}" >&2
    exit 1
  fi
done

staging="$(mktemp -d "${APP_DIR}/deploy/staging-accessibility-XXXXXX")"
cleanup() {
  case "${staging}" in
    "${APP_DIR}"/deploy/staging-accessibility-*)
      rm -rf -- "${staging}"
      ;;
  esac
}
trap cleanup EXIT

tar -xzf "${ARCHIVE}" -C "${staging}"

for required in \
  "${staging}/backend/routes/hardwareRoutes.js" \
  "${staging}/backend/services/voiceService.js" \
  "${staging}/deploy/start-kiosk.sh" \
  "${staging}/deploy/systemd/icart-backend.service" \
  "${staging}/dist/index.html"; do
  if [[ ! -f "${required}" ]]; then
    echo "Deployment archive is incomplete: ${required}" >&2
    exit 1
  fi
done

node --check "${staging}/backend/routes/hardwareRoutes.js"
node --check "${staging}/backend/services/voiceService.js"

stamp="$(date +%Y%m%d-%H%M%S)"
backup="${APP_DIR}/deploy/backups/accessibility-${stamp}"
install -d -o "${APP_USER}" -g "${APP_USER}" "${backup}/backend/routes" "${backup}/backend/services"
cp -a "${APP_DIR}/backend/routes/hardwareRoutes.js" "${backup}/backend/routes/"
if [[ -f "${APP_DIR}/backend/services/voiceService.js" ]]; then
  cp -a "${APP_DIR}/backend/services/voiceService.js" "${backup}/backend/services/"
fi
cp -a "${APP_DIR}/dist" "${backup}/dist"
cp -a "${APP_DIR}/deploy/start-kiosk.sh" "${backup}/start-kiosk.sh"
cp -a /etc/systemd/system/icart-backend.service "${backup}/icart-backend.service"
cp -a /var/www/icart "${backup}/var-www-icart"
chown -R "${APP_USER}:${APP_USER}" "${backup}"

install -d "${PIPER_VERSION_DIR}"
tar -xzf "${PIPER_ARCHIVE}" --strip-components=1 -C "${PIPER_VERSION_DIR}"
test -x "${PIPER_VERSION_DIR}/piper"
chown -R root:root "${PIPER_VERSION_DIR}"
ln -sfn "${PIPER_VERSION_DIR}" /opt/piper

install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}/voice"
install -m 0644 -o "${APP_USER}" -g "${APP_USER}" \
  "${DOWNLOAD_DIR}/${VOICE_MODEL}" "${APP_DIR}/voice/${VOICE_MODEL}"
install -m 0644 -o "${APP_USER}" -g "${APP_USER}" \
  "${DOWNLOAD_DIR}/${VOICE_MODEL}.json" "${APP_DIR}/voice/${VOICE_MODEL}.json"

install -m 0644 -o "${APP_USER}" -g "${APP_USER}" \
  "${staging}/backend/routes/hardwareRoutes.js" "${APP_DIR}/backend/routes/hardwareRoutes.js"
install -m 0644 -o "${APP_USER}" -g "${APP_USER}" \
  "${staging}/backend/services/voiceService.js" "${APP_DIR}/backend/services/voiceService.js"
install -m 0755 -o "${APP_USER}" -g "${APP_USER}" \
  "${staging}/deploy/start-kiosk.sh" "${APP_DIR}/deploy/start-kiosk.sh"
install -m 0644 "${staging}/deploy/systemd/icart-backend.service" \
  /etc/systemd/system/icart-backend.service

cp -a "${staging}/dist/." "${APP_DIR}/dist/"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/dist"
cp -a "${staging}/dist/." /var/www/icart/
chown -R www-data:www-data /var/www/icart

systemctl daemon-reload
systemctl restart icart-backend.service

healthy=false
for attempt in {1..30}; do
  if curl --fail --silent --max-time 3 http://127.0.0.1:5000/api/health >/dev/null; then
    healthy=true
    break
  fi
  sleep 1
done

if [[ "${healthy}" != true ]]; then
  echo "New backend failed its health check; restoring the application backup." >&2
  cp -a "${backup}/backend/routes/hardwareRoutes.js" "${APP_DIR}/backend/routes/hardwareRoutes.js"
  if [[ -f "${backup}/backend/services/voiceService.js" ]]; then
    cp -a "${backup}/backend/services/voiceService.js" "${APP_DIR}/backend/services/voiceService.js"
  else
    rm -f -- "${APP_DIR}/backend/services/voiceService.js"
  fi
  cp -a "${backup}/dist/." "${APP_DIR}/dist/"
  cp -a "${backup}/var-www-icart/." /var/www/icart/
  install -m 0755 -o "${APP_USER}" -g "${APP_USER}" \
    "${backup}/start-kiosk.sh" "${APP_DIR}/deploy/start-kiosk.sh"
  install -m 0644 "${backup}/icart-backend.service" /etc/systemd/system/icart-backend.service
  systemctl daemon-reload
  systemctl restart icart-backend.service
  exit 1
fi

voice_status="$(curl --fail --silent http://127.0.0.1:5000/api/hardware/voice/status)"
echo "Voice status: ${voice_status}"
if [[ "${voice_status}" != *'"provider":"piper"'* ]]; then
  echo "Piper was installed but the backend did not select it." >&2
  exit 1
fi

curl --fail --silent \
  -H 'Content-Type: application/json' \
  -d '{"message":"Natural voice assistance is now active. Welcome to iCart."}' \
  http://127.0.0.1:5000/api/hardware/voice/speak >/dev/null

# Tell the already-running kiosk browser to load the new frontend. A freshly
# loaded HardwareButtonBridge ignores this old event, so it cannot reload-loop.
curl --fail --silent \
  -H 'Content-Type: application/json' \
  -d '{"action":"restart"}' \
  http://127.0.0.1:5000/api/hardware/events >/dev/null

echo "Accessibility deployment is healthy."
echo "Backup: ${backup}"
systemctl --no-pager --full status icart-backend.service | sed -n '1,14p'
