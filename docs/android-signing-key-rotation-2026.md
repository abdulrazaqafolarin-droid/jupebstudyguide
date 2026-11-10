# Rutex Master Android signing-key rotation runbook

## Why this rotation is required

The November 9 release keystore was committed to the public repository and its password was exposed in a conversation. Treat that private key as compromised. The uploaded keystore was removed from the current `main` tree by moving `main` back to the commit immediately before the upload; the upload commit is no longer on the branch tip. That does not prove GitHub's object store, cached raw URLs, forks, or existing clones have been purged. Request GitHub Support to purge the exposed commit/blob, and temporarily make the repository private while the rotation is completed.

The Android package ID stays `com.jupeb.master`. Do not change it.

## Rotation layout

The first transition release is signed with a proof-of-rotation from the exposed November 9 certificate (A) to a new private certificate (B):

- Android 13 / API 33 and newer verify the new certificate B in the APK Signature Scheme v3.1 block. Existing installations signed by A can update in place, while the proof-of-rotation preserves their app data.
- Android 7–12 / API 24–32 see the original signer A in the transition APK. They can receive this one transition update, but they have not moved to B and must not continue receiving new-key-only updates as though the migration were complete.
- A second APK signed only with B is built for clean installs and the later migration of Android 7–12 users after their device-only data is backed up.
- Subsequent normal releases use B only. The in-app updater pauses updates on devices below API 33 and tells users to keep the app installed until a verified backup and fresh-install migration are ready.

This keeps Android 7+ as the supported install range. Existing Android 7–12 installations have a one-time reinstall migration; Android 13+ installations can move in place. Android's platform verifies the signing lineage during installation. The app's native updater also checks that the installed certificate appears in the candidate's verified signing history.

The old certificate's rollback capability is explicitly disabled in the lineage. The installed-data capability stays enabled for the in-place transition.

## Generate the new key locally (Windows)

Use a trusted computer with Android Studio / JDK installed. Run PowerShell in a private directory, not inside the repository:

```powershell
keytool -genkeypair -v -keystore .\rutex-master-rotated-2026.jks -storetype JKS -alias rutex-master-rotated -keyalg RSA -keysize 4096 -sigalg SHA256withRSA -validity 10000
```

Choose a strong new password and store it in a password manager. The key password may be the same as the keystore password. Do not paste either password into chat, a source file, a terminal transcript, a GitHub issue, or a workflow log.

Print the public certificate fingerprints:

```powershell
keytool -list -v -keystore .\rutex-master-rotated-2026.jks -alias rutex-master-rotated
```

Keep the new SHA-1 and SHA-256 fingerprints. Only fingerprints are public; the keystore and passwords are not.

Make at least two encrypted backups of the new `.jks` file in separate trusted locations. Never commit it to Git.

## Add the new GitHub Actions secrets

Open repository **Settings → Secrets and variables → Actions** and add:

| Secret name | Value |
|---|---|
| `ANDROID_ROTATED_KEYSTORE_BASE64` | Base64 of the new JKS file |
| `ANDROID_ROTATED_KEYSTORE_PASSWORD` | New keystore password |
| `ANDROID_ROTATED_KEY_ALIAS` | `rutex-master-rotated` |
| `ANDROID_ROTATED_KEY_PASSWORD` | New key password |

PowerShell can place the Base64 value on the clipboard without printing it:

```powershell
$bytes = [IO.File]::ReadAllBytes((Resolve-Path .\rutex-master-rotated-2026.jks))
[Convert]::ToBase64String($bytes) | Set-Clipboard
```

Paste that value directly into the GitHub secret value box. Base64 is an encoding, not encryption; never post it publicly.

Keep the existing `ANDROID_KEYSTORE_*` secrets temporarily. They contain the legacy A key and are required only to generate the one-time proof-of-rotation. Do not replace those old secret values with the new key.

The workflow also requires the existing `SUPABASE_SERVICE_ROLE_KEY` secret when publication is explicitly enabled.

## Google sign-in certificate registration

Add the new SHA-1 fingerprint to the Android OAuth/Firebase configuration for package `com.jupeb.master`. Keep the old fingerprint registered until the transition has been completed. Do not replace or delete the old OAuth client before the new APK has been tested.

After registration, check that the Android Google sign-in configuration still contains the expected client IDs. If Firebase requires a refreshed `google-services.json`, download it from the Firebase project settings and update the Android client config in a separate reviewed change; never upload a private OAuth client-secret JSON file.

## Build, test, and promote the first rotation

1. Temporarily make the public repository private while the key exposure is being handled. Request GitHub Support to purge the exposed commit/blob from cached views; removing the file from the current branch does not erase copies, forks, caches, or old clones.
2. Generate the new keystore locally and add the four new `ANDROID_ROTATED_*` repository Actions secrets. Keep the existing `ANDROID_KEYSTORE_*` secrets only for this one-time transition.
3. Merge the reviewed signing-rotation code and updater-lineage support into `main` only after the new secrets exist. The normal Android build will intentionally fail closed if the new secrets are absent.
4. In **Actions → Android signing-key rotation → Run workflow**, choose `main`. This workflow only builds and verifies; it does not publish. Confirm it reports the expected legacy SHA-1 and a different new SHA-1, verifies the Android 13+ signer as B, verifies Android 7–12 compatibility as A, confirms rollback capability is disabled, and uploads two APKs plus `release-manifest.json`.
5. Download `jupeb-master-rotated-update.apk` from that successful run's artifact. Install it over the existing app on your Android 14 phone—do not uninstall. Confirm Android accepts it, the version changes, and the app's sign-in, study progress, and locally stored state are still present. Test Google sign-in after adding the new SHA-1 fingerprint printed in the build log to Firebase / Google Cloud. Keep the old SHA-1 registered during transition.
6. Record the numeric **Run ID** of the exact successful workflow run you tested.
7. After the phone test succeeds, open **Actions → Publish tested Android signing rotation → Run workflow**, choose `main`, and enter that Run ID. This workflow downloads the exact tested artifacts (it does not rebuild or re-sign them), verifies the manifest, checksums, package ID, both SDK signer paths, and disabled rollback capability, then publishes both APKs plus matching updater metadata to Supabase.
8. Check the public `version.json` and updater APK URL. Only then is the in-app update ready for other Android 13+ devices.

The normal `Build Android APK` workflow is switched to use certificate B only for later releases. It publishes `requiresReinstallBelowApi: 33`, so Android 7–12 users are warned and their automatic updates are paused until their backed-up migration route is ready. The workflow also refreshes the separate B-only fresh-install APK on every future release.

## After the first verified transition

Once the Android 14 update has succeeded and the rotated release is published:

- Remove the legacy `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` Actions secrets. The old exposed private key must not remain available for routine builds.
- Keep the new `ANDROID_ROTATED_*` secrets and encrypted offline backups.
- Keep the old SHA-1 OAuth registration until the older-device migration is complete, then remove it if no longer used.
- Keep the public new certificate fingerprints documented; never document the new private key or its passwords.

## Safety rules

- Do not uninstall the Android 14 phone's current app before the rotated update has passed.
- Do not publish a debug-signed APK or fall back to a temporary CI signing key.
- Do not change production student records, Supabase tables, or the live web deployment as part of signing rotation.
- Do not claim app data is preserved until an actual update has been installed and checked on a device.
