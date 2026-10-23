# LegalNow Mobile Application (Android & iOS)

A production-grade, cross-platform mobile client for the **LegalNow B2B2C Legal Services Marketplace**, built using **React Native**, **Expo SDK 58**, **TypeScript**, and **Expo Router**.

The mobile application interfaces directly with the existing **.NET 10 Web API** and **PostgreSQL Database** (`legalnow_db`). It implements functional parity with all client-facing workflows from the reference React Web Application (`D:\LegalOne`), redesigned with mobile-first UX patterns.

---

## 🏛 Ecosystem Architecture

```
                  LEGALNOW ECOSYSTEM
    
        EXISTING REACT WEB APPLICATION
           |                    |
           |                    +---- Admin Portal (Web Only)
           |
           +--------------------+
                                |
                     Existing .NET 10 API (:5000)
                                |
                     Existing Security & JWT Layer
                                |
                     Existing PostgreSQL DB
                                |
          +---------------------+---------------------+
          |                                           |
  React Native Mobile                         React Web Portal
          |
  Shared mobile codebase
          |
   +------+------+
   |             |
Android         iOS
```

---

## 📱 User Roles & Capabilities

### 1. Citizen & Business Customers (`/(roles)/(citizen)`)
* **Dashboard:** Real-time metrics of legal cases and matched service provider requests.
* **Advocate Directory:** Discover verified legal practitioners filtered by specialization (Criminal, Civil, Corporate, Family, etc.), location, and language.
* **Advocate Profile & Booking:** View advocate credentials, bar council enrollment, experience, and book consultations.
* **Meeting Venues:** Choose between the Advocate's Office, Citizen's Address, or a nearby verified **LegalNow Hub** (meeting point).
* **Service Marketplace:** Browse the government/business service catalogue (MSME, FSSAI, Shops & Establishment, Labour, GST), and match with verified service providers.
* **Submit Problem:** Plain-language legal matter registration with document attachments (PDF, JPG, PNG).
* **Appointments:** Full appointment lifecycle (request, reschedule, agree to location proposals, cancellation, follow-up).
* **Case Workspace & Chat:** Private, encrypted bidirectional messaging with assigned advocates and document history.
* **Subscription & Invoices:** Citizen access plan status, benefit tracking, and itemized GST tax invoices.

### 2. Advocates / Legal Professionals (`/(roles)/(advocate)`)
* **Workspace Console:** Live metrics for pending appointment requests, upcoming consultations, and completed matters.
* **Appointments & Requests:** Review incoming appointment requests, Accept, Reject with reason, Reschedule, or Propose meeting location.
* **Specialization Management:** Select and maintain 1 to 3 verified practice areas, spoken languages, and professional bio.
* **Case Resolution:** Mark assigned cases completed upon resolution.

### 3. LOne Hub Service Providers (`/(roles)/(lonehub)`)
* **Hub Console:** Live operational status, operating hours, and accrued/due payout earnings.
* **Meeting Check-in & Verification:** Verify two-party 6-digit meeting OTPs (citizen + advocate) upon arrival to confirm meeting participation and disburse convenience fees.
* **Hub Settings:** Shop address, geolocation coordinates, availability toggle, and bank/UPI payout details.

### 4. Independent Service Providers (`/(roles)/(provider)`)
* **Leads Feed:** Review matched client requests in real-time.
* **Lead Actions:** Accept leads, reject leads, dispute deductions, and communicate directly with customers.
* **Service Meetings:** Conduct and track scheduled client meetings.

### 5. Admin Portal Exclusions
* **100% Web Portal Exclusive:** Administrative dashboards, KYC Aadhar reviews, GST approvals, fee settings, hub payouts, and audit logs are strictly restricted to the Web Portal.
* Any admin credentials submitted on mobile are automatically blocked and logged out.

---

## 🛠 Tech Stack

* **Mobile Framework:** React Native 0.88.0 & Expo SDK 58
* **Language:** TypeScript 6.0 (Strict mode)
* **Navigation:** Expo Router 58 (File-based navigation with native stack & tabs)
* **State Management:** Zustand 5.0 (Authentication & local state)
* **Server-State Management:** TanStack Query v5 (Caching, automatic background refetching)
* **HTTP Client:** Axios with bearer token interceptor and path normalizer
* **Secure Storage:** Expo SecureStore (Hardware-backed encrypted storage for JWT tokens)
* **Form Validation:** React Hook Form & Zod
* **Testing:** Jest & ts-jest

---

## 🚀 Getting Started

### Prerequisites
* Node.js v20+ / v22+
* Expo CLI (`npx expo`)
* Android Studio (with Android SDK & Emulator) or Xcode (macOS for iOS)

### 1. Environment Configuration

Create a `.env` file in the root of `LegalNow-Mobile`:

```bash
# Physical Android / iOS devices on local Wi-Fi:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api

# Defaults:
# - Android Emulator automatically maps to http://10.0.2.2:5000/api
# - iOS Simulator and Web map to http://localhost:5000/api
# - Production fallback maps to https://api.legalnow.com/api
```

### 2. Running the Development Server

```bash
# Start Expo development bundler
npx expo start

# Run directly on connected Android device or emulator
npm run android

# Run on iOS simulator (macOS required)
npm run ios
```

---

## 🤖 Android Studio Setup & Emulator Instructions

1. **Open Project:**
   - Launch Android Studio.
   - Open the `D:\LegalNow-Mobile\android` folder.
   - Allow Gradle to sync dependencies.

2. **Android Emulator Networking:**
   - The Android Emulator runs in an isolated virtual network where `10.0.2.2` represents the development host machine's `localhost`.
   - The API client in `src/api/axiosClient.ts` automatically detects the Android emulator and routes all requests to `http://10.0.2.2:5000/api`. Ensure the .NET 10 API in `D:\LegalOne` is running on port 5000.

3. **Building Debug APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   # Output APK: android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Generating Release App Bundle (AAB) for Google Play:**
   ```bash
   cd android
   ./gradlew bundleRelease
   # Output AAB: android/app/build/outputs/bundle/release/app-release.aab
   ```

---

## 🍏 iOS Build & EAS Cloud Instructions

1. **Development Build:**
   ```bash
   npx expo run:ios
   ```

2. **Cloud Release Build via EAS:**
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build --platform ios --profile production
   ```

---

## 🧪 Testing & Verification

Run the automated test suite and type check before pushing any changes:

```bash
# Run unit tests
npm test

# Run strict TypeScript compiler verification
npx tsc --noEmit

# Run linter
npx expo lint
```

---

## 🔒 Security Architecture

* **Tokens:** Stored exclusively in `expo-secure-store` (iOS Keychain / Android Keystore).
* **Session Stamp:** Every request validates the `sstamp` claim against the database. "Log out of all devices" invalidates active tokens instantly.
* **OTP Rate Limiting:** Enforces 30-second cooldowns to prevent SMS/email flooding.
* **No Server Secrets:** The mobile bundle contains zero database credentials, OTP provider secrets, or admin keys.

