# VaultBridge Android 📱

> Cross-Cloud File Migration Client for Android built with **React Native**, **Expo SDK 53**, and **TypeScript**.

VaultBridge Android connects to the VaultBridge backend to let users securely authenticate multiple Google accounts, browse cloud files across services (Google Drive, Gmail Attachments, Google Cloud Storage), and initiate fast batch migrations directly from their mobile devices.

---

## 🚀 Features

- **Dual-Account Google OAuth**:
  - Connect a **Source** Google account (reads Drive, Gmail, GCS).
  - Connect a separate **Destination** Google account (writes migrated files to Drive).
  - Background session pairing bridge with automatic token synchronization and fallback manual entry.
- **Visual Storage Quota**:
  - Live animated storage bars displaying used and total storage for source and destination accounts.
- **Multi-Provider Cloud File Explorer**:
  - Provider tabs: **Google Drive**, **Gmail Attachments**, and **Google Cloud Storage (GCS)**.
  - Client-side search, real-time filtering, and multi-file selection mode with counter badge.
  - Infinite pagination with pull-to-refresh.
- **Batch Transfer Engine**:
  - Review queue before initiating migrations.
  - Transfer mode selection: **Copy** (preserves original) or **Move** (deletes source file upon success).
  - Live progress tracking screen polling status, transferred bytes, and per-file completion.
- **Transfer History Ledger**:
  - Complete history of past migrations with status badges (`COMPLETED`, `IN_PROGRESS`, `FAILED`).
  - Detailed error reporting and retry count indicators.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | [React Native 0.79.6](https://reactnative.dev/) / [Expo SDK 53](https://expo.dev/) |
| **Routing** | [Expo Router v5](https://docs.expo.dev/router/introduction/) (File-based) |
| **Language** | [TypeScript 5.3](https://www.typescriptlang.org/) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Server State & Caching** | [TanStack React Query v5](https://tanstack.com/query/latest) |
| **HTTP Client** | [Axios](https://axios-http.com/) with request/response interceptors |
| **Secure Storage** | [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) (Encrypted JWT token storage) |
| **Web Browser / Auth** | [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/) & [Expo Linking](https://docs.expo.dev/versions/latest/sdk/linking/) |
| **Icons** | [@expo/vector-icons](https://icons.expo.fyi/) (Ionicons) |

---

## 📂 Project Structure

```text
vaultbridge-android/
├── app/                           # Expo Router file-based pages
│   ├── _layout.tsx                # Root layout (QueryClientProvider, SafeAreaProvider, Stack)
│   ├── index.tsx                  # Splash / Authentication gateway
│   ├── (auth)/
│   │   ├── _layout.tsx            # Auth stack configuration
│   │   └── login.tsx              # 2-step Google OAuth login screen
│   └── (app)/
│       ├── _layout.tsx            # Authenticated tabs layout (Dashboard, Files, History)
│       ├── dashboard.tsx          # Account pipeline & storage quotas
│       ├── files.tsx              # Multi-provider file explorer & selection
│       ├── history.tsx            # Migration history & status filters
│       └── transfer/
│           ├── confirm.tsx        # Pre-transfer confirmation & Mode selector (Copy/Move)
│           └── progress.tsx       # Live migration progress & polling
├── src/
│   ├── api/                       # API clients & service endpoints
│   │   ├── client.ts              # Axios instance with SecureStore token interceptor
│   │   ├── auth.api.ts            # OAuth URLs, pairing check, /auth/me
│   │   ├── sources.api.ts         # Drive, Gmail, GCS file fetching & quotas
│   │   └── transfer.api.ts        # Batch transfer trigger & progress polling
│   ├── components/                # Reusable UI components
│   │   ├── AccountCard.tsx        # Source/Destination connection cards
│   │   ├── EmptyState.tsx         # Empty data placeholders
│   │   ├── FileItem.tsx           # Checkbox-selectable cloud file row
│   │   ├── LoadingSpinner.tsx     # Animated loading indicator
│   │   ├── StorageBar.tsx         # Storage usage progress bar
│   │   └── TransferItem.tsx       # Migration status row with metadata
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.ts             # Account connection & session helpers
│   │   ├── useFiles.ts            # File listing with TanStack Query
│   │   └── useTransfers.ts        # Transfer history & progress hooks
│   ├── store/                     # Zustand client stores
│   │   └── auth.store.ts          # Authentication & account state
│   ├── types/                     # TypeScript definitions
│   │   └── api.types.ts           # Schema contracts matching backend
│   └── utils/                     # Formatting utilities
│       ├── formatBytes.ts         # Byte sizes to human-readable strings
│       └── mimeIcon.ts            # File extension to icon mapper
├── app.json                       # Expo application manifest
├── eas.json                       # EAS Build profile configuration (APK/AAB)
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript compiler options
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root of `vaultbridge-android`:

```env
# URL of your deployed or local VaultBridge backend
EXPO_PUBLIC_API_BASE_URL=https://vaultbridge-pn2x.onrender.com
```

> **Note**: For local backend development using an Android emulator, use `http://10.0.2.2:3000`. For a physical phone connected over Wi-Fi, use your machine's LAN IP (e.g. `http://192.168.1.X:3000`).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** ≥ 18.x
- **npm** or **yarn**
- **Expo Go App** (SDK 53) installed on your Android device, or Android Studio Emulator

### 2. Install Dependencies
```bash
cd vaultbridge-android
npm install
```

### 3. Run Development Server
```bash
npm start
# or
npx expo start
```

- Press **`a`** to open in an attached Android emulator.
- Scan the printed QR code using the **Expo Go** app on your physical device.

---

## 📦 Building an Installable Android APK

The project is preconfigured with [EAS Build](https://docs.expo.dev/build/introduction/) to generate standalone APKs without requiring a local Android SDK setup:

```bash
# 1. Login to your Expo account
npx eas-cli login

# 2. Build standalone preview APK
npx eas-cli build --platform android --profile preview
```

The `preview` profile in `eas.json` is configured with `android.buildType: "apk"` and `distribution: "internal"`. Once the cloud build finishes, download the `.apk` directly to your phone.

---

## 🔒 Authentication Architecture

VaultBridge uses a **Dual-Channel Session Pairing Bridge**:
1. When **Connect Account** is tapped, the app generates an ephemeral, cryptographically secure `pairId`.
2. The user signs in through Google OAuth in Chrome Custom Tabs (`WebBrowser`).
3. Google redirects back to the VaultBridge web callback with the authorized tokens.
4. The backend securely maps the session JWT to the ephemeral `pairId`.
5. The Android app polls `GET /auth/pair?pairId={pairId}` every 2 seconds, automatically stores the JWT in `expo-secure-store`, dismisses the browser, and transitions to the connected dashboard.
6. A fallback **Manual Token Entry** modal is also provided for direct paste.

---

## 📄 License

This project is part of the VaultBridge Cross-Cloud Migration Platform.

