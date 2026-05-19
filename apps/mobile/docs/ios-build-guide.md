# iOS Production Build — SVIT

Guide for preparing credentials and running an EAS production build for the App Store.

---

## 1. App Store Connect API Key

This key allows EAS to authenticate with Apple without interactive login (required for CI).

### Steps to generate the key

1. Open [App Store Connect](https://appstoreconnect.apple.com) and sign in.
2. Go to **Users and Access** (top navigation menu).
3. Select the **Integrations** tab (previously labelled "Keys").
4. Under **App Store Connect API**, click the **+** button to generate a new key.
5. Give the key a name (e.g. `EAS Build SVIT`).
6. Set the **Access** role to **App Manager** (minimum required for submitting builds).
7. Click **Generate**.
8. Download the `.p8` file immediately — Apple shows it only once.

### What to send

| Item | Where to find it | Example format |
|---|---|---|
| **Key ID** | Shown next to the key in the table | `ABC1234DEF` |
| **Issuer ID** | Shown at the top of the Integrations page | `a1b2c3d4-e5f6-...` |
| **.p8 file contents** | Downloaded file — open in any text editor | `-----BEGIN PRIVATE KEY-----\n...` |

Send all three values as EAS secrets (see Section 3).

---

## 2. Apple Team ID

1. Open [Apple Developer Portal](https://developer.apple.com/account).
2. Sign in and go to **Account** in the top navigation.
3. Select **Membership Details** from the left sidebar.
4. Copy the **Team ID** value (10-character alphanumeric string, e.g. `X9Y8Z7W6V5`).

---

## 3. Setting credentials as EAS secrets

Run these commands once from `apps/mobile/`. Replace placeholder values with real ones.

```bash
# App Store Connect API Key
eas secret:create --scope project --name EXPO_APPLE_KEY_ID       --value "YOUR_KEY_ID"
eas secret:create --scope project --name EXPO_APPLE_ISSUER_ID    --value "YOUR_ISSUER_ID"
eas secret:create --scope project --name EXPO_APPLE_KEY_P8       --value "$(cat /path/to/AuthKey_KEYID.p8)"

# Apple Team ID
eas secret:create --scope project --name EXPO_APPLE_TEAM_ID      --value "YOUR_TEAM_ID"
```

After setting secrets, update `eas.json` submit block — replace the placeholder values:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@apple.id",
      "ascAppId": "1234567890",
      "appleTeamId": "X9Y8Z7W6V5"
    }
  }
}
```

---

## 4. Running the build

From the `apps/mobile/` directory:

```bash
# One-off non-interactive build (CI-friendly)
eas build --platform ios --profile production-ios --non-interactive

# Optional: submit to App Store after build completes
eas submit --platform ios --latest --non-interactive
```

EAS will:
1. Pull credentials from the secrets you set.
2. Create/fetch a Distribution Certificate and Provisioning Profile automatically.
3. Build the `.ipa` archive on Expo's managed infrastructure.
4. Return a download link and optionally submit to TestFlight.

---

## 5. GitHub Actions integration (optional)

Add to `.github/workflows/ios-build.yml`:

```yaml
- name: Build iOS
  run: eas build --platform ios --profile production-ios --non-interactive
  env:
    EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

Store `EXPO_TOKEN` in GitHub → Repository Settings → Secrets and Variables → Actions.
Generate the token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).

---

## 6. Checklist before first build

- [ ] App Store Connect App record created (bundle ID `com.getsvit.app` registered)
- [ ] Key ID, Issuer ID, .p8 file sent and stored as EAS secrets
- [ ] Apple Team ID confirmed in `eas.json` submit block
- [ ] `eas.json` `appleId` and `ascAppId` placeholders replaced with real values
- [ ] Expo project linked (`eas init` run at least once)
