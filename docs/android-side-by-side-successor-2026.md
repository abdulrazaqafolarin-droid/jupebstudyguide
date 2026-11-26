# Rutex Master Next — side-by-side Android successor

## Purpose and safety boundary

The currently installed app uses package ID com.jupeb.master and certificate SHA-256:

~~~
6bc12665dc9fbaa318b62e22394a19619a7a9a19cfa6847e9b3bf4e2112798c3
~~~

The original private key for that certificate has not been recovered. The November 9 release keystore files found on the owner's computer are a different, exposed signing identity and must not be used to update the installed app.

The successor uses a separate permanent Android package ID:

- Existing app: com.jupeb.master
- New app: com.rutex.jupebmaster
- New launcher label: Rutex Master Next

Android can install the two packages side by side. The old app must remain installed until the new app is tested and its data has been restored and checked. A different package ID does not automatically copy private app data.

The successor continues to use the same Supabase project and user accounts. Cloud-backed records remain associated with the same signed-in user; device-local browser storage must be exported/imported or restored from an existing backup.

## Source and release isolation

The successor artifact build runs from this branch's pull request into main (and also supports manual dispatch once the workflow is available from the default branch). After the dedicated signing and Firebase secrets are added, synchronize this PR or rerun its failed build job. It:

- uses the dedicated successor package and OAuth scheme;
- requires the four new signing secrets and the new Firebase Android client JSON;
- signs with the permanent successor key only (no debug-signing fallback);
- uses version codes starting above 200000;
- verifies package ID, minSdk 24, version, certificate fingerprint, and APK signature;
- uploads a GitHub artifact only.

It does not publish to the old app-releases/jupeb-master.apk path, modify Supabase student records, or deploy the production website. The new updater points to the separate app-releases/rutex-master-next/ path.

## Recover the old app's local data before migrating

The currently installed version may predate the in-app Study Data Backup screen. Do not assume it can create a cloud backup.

1. Keep the old app installed and do not clear its storage.
2. Sign in to the same account that holds the old study data.
3. Check whether Profile → Settings → Study Data Backup exists in the old app. If it does, use Back up to Cloud and also Export Backup File. Keep the exported JSON somewhere private.
4. If the screen is absent, test whether the installed APK is debuggable while the phone is connected by USB with USB debugging enabled:

   ~~~bash
   adb devices
   adb shell run-as com.jupeb.master id
   ~~~

   A successful run-as confirms Android permits shell access to that app's private files. A “package not debuggable” error means this route is unavailable. Do not try to bypass Android's app sandbox or root the phone as part of this migration.
5. If run-as works, use Chrome remote inspection of the app's WebView to export only the account's allowlisted learning localStorage values into the supported JUPEB backup JSON format. Do not export Supabase auth tokens, passwords, or credentials. This step must be validated against the actual old app storage before relying on it.
6. If the old app is not debuggable and no earlier backup exists, treat device-only local data as not yet recovered. Keep the old app installed while checking account cloud-synced records and other approved recovery sources.

## Restore into the successor

1. Install the successor APK alongside the old app; do not uninstall the old package.
2. Open the successor and sign in using the exact same Supabase account.
3. Check the cloud-backed profile and other remote records.
4. In Profile → Settings → Study Data Backup, restore the latest cloud backup or import the exported JSON file. Restore merges validated learning data and does not overwrite unknown conflicting values.
5. Compare study progress, sessions, bookmarks, streak and achievements against the old app. Do not declare migration complete until the owner checks the important screens on the actual phone.

The app also creates a private cloud snapshot about once per day while a user is signed in and the app is online. Manual cloud backup and downloaded JSON export remain available. The cloud backup helper keeps the newest three snapshots per user. Automatic backups only cover the data supported by the current backup format; they are not a full phone backup and do not include credentials.

## Permanent successor signing identity

Generate the key once on a trusted computer, outside the repository. Do not reuse any rutex-master-release*.jks file.

Example PowerShell:

~~~powershell
$dir = "$env:USERPROFILE\Documents\RutexMasterNextSigning"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Location $dir
keytool -genkeypair -v -keystore ".\rutex-master-next-release.jks" -storetype JKS -alias "rutex-master-next-release" -keyalg RSA -keysize 4096 -sigalg SHA256withRSA -validity 10000
~~~

Enter a strong unique password when prompted and save it in a password manager. Do not put passwords in the command, chat, repository, or workflow logs.

Print the public fingerprint:

~~~powershell
keytool -list -v -keystore ".\rutex-master-next-release.jks" -alias "rutex-master-next-release"
~~~

The SHA-256 fingerprint is public. The private JKS file and both passwords are secrets.

Make at least two encrypted offline copies of the JKS in separate trusted locations (for example, an encrypted USB drive and a separate encrypted backup). Confirm both copies can be opened and have the same SHA-256 fingerprint. Keep one password-manager entry for the store password and key password. Do not rely on GitHub Actions as the only backup.

## Firebase and OAuth configuration required before the first build

1. In Firebase project rutexjupebmaster, add a new Android app with package ID com.rutex.jupebmaster.
2. Register the SHA-1 fingerprint of the new permanent key. Keep the old Android app registration untouched.
3. Download google-services.json for the new Android app. It must contain a client whose package name is com.rutex.jupebmaster.
4. In Supabase Authentication URL Configuration, add this exact redirect URL:

   ~~~
   com.rutex.jupebmaster://auth
   ~~~

5. Verify Google sign-in remains enabled for the existing Supabase provider and that the new Firebase Android client is configured. Do not remove the old package's Firebase/OAuth registration.

## GitHub Actions secrets for the successor

In repository Settings → Secrets and variables → Actions, create these new secrets. Keep the old ANDROID_KEYSTORE_* values separate; the successor workflow does not read them.

| Secret | Value |
|---|---|
| ANDROID_NEXT_KEYSTORE_BASE64 | Base64 text of the new JKS file |
| ANDROID_NEXT_KEYSTORE_PASSWORD | New JKS store password |
| ANDROID_NEXT_KEY_ALIAS | rutex-master-next-release |
| ANDROID_NEXT_KEY_PASSWORD | New private-key password |
| ANDROID_NEXT_GOOGLE_SERVICES_JSON_BASE64 | Base64 text of the new package's google-services.json |
| SUPABASE_SERVICE_ROLE_KEY | Server-side service_role key for the JUPEB Supabase project; used only by the explicit manual publish step |

Keep SUPABASE_SERVICE_ROLE_KEY only in GitHub Actions secrets. Never place it in Vite environment variables, client code, the APK, logs, or chat. Normal pull-request builds do not read this secret.

PowerShell can copy the Base64 value without printing the keystore contents:

~~~powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path ".\rutex-master-next-release.jks"))) | Set-Clipboard
~~~

For the Firebase file, run the same command with its full path. Base64 is encoding, not encryption; paste it directly into the matching GitHub secret and never post it publicly.

## Controlled updater publishing

The workflow always builds and verifies an artifact. Pull-request events remain artifact-only. After the workflow exists on the repository's default branch, a release operator can manually run **Build Rutex Master Next (artifact only)** with the `publish_release` input left false for another artifact-only build, or explicitly set it true to publish.

A publish run requires the `SUPABASE_SERVICE_ROLE_KEY` Actions secret. It uploads a version-specific APK object under the public `app-releases/rutex-master-next/` folder and then replaces only that folder's `version.json` manifest. It does not touch `app-releases/jupeb-master.apk`, the old app's `version.json`, student data, Auth settings, or the website. The workflow verifies the publicly served manifest and downloads the APK back to compare its SHA-256 before reporting success. The bucket already exists and is public; do not create a second bucket for this path.

### One-time updater bootstrap for an already installed preview build

A Rutex Master Next APK installed before this updater correction may contain the earlier native downloader URL allowlist. That build cannot complete the first corrected in-app download. When moving from that pre-fix build to the corrected updater, install the newly built APK manually over the existing `com.rutex.jupebmaster` app using the same permanent successor signing key. This is an in-place Android update, not an uninstall/reinstall; make a backup first and keep the old `com.jupeb.master` app installed. Once the corrected updater build is installed, subsequent releases can be offered and downloaded through the in-app updater.

Each successor APK has an immutable name containing its Android version code. This avoids overwriting a cached APK object; only the small current manifest is replaced. Keep APK history in Storage for rollback/audit; do not delete old versioned objects casually.

## Release gates

- Never run the old one-time legacy-signed workflow to update the installed com.jupeb.master package; its certificate does not match the installed app.
- Never replace or delete the old installed app to make the successor install.
- Never regenerate the successor JKS after first release. If it is lost, future in-place successor updates will be blocked.
- Keep two tested encrypted offline key backups, the GitHub Actions secret, and a written public SHA-256 fingerprint record.
- Keep the first successor build artifact-only. Test installation beside the old app, sign-in, cloud restoration, file import, backup creation and a subsequent signed update before publishing the successor updater metadata.
- Do not promote any build until the exact APK has passed the physical-device tests. Do not claim data was preserved before the checks succeed.
