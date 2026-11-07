# Rutex Master(Jupeb) — iOS release checklist

## What the iOS target shares

The iOS app uses the existing React/Vite application and Supabase backend through Capacitor 8. It retains the Android application ID/bundle ID `com.jupeb.master` and the same account, trial, question and progress services. Android APK update/install code remains Android-only.

The generated iOS project is committed by the macOS GitHub Actions workflow after it successfully generates and builds the Capacitor project. The workflow currently produces an **unsigned iOS Simulator build**, not a device-installable IPA.

## Required Supabase Auth setting

In Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, add:

`com.jupeb.master://auth`

Also allow the password-recovery callback:

`com.jupeb.master://auth?flow=recovery`

The first callback returns iOS email-confirmation links to the app. The second opens the in-app new-password form after a recovery link is verified. Web and Android redirect behavior remains unchanged.

## Enable remote iPhone notifications

Remote iPhone notifications require an Apple Push Notifications authentication key. Do not commit the `.p8` file or paste its private key into source control.

Create an APNs key in the Apple Developer account, then set these Supabase Edge Function secrets:

| Secret | Value |
|---|---|
| `APNS_KEY_ID` | Apple APNs key identifier (10 characters) |
| `APNS_TEAM_ID` | Apple Developer Team ID (10 characters) |
| `APNS_AUTH_KEY` | Full contents of the downloaded `.p8` private key |
| `APNS_BUNDLE_ID` | `com.jupeb.master` |
| `APNS_ENVIRONMENT` | `sandbox` for development-signed apps; `production` for TestFlight/App Store |

The Supabase Edge Function also needs its existing service-role configuration. APNs secrets are read only by the server-side `push-fcm` function. Android FCM and web-push paths continue to work independently when APNs is not configured.

## Physical-device/TestFlight distribution

A real iPhone install requires Apple code signing and a provisioning profile for the exact bundle ID `com.jupeb.master`. TestFlight/App Store distribution also requires an Apple Developer Program membership and App Store Connect setup. The simulator workflow intentionally does not sign or publish to the App Store.

Before signing a release, configure the signing certificate, provisioning profile and App Store Connect credentials as protected GitHub Actions secrets. Never store the private signing files or API keys in this repository.

## Release gates

- [ ] iOS simulator build passes on the hosted macOS/Xcode runner.
- [ ] Simulator install and launch smoke test passes.
- [ ] Supabase Auth redirect allow-list contains `com.jupeb.master://auth` and `com.jupeb.master://auth?flow=recovery`.
- [ ] Verify signup confirmation on a physical iPhone.
- [ ] Verify sign-in, sign-out, session restore and the one-day trial on a physical iPhone.
- [ ] Verify camera, photo library, question-image uploads, file uploads and voice-note recording.
- [ ] Verify local study reminders and notification permission opt-in.
- [ ] After APNs secrets are configured, verify a real remote chat notification while foregrounded, backgrounded and terminated; verify tapping it opens the correct conversation.
- [ ] Run Android regression tests and confirm APK updater still behaves only on Android.
- [ ] Complete signed device build, TestFlight distribution and App Store review separately.

A simulator compile does not prove APNs delivery, Apple code signing, App Store approval or all physical-device permission flows. Those require Apple credentials and a real iPhone.
