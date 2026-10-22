#!/bin/bash
set -u

KIOSK_URL="http://127.0.0.1/"
HEALTH_URL="http://127.0.0.1/api/health"

until /usr/bin/curl --fail --silent --show-error --max-time 2 "$HEALTH_URL" >/dev/null; do
  sleep 2
done

exec /usr/bin/chromium \
  --app="$KIOSK_URL" \
  --start-maximized \
  --ozone-platform=wayland \
  --enable-wayland-ime \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --no-default-browser-check \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-features=Translate
