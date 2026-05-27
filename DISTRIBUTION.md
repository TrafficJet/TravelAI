# SVIT — Distribution Guide for Testers
**Updated: 2026-05-27**

---

## Android APK — Ready to Install Now

**Direct download link (no EAS account required):**
https://expo.dev/artifacts/eas/mnJpcC2wff1FPRjZz71nVk.apk

Build: `a4ff85b5` | Profile: preview | Built: 2026-05-19 | Expires: 2026-06-02

> Note: A newer Android build `40740b72` was IN_PROGRESS at the time of writing (2026-05-27).
> Once it finishes, its APK URL will be available at:
> https://expo.dev/accounts/forza22/projects/travel-ai/builds/40740b72-03d7-4045-a21d-e552937e2dcd

### Instructions for Android Tester

1. Open the APK link above on your Android device (or send the link via Telegram/WhatsApp).
2. Tap "Download" — if Chrome shows a warning, tap "Download anyway".
3. Open the downloaded file. If Android asks to allow installation from unknown sources, go to Settings > Install unknown apps > allow for your browser, then tap "Install".

That is all. The app will appear as "SVIT" on your home screen.

---

## iOS IPA — Ad Hoc Build (Restricted)

**IPA file (Ad Hoc distribution — requires registered UDID):**
https://expo.dev/artifacts/eas/n88wNX8KNQ1jchvseZ2fVX.ipa

Build: `ab0ec26f` | Profile: preview | Distribution: Ad Hoc | Built: 2026-05-25 | Expires: 2026-06-08

> A newer iOS build `ffa637be` was also completed today (2026-05-27):
> https://expo.dev/artifacts/eas/xyYZaGdrcPFJpoDtZRYN3U.ipa

### Current iOS Status

| Channel | Status | What is needed |
|---|---|---|
| Ad Hoc (direct IPA) | AVAILABLE — 1 device registered | Tester's iPhone UDID must be added to Apple Dev Portal |
| TestFlight | NOT AVAILABLE | App Store Connect app must be created first |

### To install the Ad Hoc IPA on an iOS device:

**Prerequisite:** The tester's device UDID must be registered in the Apple Developer Portal under Team `82WFY83V93`.

Steps to add a new device:
1. The tester sends their UDID (obtainable via https://get.udid.io or Apple Configurator).
2. Go to https://developer.apple.com/account/resources/devices/add and add the UDID.
3. Rebuild with `npx eas build --platform ios --profile preview` — this regenerates the Ad Hoc provisioning profile with the new device.
4. Send the new IPA to the tester via the EAS install page or direct link.

To install the IPA on an already-registered device:
- Use [Apple Configurator 2](https://apps.apple.com/app/apple-configurator-2/id1037126344) (Mac) to sideload the .ipa.
- Or use the EAS install page (requires EAS account): https://expo.dev/accounts/forza22/projects/travel-ai/builds/ab0ec26f-9c46-4f66-9faa-54e6cd430909

### To enable TestFlight (wider iOS testing):

1. Create the app in App Store Connect:
   - Go to https://appstoreconnect.apple.com
   - New App > iOS > Bundle ID: `com.getsvit.app` > Name: SVIT
   - Note the numeric App ID that Apple assigns (ascAppId).
2. Update `eas.json` submit > production > ios > ascAppId with the numeric ID.
3. Create an App Store Connect API Key:
   - https://appstoreconnect.apple.com/access/integrations/api
   - Role: App Manager or higher
   - Download the .p8 file, note the Key ID and Issuer ID.
4. Run: `npx eas submit --platform ios --profile production --non-interactive`
5. Once processing completes in App Store Connect (5–30 min), add testers in TestFlight.

---

## EAS Build Dashboard

All builds: https://expo.dev/accounts/forza22/projects/travel-ai/builds

---

## Build Summary

| Platform | Build ID | Status | Download |
|---|---|---|---|
| Android APK | `a4ff85b5` | FINISHED | https://expo.dev/artifacts/eas/mnJpcC2wff1FPRjZz71nVk.apk |
| Android APK (new) | `40740b72` | IN_PROGRESS (27 May) | pending |
| iOS IPA (Ad Hoc) | `ab0ec26f` | FINISHED | https://expo.dev/artifacts/eas/n88wNX8KNQ1jchvseZ2fVX.ipa |
| iOS IPA (new) | `ffa637be` | FINISHED | https://expo.dev/artifacts/eas/xyYZaGdrcPFJpoDtZRYN3U.ipa |
