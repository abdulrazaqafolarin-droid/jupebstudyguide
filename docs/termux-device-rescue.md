# Phone-only JUPEB data rescue (Termux)

This is an optional no-computer attempt for Android 11+ when the old JUPEB Master APK is still installed. It uses Termux's ADB client to connect to Android Wireless debugging on the same phone, then runs the existing read-only WebView export.

**Compatibility is not guaranteed.** Google's normal Wireless debugging flow is designed around a separate workstation. Some Termux/Android builds permit same-device localhost pairing; some vendor builds may reject it. If pairing or authorization fails, stop. Do not root the phone, clear app data, or uninstall JUPEB Master.

## Before starting

- Keep the existing JUPEB Master app installed and signed in to the account whose study data you want to save.
- Do not clear JUPEB Master storage or uninstall it.
- Install Termux from the official F-Droid listing or the official Termux GitHub release. Do not mix Termux and add-ons from different signing sources.
- Ensure Wi-Fi is enabled. Internet is needed to download the rescue helper and install Termux packages.

## Bootstrap command

Open Termux and paste this single command:

```bash
pkg update -y && pkg install -y android-tools nodejs-lts curl && termux-setup-storage && curl -fsSL "https://raw.githubusercontent.com/abdulrazaqafolarin-droid/jupebstudyguide/5940ba9f7c9cb766484594313d93b40e929168fd/scripts/termux-android-localstorage-rescue.sh" -o "$HOME/jupeb-termux-rescue.sh" && bash "$HOME/jupeb-termux-rescue.sh"
```
The script will ask for two different port numbers:

1. **Pairing port** from Android > Developer options > Wireless debugging > Pair device with pairing code. When ADB prompts, type the six-digit pairing code.
2. **Debugging port** shown separately on the main Wireless debugging screen under “IP address & Port”. It is not the pairing port.

The script then verifies the ADB connection, checks run-as com.jupeb.master, and exports only the signed-in account's allowlisted learning data. The resulting JSON is saved in the phone's Downloads folder. It does not upload credentials or Supabase auth tokens.

## If it fails

A failed pairing, ADB authorization, run-as check, WebView inspection, or backup validation is a stop condition. The old app remains installed and unchanged. Send the exact error text for diagnosis. Do not try commands that disable Android security protections or grant root.

## After a successful export

- Open the phone's Downloads folder and confirm that the jupeb-device-backup JSON file exists.
- Keep that file private. Shared Downloads may not support POSIX file permissions on Android, so do not share it with other people or upload it to a public link.
- Do not uninstall the old app until this backup has been imported and the restored learning data has been checked in the new app.
