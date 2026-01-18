# iOS App Setup Guide - Multiloop

This guide covers setting up the iOS app build pipeline for Multiloop using Capacitor and GitHub Actions with automatic TestFlight deployment.

## Architecture

The iOS app is a **native wrapper** that loads the production web app from `https://multiloop.app`. This means:
- No need to rebuild the iOS app for web changes
- App updates happen instantly via Vercel deployment
- Only native iOS changes require a new TestFlight build

## Prerequisites

1. Apple Developer Account (with App Store Connect access)
2. GitHub repository with Actions enabled
3. Node.js 22+ installed locally (for initial setup)

## Initial Setup (One-Time)

### 1. Install Dependencies

```bash
npm install
```

This installs Capacitor CLI, core, and iOS platform packages.

### 2. Initialize Capacitor iOS Project

```bash
npx cap add ios
```

This creates the `ios/` folder with the Xcode project.

### 3. Generate App Icons

```bash
npm run generate-icon
```

This generates:
- iOS app icon (1024x1024) in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- PWA icons (72-512px) in `public/icons/`
- Apple touch icon (180x180) in `public/`

### 4. Configure Xcode Project (First Time Only)

Open the project in Xcode:
```bash
npm run cap:open
```

Then configure:
1. **Bundle Identifier**: `app.multiloop.ttrpg`
2. **Display Name**: Multiloop
3. **Deployment Target**: iOS 15.0+
4. **App Category**: Games / Entertainment
5. **Team**: Select your Apple Developer team

### 5. Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app with bundle ID `app.multiloop.ttrpg`
3. Set up TestFlight external testing group if desired

## GitHub Secrets Setup

Configure these secrets in your GitHub repository (Settings > Secrets > Actions):

| Secret | Description | How to Get |
|--------|-------------|------------|
| `APPLE_ID` | Your Apple ID email | Your Apple account email |
| `APPLE_TEAM_ID` | 10-character Team ID | Apple Developer Portal > Membership |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Distribution cert (.p12, base64) | See below |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Password for the .p12 file | Set when exporting |
| `IOS_PROVISIONING_PROFILE_BASE64` | App Store provisioning profile (base64) | See below |
| `KEYCHAIN_PASSWORD` | Any secure password | Generate a random password |
| `APP_STORE_CONNECT_API_KEY_ID` | API Key ID | App Store Connect > Users > Keys |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID | App Store Connect > Users > Keys |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | API Key content (base64) | See below |

### Getting the Distribution Certificate

1. Open Keychain Access on Mac
2. Go to Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority
3. In Apple Developer Portal > Certificates, create an "Apple Distribution" certificate
4. Download and double-click to install in Keychain
5. Export as .p12 from Keychain Access (right-click > Export)
6. Convert to base64:
   ```bash
   base64 -i Certificates.p12 | pbcopy
   ```

### Getting the Provisioning Profile

1. In Apple Developer Portal > Profiles
2. Create a new "App Store" distribution profile
3. Select your app ID (`app.multiloop.ttrpg`)
4. Select your distribution certificate
5. Download the `.mobileprovision` file
6. **Important**: Name it exactly "Multiloop App Store" in the profile settings
7. Convert to base64:
   ```bash
   base64 -i Multiloop_App_Store.mobileprovision | pbcopy
   ```

### Getting the App Store Connect API Key

1. Go to App Store Connect > Users and Access > Keys
2. Generate a new key with "App Manager" role
3. Download the `.p8` file (only available once!)
4. Note the Key ID and Issuer ID shown on the page
5. Convert to base64:
   ```bash
   base64 -i AuthKey_XXXXXX.p8 | pbcopy
   ```

## Triggering Builds

### Automatic Builds
The GitHub Action triggers on pushes to `main` branch that modify:
- `src/**` - Any source code
- `ios/**` - iOS native code
- `capacitor.config.ts` - Capacitor configuration
- `.github/workflows/ios-testflight.yml` - The workflow itself

### Manual Builds
1. Go to GitHub > Actions > "iOS TestFlight Build"
2. Click "Run workflow"
3. Select the branch and click "Run workflow"

## Build Process

The GitHub Action:
1. Checks out code
2. Installs Node dependencies
3. Generates app icons
4. Syncs Capacitor iOS
5. Sets up Ruby and Fastlane
6. Installs signing certificate and provisioning profile
7. Builds the app with Fastlane
8. Uploads to TestFlight

Build number is auto-incremented using `GITHUB_RUN_NUMBER`.

## Local Development

### Sync Changes to iOS
After modifying `capacitor.config.ts`:
```bash
npm run cap:sync
```

### Open in Xcode
```bash
npm run cap:open
```

### Test on Simulator
1. Open in Xcode
2. Select a simulator
3. Press Cmd+R to run

## Troubleshooting

### "Provisioning profile doesn't match"
Ensure the profile is named exactly "Multiloop App Store" and matches the bundle ID `app.multiloop.ttrpg`.

### "Code signing error"
1. Verify certificate is "Apple Distribution" (not Developer)
2. Check the team ID matches in all places
3. Ensure profile includes the correct certificate

### "App loads blank screen"
Check that `https://multiloop.app` is accessible and the `server.url` in `capacitor.config.ts` is correct.

### Build fails on GitHub Actions
1. Check the Actions logs for specific errors
2. Verify all secrets are correctly set (no extra whitespace)
3. Ensure certificates/profiles haven't expired

## Files Overview

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor configuration (app ID, server URL, iOS settings) |
| `scripts/generate-app-icon.js` | Generates iOS and PWA icons from SVG |
| `.github/workflows/ios-testflight.yml` | GitHub Actions workflow for TestFlight |
| `ios/` | Generated Xcode project (after `npx cap add ios`) |
| `public/manifest.json` | PWA manifest for home screen install |

## Version Management

- **Version Number**: Set in Xcode project (e.g., 1.0.0)
- **Build Number**: Auto-incremented by GitHub Actions run number
- Update version in Xcode when releasing new versions to the App Store

## Notes

- The app loads from Vercel, so web updates don't require new iOS builds
- TestFlight builds typically process in 10-30 minutes
- External testers need to be added to your TestFlight group
- App Store submission requires additional metadata and screenshots
