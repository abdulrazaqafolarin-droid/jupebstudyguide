# Android signing-key rotation and student-data preservation

## Current state

- Android application ID: `com.jupeb.master`.
- Historical release signing keystore: unavailable.
- The archived production-build artifact from GitHub Actions run `42079370035` (artifact `13440460672`) was inspected. Its signer is `CN=Android Debug, O=Android, C=US`, with certificate SHA-256 `6bc12665dc9fbaa318b62e22394a19619a7a9a19cfa6847e9b3bf4e2112798c3`. The certificate was generated at build time on November 5, 2026; the ephemeral GitHub runner's private debug keystore was not included in the artifact and cannot be reconstructed from the APK.
- New permanent release keystore: generated outside the repository. Its public certificate SHA-256 is `341744a3408e4f6b4178c083953100785eb21c985c0a8fa4f62592e0a9c53181`. Its private key is provided separately to the repository owner; it must never be committed.
- The current manifest uses `android:allowBackup="false"`.
- The Android updater recognizes `requiresReinstall: true`, warns the student, and does not offer an installer action. The download page also hides the APK link for such a release.
- The release workflow compares the candidate APK certificate with the currently published APK. A mismatch remains artifact-only unless two separate workflow-dispatch acknowledgements are selected: `allow_signing_key_migration` and `confirm_legacy_device_data_loss`.

## Why this cannot be treated as an ordinary update

Android does not accept an APK signed by a different certificate as an update to an already installed package. The old app would have to be uninstalled before the new key's APK can be installed under the same application ID.

Uninstalling removes the old app's private local data. In this project, some learning state is still stored only in localStorage:

- Spaced-repetition review state (`u:<userId>:study-progress`).
- Legacy syllabus progress and local study sessions.
- Streak state.
- Legacy past-question bookmarks in the device-shared `jupeb_study_bookmarks` key.

The old APK has Android backup disabled, but its manifest is also marked `android:debuggable=true`. The archived public APK came from the same successful CI job that uploaded `app-debug.apk` to the production Supabase `app-releases/jupeb-master.apk` object (version 1.1.94, run 94). Its exact installer build is therefore a candidate for ADB/Chrome DevTools localStorage export while it remains installed.

A new helper, `scripts/android-localstorage-rescue.mjs`, now probes the installed package with `run-as`, connects to the local WebView DevTools socket through ADB, and exports only the current signed-in user's `u:<userId>:` namespace plus an explicit allowlist of legacy learning keys. It deliberately excludes auth-token, password, secret, credential and API-key-like storage keys and writes the same versioned JSON format accepted by the new Settings restore panel. It does not uninstall, clear, or modify the app.

To run it from the repository root, use Node.js 22+, install Android Platform Tools so `adb` is on PATH, enable USB debugging on the phone, approve the computer, unlock the phone and open JUPEB Master on the signed-in account. Then run:

```bash
node scripts/android-localstorage-rescue.mjs
```

The helper writes a timestamped `jupeb-device-backup-*.json` file in the current directory. Keep it private and make a second safe copy. When a newer build containing the Settings restore panel is available, sign into the same account, open Settings → Study Data Backup → Restore Backup, and explicitly select legacy-device-data restoration when you intend to import the old device-wide learning keys. The import reloads the app so the restored local data is rehydrated. The helper must still be tested against a real phone: WebView remote debugging availability depends on the device's installed WebView and must be confirmed by a successful live probe.

**Do not uninstall the old app yet.** First export the backup from the old installation, verify the file, import it in a newer JUPEB build with the Settings restore panel, and confirm progress, sessions, streaks and bookmarks are present. Only after that end-to-end transfer succeeds on the actual device should a signing migration be considered. Android's WebView API reference documents automatic WebView debugging for WebView 113+ when the application manifest is debuggable; the helper still verifies the actual device rather than assuming that behavior.

## Cloud data that already exists

The production `study_sessions` table was inspected without changing it on 2026-11-05. It contained 69 account rows; 35 accounts had non-empty session arrays, with 37 session records in total. The existing cloud table and RLS policies remain in place.

Other account data such as profiles, activation/entitlement state, score events, achievements and question content is stored in Supabase. The past-question bank remains server-delivered; do not bundle it in the APK or include it in a user backup.

## Required release gates

1. Keep the stable release keystore and its four GitHub Actions secrets outside Git history.
2. Complete and merge the safe session hydration/restore and local backup changes only after repository validation passes.
3. Decide and test how device-only data from already-installed legacy APKs will be recovered. The new backup UI alone does not satisfy this gate.
4. Verify the latest production web deployment and Supabase state without deleting or replacing existing rows.
5. Prepare clear student-facing instructions and an explicit support plan before any one-time reinstall release.
6. Only after those gates, manually dispatch the Android release workflow on `main`. The workflow requires both `allow_signing_key_migration` and `confirm_legacy_device_data_loss` to be checked before it can mirror a different-signed APK. Even after that, a separate reviewed code change is required to re-enable download UI; do not bypass the current updater/download-page safety block. Inspect the APK checksum and certificate and verify the published `version.json` read-back.
7. Confirm a later release using the same permanent keystore is accepted as an in-place update before advertising automatic updates again.

## Permanent signing-key setup

The separate signing kit contains the new private keystore and the values needed to create these GitHub repository Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never put these values in source files, workflow logs, pull-request descriptions, issues, or commits. Keep at least two secure offline copies of the keystore and its passwords. Do not regenerate the key for later releases.

## Rollback and safety

- Do not drop, truncate, or recreate `study_sessions`, `syllabus_progress`, profiles, or score tables to solve a client migration problem.
- If cloud restoration fails, the app must retain local state and keep cloud writes disabled until it can safely retry.
- Backup restore must validate the original signed-in user and merge known study data. Unknown preferences must not be overwritten automatically.
- No production Supabase schema or data change is authorized by this document.
