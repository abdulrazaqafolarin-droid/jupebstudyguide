# Android signing-key rotation and JUPEB Master fresh installation

## Current verified state

- Android application ID: `com.jupeb.master`.
- The historical installed APK (version 1.1.94 / versionCode 94) is a CI debug build. Its signing certificate SHA-256 is `6bc12665dc9fbaa318b62e22394a19619a7a9a19cfa6847e9b3bf4e2112798c3`; its ephemeral private debug keystore cannot be reconstructed from the APK.
- The new permanent release certificate SHA-256 is `341744a3408e4f6b4178c083953100785eb21c985c0a8fa4f62592e0a9c53181`. The private keystore is intentionally not stored in Git.
- The old manifest has `android:allowBackup="false"`; Android cloud/device backup is not a proven route for its WebView localStorage.
- PR #14 adds account-scoped local export/import and private Supabase cloud backup/restore for a future app build. Those controls are not in the old APK.
- PR #14 validation run #283 passed TypeScript, unit tests, lint (warnings only), web build, Capacitor sync, Android debug compilation, package identity/version, and read-only production health checks. This is not a signed release APK.
- The production updater metadata was previously found to have a missing/invalid SHA-256 and must be replaced only with metadata computed from and verified against the exact release APK.

## Data implications of a fresh install

The old APK bundles its web app locally. Its private WebView localStorage is not readable by the website or Supabase. Some learning state may exist only on the phone, including spaced-repetition progress, legacy syllabus/session state, streak state, and older bookmarks.

The owner has now chosen a fresh installation and explicitly indicated willingness to remove the existing app. Uninstalling the old package will permanently remove any such local-only state that has not already synced. Existing records already stored in Supabase remain separate and must not be deleted or reset. Do not describe cloud records as a complete copy of phone-local records.

This is a clean-install migration, not an in-place update: Android rejects an APK signed with a different certificate for an existing package. The new app must use the same application ID and the permanent release signing key for all future releases.

## Release signing requirements

The stable signing workflow requires these GitHub Actions repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never commit the keystore or expose any of these values in source code, logs, PR comments, issues, or chat. Keep secure offline copies of the private keystore and passwords. If the secrets are not configured, the release workflow must fail closed; do not fall back to an ephemeral debug signing key.

The workflow compares the new APK signer with the currently published APK. The signer mismatch is expected for this one-time migration. Publication of a different-signed APK requires both explicit workflow-dispatch acknowledgements: `allow_signing_key_migration` and `confirm_legacy_device_data_loss`. Do not remove those checks or publish a different-signed APK as an ordinary update.

## Fresh release checklist

1. Confirm the four signing secrets are configured in the repository without printing their values.
2. Build the release variant using the permanent key; verify its certificate fingerprint equals `341744a3408e4f6b4178c083953100785eb21c985c0a8fa4f62592e0a9c53181`.
3. Install-test the APK in a clean Android environment; verify application ID, launch, sign-in, question delivery from Supabase, admin access, trial/activation behavior, and backup/restore screens.
4. Confirm that the private cloud backup uses the existing private `documents` bucket and account-scoped storage paths; do not change production schema, policies, or learning records for this client release.
5. Produce a SHA-256 checksum from the exact APK bytes and publish matching `version.json` metadata only after APK validation. Verify the public APK and metadata read back successfully and the checksum matches.
6. Make the release available at the stable download page. Clearly mark it as a fresh install requiring removal of the older build; do not offer it as an in-place update.
7. After installation, sign into the same Supabase account and verify cloud-backed sessions, profile, score events, achievements, entitlements and remote question delivery. Use the new in-app backup controls for future protection.

## Production safety

- Do not drop, truncate, recreate, or bulk-rewrite `study_sessions`, `syllabus_progress`, profiles, score tables, activation records, or question content.
- Do not bundle past-question data in the APK; continue delivering it from Supabase as usual.
- A client release must not be described as fully verified until the exact signed APK is installed and smoke-tested.