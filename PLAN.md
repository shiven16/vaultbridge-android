# VaultBridge Android — Implementation Plan

> **Target directory:** `vaultbridge-android/`  
> **Tech stack:** React Native · Expo · TypeScript · Expo Router · Axios · TanStack Query · Expo SecureStore  
> **Backend:** Existing `vaultbridge/backend` (Node.js / Express / PostgreSQL / Prisma)

---

## 1. Existing Architecture Analysis

### 1.1 Backend Overview

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18, TypeScript, `tsx` dev runner |
| Framework | Express 4 |
| ORM / DB | Prisma 5 + PostgreSQL |
| Auth | Google OAuth 2.0 → JWT stored in `httpOnly` cookie |
| Credential store | AES-256 encrypted refresh tokens in DB |
| File sources | Google Drive, Google Cloud Storage, Gmail Attachments, Google Photos Picker |
| File destination | Google Drive only |
| Transfer engine | In-process async queue, max 3 concurrent, up to 5 retries |
| Retry cron | `node-cron` every 5 minutes via `retryFailedTransfers()` |
| Security | `helmet`, `cors`, `express-rate-limit` (100 req / 15 min / IP) |

### 1.2 Database Models (Prisma)

**`User`**
- Primary Google account: `sourceEmail`, `sourceAccessToken`, `sourceRefreshToken`, `sourceExpiryDate`, `sourceGrantedScopes[]`
- Secondary (destination) Google account: `destEmail`, `destAccessToken`, `destRefreshToken`, `destExpiryDate`, `destGrantedScopes[]`
- Relations: `Transfer[]`, `PhotoPickerSession[]`

**`Transfer`**
- `status`: `pending | in_progress | success | failed`
- `sourceType`: `drive | gcs | gmail | photos`
- `transferMode`: `copy | move`
- `retryCount`, `error`, `startedAt`, `finishedAt`

**`PhotoPickerSession`**
- Tracks Google Photos Picker API sessions with `pickerUri`, `mediaItemsSet`, `pollingIntervalSecs`

### 1.3 API Endpoint Inventory (Verified from Source)

All routes are mounted under the backend base URL.

#### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/login` | No | Returns Google OAuth URL (`?type=source\|destination&scopePreset=default\|photos`) |
| `GET` | `/auth/callback` | Cookie (optional) | Exchanges OAuth code; sets `httpOnly` cookie JWT; returns user info |
| `GET` | `/auth/me` | Cookie | Returns connected accounts info + `photosPickerConnected` flag |
| `POST` | `/auth/disconnect` | Cookie | Disconnects source or destination account (`{ type: "source"\|"destination" }`) |

#### Drive (`/drive`) — destination-side queries
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/drive/files` | Cookie | Lists destination Google Drive files (`?type=destination&pageToken&pageSize&orderBy`) |
| `GET` | `/drive/quota` | Cookie | Destination storage quota |

#### Sources (`/sources`) — source-side multi-provider
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/sources/files` | Cookie | Lists source files (`?sourceType=drive\|gcs\|gmail&pageToken&pageSize`) |
| `GET` | `/sources/quota` | Cookie | Source storage quota (Drive only) |

#### Photos Picker (`/sources/photos`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/sources/photos/sessions` | Cookie | Creates a new Google Photos Picker session; returns `pickerUri` |
| `GET` | `/sources/photos/sessions/:id` | Cookie | Gets session state; polls `mediaItemsSet` |
| `GET` | `/sources/photos/sessions/:id/media` | Cookie | Lists picked media items |
| `DELETE` | `/sources/photos/sessions/:id` | Cookie | Deletes session |
| `GET` | `/sources/photos/media/:id/thumbnail` | Cookie | Streams thumbnail image |

#### Transfers (`/transfer`)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/transfer` | Cookie | Creates single transfer (`{ fileId, fileName, mimeType?, sourceType, transferMode }`) → `202 { transferId }` |
| `POST` | `/transfer/batch` | Cookie | Creates multiple transfers; returns `{ transferIds[] }` |
| `GET` | `/transfer` | Cookie | Lists all user transfers ordered newest-first |
| `GET` | `/transfer/:id` | Cookie | Gets single transfer by ID |

#### System
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Health check |

### 1.4 Authentication Deep Dive

The backend uses **cookie-based JWT authentication**:
- On successful OAuth, the backend calls `res.cookie('token', jwt, { httpOnly: true, ... })`.
- Every protected route reads `req.cookies.token` via `cookie-parser`.
- In production, the cookie is `SameSite: none; Secure` (cross-origin capable).
- The `authMiddleware` verifies the JWT and also queries the DB to confirm the user still exists.
- There is **no `/auth/logout` endpoint** — logout is currently frontend-only state clearing.
- There is **no Bearer token / Authorization header path** in the existing middleware.

---

## 2. Integration Challenges

### 2.1 🔴 Critical: Cookie-Based Auth is Incompatible with React Native

**Problem:** React Native's `fetch`/Axios does not automatically persist `httpOnly` cookies across requests. `document.cookie` does not exist. The existing `authMiddleware` reads exclusively from `req.cookies.token`.

**Solution (requires minimal backend change):**
Add a parallel Bearer token path to `authMiddleware`:

```typescript
// auth.middleware.ts — add alongside existing cookie check
const token = req.cookies?.token 
  ?? req.headers.authorization?.replace('Bearer ', '');
```

Then store the JWT securely in `expo-secure-store` on the mobile client. The JWT itself is already a standard token; only the _delivery mechanism_ changes. No other backend logic changes.

> **Impact:** One-line backend change. All transfer, file, and user logic is reused as-is.

### 2.2 🔴 Critical: Google OAuth Redirect Flow

**Problem:** The web flow does `window.location.href = googleAuthUrl`. On mobile, we must:
1. Open the OAuth URL in a browser (`expo-web-browser`).
2. Register a custom URI scheme (e.g. `vaultbridge://auth/callback`) or use Expo's `AuthSession` proxy.
3. Receive the redirect back and extract `code` from the deep-link URL.
4. POST `code` + `state` to `/auth/callback`.

**Solution:** Use `expo-auth-session` + `expo-web-browser`. The backend's `/auth/callback` already accepts `code` and `state` as query params and returns JSON — this is compatible.

> **Impact:** Mobile-only change. Backend `/auth/callback` response is already JSON (`{ message, user, returnTo }`), which is exactly what we need.

### 2.3 🟡 Medium: Google Photos Picker WebView

**Problem:** The Google Photos Picker is a web-based picker opened via `pickerUri` (a Google-hosted URL) in a browser popup. On mobile, this must be opened with `expo-web-browser` or an in-app `WebView`.

**Solution:** Use `expo-web-browser` to open `pickerUri`, then poll `/sources/photos/sessions/:id` on a timer until `mediaItemsSet: true`.

### 2.4 🟡 Medium: CORS Origin

**Problem:** The backend currently sets `origin: env.FRONTEND_URL` in CORS, restricting cross-origin requests. The mobile app sends requests directly to the API; Axios does not send an `Origin` header in the same way browsers do (or sends a different one).

**Solution:** Add the mobile app's bundle ID or `capacitor://` / `null` origin to the allowed origins list, or set `FRONTEND_URL` to allow all origins when unset (the backend already defaults to `origin: true` when `FRONTEND_URL` is undefined).

### 2.5 🟡 Medium: `window` / Browser APIs in Existing Code

The mobile app does not share any code with the web frontend, so there is no risk of `window.location`, `document`, etc. leaking in. All logic is written fresh using React Native primitives.

### 2.6 🟢 Minor: Thumbnail URLs

Photos thumbnails are served as a streaming endpoint (`/sources/photos/media/:id/thumbnail`). To display in React Native's `<Image>`, include the JWT as a query param or pass it as an Authorization header via a custom `Image` component (e.g. `expo-image` with `headers`).

### 2.7 🟢 Minor: Rate Limiting

The backend rate-limits at 100 requests per 15 minutes per IP. This is fine for mobile usage.

---

## 3. What the Backend Already Fully Supports (No Changes Needed)

| Feature | Endpoint | Mobile Compatible? |
|---|---|---|
| Fetch user/account info | `GET /auth/me` | ✅ (after auth header fix) |
| List Drive files (paginated) | `GET /sources/files?sourceType=drive` | ✅ |
| List Gmail attachments | `GET /sources/files?sourceType=gmail` | ✅ |
| List GCS files | `GET /sources/files?sourceType=gcs` | ✅ |
| Get storage quota | `GET /sources/quota` | ✅ |
| Create single transfer | `POST /transfer` | ✅ |
| Create batch transfer | `POST /transfer/batch` | ✅ |
| Poll transfer status | `GET /transfer/:id` | ✅ |
| List all user transfers | `GET /transfer` | ✅ |
| Disconnect account | `POST /auth/disconnect` | ✅ |
| Health check | `GET /health` | ✅ |
| Auto-retry of failed transfers | Cron job (server-side) | ✅ (transparent) |
| Token refresh | Inside backend service | ✅ (transparent) |

## 4. Required Backend Modification (Minimal)

**File:** `vaultbridge/backend/src/middlewares/auth.middleware.ts`

```typescript
// Before (line 22):
const token = req.cookies.token;

// After:
const token = req.cookies?.token
  ?? (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined);
```

This is the **only backend change needed** for MVP. All business logic is reused.

---

## 5. Proposed Mobile Architecture

### 5.1 Folder Structure

```
vaultbridge-android/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout (QueryClientProvider, AuthProvider)
│   ├── index.tsx                 # Splash / redirect logic
│   ├── (auth)/
│   │   ├── _layout.tsx           # Unauthenticated layout
│   │   └── login.tsx             # Connect source + destination accounts
│   └── (app)/
│       ├── _layout.tsx           # Authenticated tab layout (bottom tabs)
│       ├── dashboard.tsx         # Home: account cards + source selector
│       ├── files.tsx             # File browser
│       ├── transfer/
│       │   ├── confirm.tsx       # Review selections + choose mode
│       │   └── progress.tsx      # Active transfer progress
│       └── history.tsx           # Past transfers list
├── src/
│   ├── api/
│   │   ├── client.ts             # Axios instance + interceptors
│   │   ├── auth.api.ts           # /auth/* calls
│   │   ├── sources.api.ts        # /sources/* calls
│   │   ├── drive.api.ts          # /drive/* calls
│   │   ├── photos.api.ts         # /sources/photos/* calls
│   │   └── transfer.api.ts       # /transfer/* calls
│   ├── store/
│   │   └── auth.store.ts         # Zustand store: JWT token + account state
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth state + login/logout helpers
│   │   ├── useFiles.ts           # TanStack Query hooks for file listing
│   │   ├── useTransfers.ts       # TanStack Query hooks for transfers
│   │   └── usePhotosPicker.ts    # Photos session lifecycle hook
│   ├── components/
│   │   ├── AccountCard.tsx       # Connected account display
│   │   ├── FileItem.tsx          # File row (name, size, mime icon, checkbox)
│   │   ├── FileList.tsx          # Paginated FlatList of files
│   │   ├── TransferItem.tsx      # Transfer status row
│   │   ├── StorageBar.tsx        # Storage usage progress bar
│   │   ├── EmptyState.tsx        # Reusable empty placeholder
│   │   └── LoadingSpinner.tsx    # Reusable loader
│   ├── types/
│   │   ├── api.types.ts          # Shared response/request type definitions
│   │   └── navigation.types.ts   # Expo Router typed params
│   └── utils/
│       ├── formatBytes.ts        # Byte → human-readable string
│       └── mimeIcon.ts           # mimeType → icon name mapping
├── assets/                       # App icons, splash screen
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── tsconfig.json
└── package.json
```

### 5.2 State Management

| State | Solution | Reason |
|---|---|---|
| JWT token | `expo-secure-store` (persisted) | Encrypted at rest on Android Keystore |
| Auth / account info | Zustand store (in-memory, hydrated from API) | Simple; avoids prop drilling |
| Server state (files, transfers) | TanStack Query | Caching, pagination, background refresh |
| Selection state | Local `useState` in screen component | Ephemeral UI state |

---

## 6. Screen-by-Screen Implementation Plan

### Screen 1: Splash / Redirect (`app/index.tsx`)

**Purpose:** Determine if user has a stored token and redirect appropriately.

**Logic:**
1. Check `SecureStore` for JWT token.
2. If present, call `GET /auth/me` to validate.
3. On success → redirect to `/(app)/dashboard`.
4. On 401 or no token → redirect to `/(auth)/login`.

**Backend:** `GET /auth/me`  
**Already supported:** ✅

---

### Screen 2: Login (`app/(auth)/login.tsx`)

**Purpose:** Step-by-step account connection (source → destination).

**UI:**
- Step 1: "Connect Source Account" button (always visible)
- Step 2: "Connect Destination Account" button (enabled after source connected)
- Step 3: "Continue to Dashboard" button (enabled when both connected)
- Disconnect links for each connected account

**OAuth Flow (mobile-specific):**
```
1. Call GET /auth/login?type=source → receive { url }
2. Open url with expo-web-browser (openAuthSessionAsync)
3. Capture redirect to vaultbridge://auth/callback?code=...&state=...
4. Call GET /auth/callback?code=...&state=...&type=source
5. Store returned JWT in SecureStore
6. Refresh account state from /auth/me
```

**Destination flow:** Same but `type=destination`; JWT must already be in SecureStore so the backend can read the cookie (or we pass it as `Authorization: Bearer <token>` with the backend fix).

**Backend:** `GET /auth/login`, `GET /auth/callback`, `GET /auth/me`, `POST /auth/disconnect`  
**Already supported:** ✅ (after Bearer header fix)  
**Mobile change:** Use `expo-auth-session` + deep-link scheme instead of redirect

---

### Screen 3: Dashboard (`app/(app)/dashboard.tsx`)

**Purpose:** Home screen. Shows connected accounts, source type selector, storage quota, navigation to file browser.

**UI:**
- Source account card (email, picture)
- Destination account card (email, picture)
- Source type selector: Drive | Gmail | GCS | Photos (segmented control or chips)
- Storage bar (Drive only)
- "Browse Files" CTA button → navigates to `/(app)/files`

**Backend:** `GET /auth/me`, `GET /sources/quota`  
**Already supported:** ✅

---

### Screen 4: File Browser (`app/(app)/files.tsx`)

**Purpose:** Browse and multi-select files for transfer.

**UI:**
- Infinite-scroll `FlatList` using `nextPageToken` pagination
- Each row: file icon (by mimeType), name, size, checkbox
- Selection counter + "Start Transfer" FAB (floating action button)
- Pull-to-refresh
- Empty state (no files), error state

**Data flow:**
- `useInfiniteQuery` with `GET /sources/files?sourceType=drive|gcs|gmail&pageSize=20&pageToken=`
- Photos: handled via `usePhotosPicker` hook (see below)

**Backend:** `GET /sources/files`, `GET /sources/photos/sessions/*`  
**Already supported:** ✅

**Photos-specific flow:**
1. POST `/sources/photos/sessions` → receive `{ id, pickerUri }`
2. Open `pickerUri` in `expo-web-browser`
3. Poll `GET /sources/photos/sessions/:id` every `pollingIntervalSecs` seconds until `mediaItemsSet: true`
4. Fetch `GET /sources/photos/sessions/:id/media`
5. Display photos with thumbnails via `/sources/photos/media/:id/thumbnail`

---

### Screen 5: Transfer Confirmation (`app/(app)/transfer/confirm.tsx`)

**Purpose:** Review selected files; choose copy vs. move; initiate transfer.

**UI:**
- List of selected files (swipe to remove)
- Transfer mode toggle: Copy / Move (Move disabled for Photos)
- Destination account display
- "Start Transfer" primary button

**On confirm:**
- Call `POST /transfer/batch` with all selected files
- Navigate to `/(app)/transfer/progress` with returned `transferIds[]`

**Backend:** `POST /transfer/batch`  
**Already supported:** ✅

---

### Screen 6: Transfer Progress (`app/(app)/transfer/progress.tsx`)

**Purpose:** Real-time polling of transfer statuses.

**UI:**
- Per-file status row: spinner (in_progress), check (success), ✕ + error message (failed)
- Overall summary (X of Y complete)
- "Done" button when all settled
- "Retry Failed" button (re-initiates failed transfers via `POST /transfer/batch`)

**Data flow:**
- `useQueries` (TanStack) polling each `GET /transfer/:id` every 2 seconds
- Stop polling when status is `success` or `failed`

**Backend:** `GET /transfer/:id`  
**Already supported:** ✅

---

### Screen 7: Transfer History (`app/(app)/history.tsx`)

**Purpose:** Show all past and active transfers.

**UI:**
- Grouped list (In Progress, Completed, Failed)
- Per-row: file name, source type icon, status badge, timestamp
- Pull-to-refresh
- Empty state

**Backend:** `GET /transfer`  
**Already supported:** ✅

---

## 7. Required Dependencies

### Core

```json
{
  "expo": "~52.x",
  "expo-router": "~4.x",
  "react": "18.x",
  "react-native": "0.76.x",
  "typescript": "~5.x"
}
```

### Authentication & Security

```json
{
  "expo-auth-session": "latest",
  "expo-web-browser": "latest",
  "expo-secure-store": "latest",
  "expo-linking": "latest",
  "expo-crypto": "latest"
}
```

### Networking & State

```json
{
  "axios": "^1.x",
  "@tanstack/react-query": "^5.x",
  "zustand": "^4.x"
}
```

### UI

```json
{
  "expo-image": "latest",
  "@expo/vector-icons": "latest",
  "react-native-safe-area-context": "latest",
  "react-native-screens": "latest",
  "@react-navigation/native": "^6.x"
}
```

### Build

```json
{
  "eas-cli": "latest (global)"
}
```

> **No additional dependencies** are needed beyond these. No Redux, no MobX, no GraphQL, no WebSocket.

---

## 8. API Integration Strategy

### 8.1 Axios Client (`src/api/client.ts`)

```typescript
// Pseudocode
const client = axios.create({ baseURL: API_BASE_URL });

// Request interceptor: attach JWT from SecureStore
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: on 401 clear token and redirect to login
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('jwt_token');
      // navigate to /(auth)/login via router
    }
    return Promise.reject(error);
  }
);
```

### 8.2 TanStack Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s — files don't change often
      retry: 2,
      retryDelay: 1000,
    },
  },
});
```

### 8.3 Pagination Pattern

Use `useInfiniteQuery` for file lists with the backend's `nextPageToken` cursor:
```typescript
useInfiniteQuery({
  queryKey: ['files', sourceType],
  queryFn: ({ pageParam }) => listSourceFiles({ sourceType, pageToken: pageParam }),
  getNextPageParam: (last) => last.nextPageToken,
});
```

---

## 9. Authentication & Secure Token Management

| Step | Mechanism |
|---|---|
| Initial OAuth | `expo-auth-session` → `expo-web-browser.openAuthSessionAsync` |
| Callback capture | Deep link: `vaultbridge://auth/callback` |
| Code exchange | `GET /auth/callback?code=&state=&type=` |
| Token storage | `SecureStore.setItemAsync('jwt_token', jwt)` — Android Keystore backed |
| Token usage | Axios request interceptor adds `Authorization: Bearer <token>` |
| Token expiry | Backend JWT is 7-day expiry; on 401, re-auth via login screen |
| Logout | `SecureStore.deleteItemAsync('jwt_token')` + navigate to login |

> **Important:** The JWT itself does not expire early. The backend DB session tokens for Google (access/refresh) are managed entirely server-side. The mobile app only stores the VaultBridge JWT.

### Deep Link Configuration (`app.json`)

```json
{
  "expo": {
    "scheme": "vaultbridge",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "vaultbridge" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

## 10. Transfer Initiation & Progress Tracking

### Initiate

1. User selects files on `files.tsx`.
2. Navigate to `transfer/confirm.tsx` with selected file IDs.
3. User picks transfer mode → hits "Start Transfer".
4. Call `POST /transfer/batch` → receive `transferIds[]`.
5. Navigate to `transfer/progress.tsx` with `transferIds[]`.

### Track

```typescript
// Per-transfer polling using TanStack Query
const queries = transferIds.map(id => ({
  queryKey: ['transfer', id],
  queryFn: () => getTransferStatus(id),
  refetchInterval: (data) =>
    data?.status === 'pending' || data?.status === 'in_progress' ? 2000 : false,
}));
const results = useQueries({ queries });
```

The backend processes up to 3 concurrent transfers server-side; the mobile client simply polls.

---

## 11. Loading, Error & Empty States

| Scenario | Component |
|---|---|
| Initial app load / auth check | Full-screen `ActivityIndicator` |
| File list loading | `FlatList` with skeleton placeholders |
| File list empty | `EmptyState` with icon + "No files found" |
| API error (network) | Error banner with retry button |
| API error (401) | Automatic redirect to login |
| Transfer in progress | Spinner per row |
| Transfer success | Green checkmark |
| Transfer failed | Red ✕ + error message text |
| No accounts connected | Dashboard prompt cards |

---

## 12. Prioritised Implementation Milestones

### Milestone 1 — Auth Foundation (Day 1)
- [ ] Scaffold Expo project: `npx create-expo-app vaultbridge-android --template expo-template-blank-typescript`
- [ ] Configure Expo Router with `app/` directory
- [ ] Implement `src/api/client.ts` with SecureStore JWT interceptor
- [ ] Implement `app/(auth)/login.tsx` with OAuth flow (source account only)
- [ ] Implement `app/index.tsx` redirect logic
- [ ] **Backend:** Add Bearer header support to `authMiddleware`
- [ ] Test: auth round-trip with real Google account

### Milestone 2 — Dashboard & Account Management (Day 1–2)
- [ ] Implement `GET /auth/me` integration (`AccountCard` component)
- [ ] Dashboard screen with source/destination account cards
- [ ] Add destination account OAuth connection
- [ ] Disconnect account functionality
- [ ] Zustand auth store hydration

### Milestone 3 — File Browser (Day 2)
- [ ] `useFiles` hook with `useInfiniteQuery`
- [ ] `FileList` + `FileItem` components
- [ ] Drive file browsing with pagination
- [ ] Multi-select with counter
- [ ] Pull-to-refresh
- [ ] Empty + error states

### Milestone 4 — Transfer Flow (Day 2–3)
- [ ] Transfer confirmation screen
- [ ] `POST /transfer/batch` integration
- [ ] Transfer progress screen with polling
- [ ] Success / failure display per file
- [ ] Transfer history screen (`GET /transfer`)

### Milestone 5 — Additional Sources (Day 3)
- [ ] Gmail attachments source
- [ ] GCS source
- [ ] Google Photos Picker (`expo-web-browser` + session polling)
- [ ] Storage quota bar

### Milestone 6 — Polish & Build (Day 4)
- [ ] Error boundary
- [ ] Offline / network error state
- [ ] App icon + splash screen
- [ ] `eas.json` configuration
- [ ] Android APK build

---

## 13. Testing Strategy

### Unit Tests (Jest + Testing Library)
- `formatBytes` utility
- `mimeIcon` utility
- Axios interceptors (mock SecureStore)
- TanStack Query hooks with mock server responses (`msw` or manual mocks)

### Integration / Component Tests
- `AccountCard` renders connected/disconnected state correctly
- `FileItem` renders checkbox, name, size
- `TransferItem` renders all statuses

### Manual E2E (Expo Go / Android Emulator)
- Full OAuth login → dashboard → file browse → batch transfer → progress → history
- Disconnect source account
- Transfer with 1 file (copy), verify it appears in destination Drive
- Failed transfer displays error message

### Device Testing
- Android Emulator (API 33 minimum)
- Physical Android device via `expo run:android`

---

## 14. Android APK Build — Expo EAS

### Setup

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### `eas.json`

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### Build Commands

```bash
# Development APK (with dev client)
eas build --platform android --profile development

# Preview APK (production JS, debug signing)
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production
```

### Environment Variables

Store secrets in EAS via `eas secret:create`:
```bash
eas secret:create --scope project --name API_BASE_URL --value https://your-api.example.com
```

Never hardcode the API base URL — read from `process.env.EXPO_PUBLIC_API_BASE_URL` in `app.config.ts`.

---

## 15. Summary: Backend vs. Mobile Responsibilities

| Feature | Backend | Mobile (new) |
|---|---|---|
| Google OAuth URL generation | ✅ Existing | Trigger + open URL |
| Token exchange | ✅ Existing | Pass `code`, store JWT |
| Google token refresh | ✅ Existing (transparent) | None |
| File listing | ✅ Existing | UI + pagination |
| Transfer execution | ✅ Existing | Trigger + poll |
| Transfer retry | ✅ Existing (cron) | Show retry UI |
| Photos Picker | ✅ Existing (session API) | Open picker URL, poll |
| Auth middleware Bearer support | ❌ **Needs 1-line change** | Axios interceptor |
| Secure credential storage | Encrypted in DB | `expo-secure-store` |
| Offline error handling | N/A | Network interceptor |
| Navigation | N/A | Expo Router |

---

*Plan authored: 2026-11-07. All endpoints verified against `vaultbridge/backend/src/` source code.*

