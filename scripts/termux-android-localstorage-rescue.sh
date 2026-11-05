#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

RAW_RESCUE_URL="https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/fix/student-data-preservation-sync/scripts/android-localstorage-rescue.mjs"
RESCUE_DIR="$HOME/jupeb-device-rescue"
ADB_SERIAL=""

cleanup() {
  if [[ -n "$ADB_SERIAL" ]] && command -v adb >/dev/null 2>&1; then
    adb disconnect "$ADB_SERIAL" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

fail() {
  printf '\nSTOPPED SAFELY: %s\n' "$1" >&2
  printf 'JUPEB Master was not uninstalled, cleared or modified. Keep the old app installed.\n' >&2
  exit 1
}

printf '%s\n' "JUPEB Master — phone-only data rescue"
printf '%s\n' "This uses Android Wireless debugging from Termux. It may not work on every TECNO firmware."
printf '%s\n' "It only exports data. It does not uninstall, clear, root, or change the app."
printf '\n'

[[ -n "$PREFIX" && "$PREFIX" == *com.termux* ]] || fail "Open this script inside the official Termux app."

command -v adb >/dev/null 2>&1 || fail "ADB is missing. First run: pkg install android-tools"
command -v node >/dev/null 2>&1 || fail "Node.js is missing. First run: pkg install nodejs-lts"
command -v curl >/dev/null 2>&1 || fail "curl is missing. First run: pkg install curl"

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[[ "$NODE_MAJOR" -ge 22 ]] || fail "Node.js 22 or newer is required. Update with: pkg upgrade nodejs-lts"

if [[ ! -d "$HOME/storage/downloads" ]]; then
  echo "Termux needs permission to save the backup in your phone's Downloads folder."
  termux-setup-storage || fail "Could not request shared-storage permission."
fi
[[ -d "$HOME/storage/downloads" ]] || fail "Downloads access was not granted. Do not continue without a place to keep the backup outside the app."

mkdir -p "$RESCUE_DIR"
touch "$HOME/storage/downloads/.jupeb-rescue-write-test" 2>/dev/null || fail "Termux cannot write to Downloads. Grant its file access permission and retry."
rm -f "$HOME/storage/downloads/.jupeb-rescue-write-test"

echo "1/4 — Pair Termux with this phone."
echo "Open Android Settings > Developer options > Wireless debugging."
echo "Tap 'Pair device with pairing code'. Use split-screen if possible."
read -r -p "Enter the PAIRING PORT shown by Android (not the debugging port): " PAIR_PORT
[[ "$PAIR_PORT" =~ ^[0-9]{2,5}$ ]] || fail "The pairing port must be a number."
(( PAIR_PORT >= 1 && PAIR_PORT <= 65535 )) || fail "The pairing port is outside the valid range."

echo
echo "Pairing to this same phone at 127.0.0.1:$PAIR_PORT."
echo "When ADB asks for the six-digit code, type the code shown by Android."
adb start-server >/dev/null
adb pair "127.0.0.1:$PAIR_PORT" || fail "Wireless debugging self-pairing failed on this phone. Stop here; use a separate PC or another Android device instead."

echo
echo "2/4 — Connect to the debugging service."
echo "Return to the main Wireless debugging screen (not the pairing-code popup)."
echo "Read the separate 'IP address & Port' value shown on that screen."
read -r -p "Enter the DEBUGGING PORT from that main screen: " CONNECT_PORT
[[ "$CONNECT_PORT" =~ ^[0-9]{2,5}$ ]] || fail "The debugging port must be a number."
(( CONNECT_PORT >= 1 && CONNECT_PORT <= 65535 )) || fail "The debugging port is outside the valid range."

ADB_SERIAL="127.0.0.1:$CONNECT_PORT"
adb connect "$ADB_SERIAL" || fail "Could not connect to the phone's Wireless debugging endpoint."
adb devices | grep -F "$ADB_SERIAL" | grep -qE '[[:space:]]device$' || fail "ADB did not authorize this local connection. Do not try root or data-clearing workarounds."

echo
echo "3/4 — Verify the old JUPEB app is still readable."
adb -s "$ADB_SERIAL" shell run-as com.jupeb.master id || fail "Android refused access to the installed JUPEB app. This build may not be debuggable; keep it installed."
adb -s "$ADB_SERIAL" shell pidof com.jupeb.master >/dev/null || fail "JUPEB Master is not running. Open it, sign in to the correct account, keep it open, and run this helper again."

echo
echo "4/4 — Download and run the read-only export helper."
RESCUE_SCRIPT="$RESCUE_DIR/android-localstorage-rescue.mjs"
curl --fail --location --silent --show-error --retry 2 "$RAW_RESCUE_URL" -o "$RESCUE_SCRIPT" || fail "Could not download the rescue helper from the JUPEB GitHub repository."
node --check "$RESCUE_SCRIPT" || fail "The downloaded helper did not pass Node.js syntax validation."

OUTPUT_FILE="$HOME/storage/downloads/jupeb-device-backup-$(date -u +%Y%m%dT%H%M%SZ).json"
node "$RESCUE_SCRIPT" --output "$OUTPUT_FILE" || fail "The local export did not complete. Read the error above; the old app remains untouched."
[[ -s "$OUTPUT_FILE" ]] || fail "The export command returned but no backup file was created."

echo
echo "SUCCESS — backup file saved in your phone's Downloads folder:"
echo "$OUTPUT_FILE"
echo
echo "Keep this JSON file private. Do not uninstall JUPEB Master until the file has been restored and verified in the new app."
echo "After this, turn Wireless debugging off in Android settings. You may also remove the Termux pairing from Paired devices."
