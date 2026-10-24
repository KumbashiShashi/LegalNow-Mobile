# LegalNow Mobile — Build, Packaging & Deployment Guide

This document details the complete build, packaging, and deployment procedures for the **LegalNow Mobile Application** across Android and iOS platforms.

---

## 1. Prerequisites & Tooling

| Tool | Version Requirement | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | JavaScript Runtime |
| **Expo CLI** | `npx expo` (Bundled with SDK 58) | Dev Server, Linters & Tools |
| **EAS CLI** | `npx eas-cli@latest` | Cloud and Local Build Engine |
| **Android SDK & Tools** | API 34 / 35 (Platform Tools 35+) | ADB, Android Emulator |
| **Java JDK** | OpenJDK 17 or 21 | Android Gradle Compilation |
| **Xcode (macOS only)**| 15.0+ | iOS Simulator & Archive Compilation |

---

## 2. Configuration Files

### `app.json` Identifiers:
- **Application Name:** `LegalNow`
- **Slug:** `legalnow-mobile`
- **Custom Scheme (Deep Linking):** `legalnow://`
- **Android Package:** `com.legalnow.mobile`
- **iOS Bundle Identifier:** `com.legalnow.mobile`

### `eas.json` Build Profiles:
- **`development`:** Produces debug APK with developer tools enabled.
- **`preview`:** Produces a standalone, signed APK (`buildType: "apk"`) that can be installed directly on any Android device via USB or download link.
- **`production`:** Produces an Android App Bundle (`.aab`) ready for Google Play Console submission, and an `.ipa` for Apple App Store / TestFlight.

---

## 3. Building with EAS (Expo Application Services)

### Step 1: Log in to Expo
```bash
npx eas-cli@latest login
```

### Step 2: Configure Project (First time only)
```bash
npx eas-cli@latest project:init
```

### Step 3: Build Standalone APK for Android (Internal Testing / Direct Install)
To generate an installable `.apk` file without going through the Play Store:
```bash
npx eas-cli@latest build --platform android --profile preview
```
*Upon completion, EAS provides a direct download link and QR code to install the APK onto physical devices.*

### Step 4: Build Production Android App Bundle (.aab)
```bash
npx eas-cli@latest build --platform android --profile production
```

### Step 5: Build iOS Release (.ipa)
```bash
npx eas-cli@latest build --platform ios --profile production
```

---

## 4. Local Native Builds via Continuous Native Generation (CNG)

Because this repository uses Expo CNG, native `android/` and `ios/` folders are generated dynamically from configuration plugins. Never commit manual edits to those folders.

### Local Android Build & Execution:
```bash
npx expo run:android
```
*Requires Android Studio SDK and `ANDROID_HOME` configured in environment variables.*

### Local iOS Build & Execution (macOS):
```bash
npx expo run:ios
```

---

## 5. Local Development & Emulator Workflow

### 1. Reverse Ports for Emulator:
```bash
npm run adb:reverse
# Equivalent to: adb reverse tcp:8081 tcp:8081 && adb reverse tcp:5000 tcp:5000
```

### 2. Start Dev Server:
```bash
npx expo start
```
- Press **`a`** to open on connected Android device/emulator.
- Press **`i`** to open on iOS simulator.
- Press **`w`** to open on web browser.

---

## 6. Deep Linking Verification

The app responds to URLs prefixed with `legalnow://`:

| Custom URL | Target Screen |
| :--- | :--- |
| `legalnow://` | Role-specific Dashboard |
| `legalnow://case/:id` | Case Details & Bidirectional Case Chat |
| `legalnow://invoices/:id` | Itemized GST Tax Invoice Receipt |
| `legalnow://notifications` | Notifications Tray |
| `legalnow://(roles)/(citizen)/appointments` | Appointments & Meetings Manager |
| `legalnow://(roles)/(citizen)/subscription` | Access Plan & Benefits |
| `legalnow://(roles)/(citizen)/advocates` | Verified Advocate Directory |

### Testing Deep Links via ADB:
```bash
adb shell am start -a android.intent.action.VIEW -d "legalnow://case/550e8400-e29b-41d4-a716-446655440000"
```

---

## 7. Quality Gates & Pre-Flight Checks

Before releasing any new build, execute the full test and lint suite:

```bash
# 1. Typecheck (Must return 0 errors)
npx tsc --noEmit

# 2. Linting (Must return 0 errors, 0 warnings)
npx expo lint

# 3. Unit Tests (All suites must pass)
npm test

# 4. Expo Doctor (Diagnose dependency compatibility)
npx expo-doctor
```

