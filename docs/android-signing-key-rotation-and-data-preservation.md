# Android signing-key rotation and student-data preservation

## Current state

- Android application ID: `com.jupeb.master`.
- Historical release signing keystore: unavailable.
- New permanent release keystore: generated outside the repository. Its private key is provided separately to the repository owner; it must never be committed.
- The current manifest uses `android:allowBackup="false"`.
- The Android updater already recognizes `requiresReinstall: true` and sends the student to the download page instead of attempting an in-place update.
- The release workflow compares the candidate APK certificate with the currently published APK. A certificate mismatch blocks publication unless the one-time workflow-dispatch migration option is explicitly selected.

## Why this cannot be treated as an ordinary update

Android does not accept an APK signed by a different certificate as an update to an already installed package. The old app would have to be uninstalled before the new key's APK can be installed under the same application ID.

Uninstalling removes the old app's private local data. In this project, some learning state is still stored only in localStorage:

- Spaced-repetition review state (`u:<userId>:study-progress`).
- Legacy syllabus progress and local study sessions.
- Streak state.
- Legacy past-question bookmarks in the device-shared `jupeb_study_bookmarks` key.

The old APK has backup disabled, and it cannot receive the new export UI as an in-place update because the signing key is lost. The new Settings backup panel protects future updates and fresh installs; it cannot execute inside an older installed APK.

**Do not tell students to uninstall the old app until a separate, verified recovery path is available or the data-loss risk has been explicitly accepted and communicated.**

## Cloud data that already exists

The production `study_sessions` table was inspected without changing it on 2026-11-05. It contained 69 account rows with 37 nested session entries. The existing cloud table and RLS policies remain in place.

Other account data such as profiles, activation/entitlement state, score events, achievements and question content is stored in Supabase. The past-question bank remains server-delivered; do not bundle it in the APK or include it in a user backup.

## Required release gates

1. Keep the stable release keystore and its four GitHub Actions secrets outside Git history.
2. Complete and merge the safe session hydration/restore and local backup changes only after repository validation passes.
3. Decide and test how device-only data from already-installed legacy APKs will be recovered. The new backup UI alone does not satisfy this gate.
4. Verify the latest production web deployment and Supabase state without deleting or replacing existing rows.
5. Prepare clear student-facing instructions and an explicit support plan before any one-time reinstall release.
6. Only after those gates, manually dispatch the Android release workflow on `main`, select the one-time signing-key migration input, inspect the APK checksum and certificate, and verify the published `version.json` read-back.
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
