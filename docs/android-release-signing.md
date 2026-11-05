# Android release signing and one-time updater migration

The Android package ID is `com.jupeb.master`. Android only installs an APK over an existing installation when the signing certificate is compatible. Keep one private release keystore for the lifetime of this app.

## Create the permanent signing key

Run this locally on a trusted computer. Do not commit or upload the keystore to the repository, and do not paste its passwords or contents into chat.

```bash
keytool -genkeypair -v \
  -keystore jupeb-master-release.jks \
  -alias jupeb-master \
  -keyalg RSA -keysize 4096 -validity 10000 -storetype JKS
```

Choose strong passwords, save them in a password manager, and keep at least two encrypted backups of `jupeb-master-release.jks`. Losing this key can make future in-place updates impossible.

## Add GitHub Actions secrets

Open the repository's **Settings → Secrets and variables → Actions → New repository secret** and add:

- `ANDROID_KEYSTORE_BASE64`: base64 encoding of the entire `jupeb-master-release.jks` file.
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password.
- `ANDROID_KEY_ALIAS`: `jupeb-master` (or the alias you actually chose).
- `ANDROID_KEY_PASSWORD`: the key password.

For PowerShell, generate the base64 value without inserting line breaks:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\jupeb-master-release.jks"))
```

For macOS/Linux:

```bash
base64 < jupeb-master-release.jks | tr -d '\n'
```

Never print the passwords in CI logs. The workflow decodes the keystore only inside the temporary GitHub runner workspace; the repository ignores `*.jks` files.

## One-time migration from the legacy debug APK

The currently published version 93 was built by the old workflow as a debug-signed APK. Its signing key was generated on a GitHub runner and is not a permanent release key. A new persistent key therefore cannot be installed over that legacy build.

After the four secrets are saved:

1. Confirm that the new key and both passwords are backed up safely.
2. Notify existing students that this one-time update requires uninstalling the old JUPEB Master app and manually installing the new APK. Do not promise a seamless update for this migration.
3. In **Actions → Build Android APK → Run workflow**, select branch `main` and enable **Allow a one-time signing-key change**.
4. Confirm the release workflow verifies the new APK, SHA-256 metadata, public Supabase Storage upload, and GitHub release.
5. Students should verify that their account data is synced, uninstall the legacy app, install the new APK, and sign in again.

The manual migration option is deliberately separate from normal pushes. A push to `main` cannot publish a signer-mismatched APK. After the migration, future builds must use the same four secrets and are expected to update in place.

## Important

- Do not run the migration option until students have been notified and the permanent key is backed up.
- Do not delete or rotate the permanent keystore after publishing.
- This migration does not erase server-side student records, but any data stored only on the old device installation may be lost when that app is uninstalled.
- A successful CI build is not a substitute for testing the installer on a physical Android device.
