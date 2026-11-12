#!/bin/bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

if ! command -v raspi-config >/dev/null 2>&1; then
  echo "raspi-config was not found. This must be run on Raspberry Pi OS." >&2
  exit 1
fi

# Enables the primary UART and disables the serial login shell, which would
# otherwise send console text to the DFPlayer Mini.
raspi-config nonint do_serial 0

echo "UART is configured for the DFPlayer Mini. Reboot the Raspberry Pi before testing /dev/serial0."
