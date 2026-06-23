#!/usr/bin/env bash
# Installs the chrome_zellij native messaging host for Chrome & Brave on macOS/Linux.
# Usage: ./install.sh <your-extension-id>
#   (find the extension id at chrome://extensions or brave://extensions after loading unpacked)
set -euo pipefail

EXT_ID="${1:-}"
if [ -z "$EXT_ID" ]; then
  echo "usage: ./install.sh <extension-id>"; exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
NAME="com.chrome_zellij.host"

echo "Building host binary..."
( cd "$DIR" && go build -o chrome_zellij_host . )
HOST_PATH="$DIR/chrome_zellij_host"

read -r -d '' MANIFEST <<EOF || true
{
  "name": "$NAME",
  "description": "chrome_zellij native host",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXT_ID/"]
}
EOF

case "$(uname -s)" in
  Darwin)
    CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    BRAVE_DIR="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    ;;
  Linux)
    CHROME_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    BRAVE_DIR="$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    ;;
  *)
    echo "Unsupported OS for this script — use install.ps1 on Windows."; exit 1
    ;;
esac

for d in "$CHROME_DIR" "$BRAVE_DIR"; do
  mkdir -p "$d"
  printf '%s\n' "$MANIFEST" > "$d/$NAME.json"
  echo "installed manifest -> $d/$NAME.json"
done

echo "Done. Host binary: $HOST_PATH"
echo "NOTE: the extension must declare the \"nativeMessaging\" permission and connectNative('$NAME') for this to be used (Phase 2 wiring)."
