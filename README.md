# OLD-LETTERS

A digital correspondence platform built around:

```
WRITE → SEAL → WAIT → ARRIVE
```

OLD-LETTERS is an intentional digital correspondence service that restores the patience, reverence, and emotional gravity of physical post. In contrast to instant messaging, every letter penned on OLD-LETTERS is sealed in virtual wax and placed into a temporal delivery vault. It cannot be opened prematurely. When the scheduled hour arrives, the recipient is invited to a quiet, ceremonial unsealing.

---

## Features

- **Letter Templates & Tactile Stationery**: 15 distinct, authentic paper finishes (Ivory Classic, Midnight Archive, Antique Vellum, Blush Pressed Rose, Love Letter, Apology, Thank You, Birthday, Congratulations, Encouragement, Goodbye, Time Capsule, Future Letter, Secret Letter, Custom Letter) with custom paper weights, authentic postal borders, and wax seal emblems.
- **Physical Stationery Experience**: Editorial stationery desk with tactile sample cards, natural paper shadows, layered depth, and authentic high-contrast ink and typography.
- **Letter Composer**: Multi-step correspondence flow allowing senders to select occasion, customize stationery, pen words with auto-saving drafts, upload keepsakes, choose verification, and schedule delivery.
- **Draft Persistence**: Automatic client and server-side draft synchronization to ensure thoughts are never lost mid-composition.
- **Delayed Delivery Intervals**: Mandatory intentional waiting periods:
  - **48-Hour Minimum Delivery**: The signature waiting period cultivating patience.
  - **7-Day Delivery**: For reflections meant for next week.
  - **30-Day Delivery**: For monthly milestones and anticipated arrivals.
  - **Custom Delivery Date**: Inscribe letters to be delivered on specific anniversaries or future years.
- **User Accounts & Authentication**:
  - Secure Email/Password registration and login.
  - Google OAuth 2.0 single sign-on integration.
  - Automatic account linking between Google and email accounts.
- **JWT HTTP-Only Session Cookies**: Cryptographically signed `oldletters_session` cookies with `httpOnly`, `secure`, and `SameSite=Lax` protection against client-side tampering and XSS.
- **Private Correspondence Archive**: Personal vault showing sent letters, transit countdowns, delivery tracking codes, and unsealing statuses.
- **MongoDB Atlas Storage**: Scalable cloud database preserving letters, user profiles, verification tokens, and audit logs.
- **GridFS Private Media**: Enclosed photographs and keepsakes securely stored in MongoDB GridFS buckets.
- **Delivery Scheduler**: Automated background delivery engine dispatching arrival notifications when vault timers expire.
- **Email Delivery via Resend**: Beautiful transactional email notifications informing recipients when their sealed dispatch has arrived.
- **Admin Bureau Desk**: Administrative verification portal for inspecting letters, verifying manual transactions, and reviewing postal audit logs.
- **Manual UPI Payment Workflow**: Traditional postal remittance workflow with QR code display, reference submission, and administrative verification.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion / Motion, Lucide Icons.
- **Backend API**: Node.js, Express 4.
- **Database**: MongoDB Atlas (native driver 7.x) with MongoDB GridFS for media files.
- **Authentication**: Passport.js, Passport Google OAuth 2.0 (`passport-google-oauth20`), bcryptjs, JSON Web Tokens (`jsonwebtoken`), `cookie-parser`.
- **Transactional Email**: Resend SDK (`resend`).
- **Validation**: Zod schema validation.
- **Hosting & Deployment**: Vercel (Edge Network + Serverless Functions via `api/index.ts` and `vercel.json`).

*(Migration note: OLD-LETTERS was migrated from an earlier Supabase prototype to a self-contained Express + MongoDB Atlas + JWT cookie architecture for complete database independence and serverless flexibility).*

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT (Vite SPA)                   │
│         React 19 + TypeScript + Tailwind CSS           │
└───────────────────────────┬────────────────────────────┘
                            │ /api/* requests
                            ▼
┌────────────────────────────────────────────────────────┐
│               BACKEND (Express API Router)             │
│            Serverless on Vercel (`api/index.ts`)       │
│               Standalone in Dev (`server.ts`)          │
└─────────────┬──────────────────────────┬───────────────┘
              │                          │
              ▼                          ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│       MONGODB ATLAS       │  │      EXTERNAL APIS      │
│  - User Accounts          │  │  - Google OAuth 2.0     │
│  - Letters & Recipients   │  │  - Resend Email Service │
│  - Tokens & OTP Hashes    │  └─────────────────────────┘
│  - GridFS Keepsake Media  │
└───────────────────────────┘
```

- **Frontend**: Vite SPA serving fast, responsive client-side routing.
- **Backend**: Express router managing authentication, letter creation, scheduling, verification, and media retrieval.
- **Database**: MongoDB Atlas holding collections with indexes on `senderId`, `trackingCode`, and `deliveryDate`.
- **Authentication**: bcrypt password hashing + JWT signed tokens stored inside `oldletters_session` HTTP-only cookies + Google OAuth 2.0.
- **Media**: GridFS bucket (`letterMedia`) for storing attachments directly in MongoDB without requiring external third-party image hosts.
- **Email**: Resend transactional email API dispatching arrival notifications when letters reach their scheduled date.
- **Deployment**: Vercel Serverless Functions (`api/index.ts` + `vercel.json` rewrites).

---

## Environment Variables

Configure these variables in your local `.env` file or in your **Vercel Project Settings → Environment Variables**:

| Variable | Description | Required? | Example / Default |
|---|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | **Required in Prod** | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `MONGODB_DB_NAME` | Database name | Optional | `oldletters` |
| `JWT_SECRET` | Secret key for signing JWT session cookies | **Required** | `openssl rand -hex 32` |
| `SESSION_SECRET` | Fallback alias for `JWT_SECRET` | Optional | `openssl rand -hex 32` |
| `APP_URL` | Public production URL of the app | **Required in Prod** | `https://your-project.vercel.app` (or `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID from Google Cloud Console | Optional (Required for Google Login) | `xxxxxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Optional (Required for Google Login) | `GOCSPX-xxxxxxxx` |
| `GOOGLE_CALLBACK_URL` | Google OAuth redirect callback URL | Optional | `https://your-project.vercel.app/api/auth/google/callback` |
| `RESEND_API_KEY` | Resend API key for transactional email | Optional | `re_xxxxxxxx` |
| `RESEND_FROM_EMAIL` | Sender address for delivery notices | Optional | `post@old-letters.in` |
| `ADMIN_EMAIL` | Bureau administrator email | Optional | `admin@old-letters.in` |
| `ADMIN_SECRET` | Secret header key for admin verification bypass | Optional | `your-secret-admin-key` |
| `CRON_SECRET` | Secret bearer token for automated dispatch cron | Optional | `your-cron-secret-key` |
| `PORT` | Local server port | Optional | `3000` |
| `UPI_ID` | Virtual Payment Address for manual payments | Optional | `oldletters@okhdfcbank` |
| `UPI_DISPLAY_NAME` | Payee name on UPI intent | Optional | `OLD-LETTERS CORRESPONDENCE` |
| `PAYMENT_QR_URL` | Path to UPI QR asset | Optional | `/assets/upi-qr.png` |

*Never commit real API keys, passwords, or secrets to the Git repository.*

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in `MONGODB_URI` and `JWT_SECRET`. If testing Google Sign-In locally, provide `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### 3. Run Development Server
```bash
npm run dev
```
This runs Express and Vite concurrently on `http://localhost:3000`. Express handles `/api/*` routes while Vite provides instant hot-module replacement for the frontend.

---

## Build & Test Scripts

All scripts are defined in `package.json`:

```bash
# Type check and lint codebase
npm run lint

# Build Vite frontend assets to dist/
npm run build

# Verify backend MongoDB module connectivity
npm run test:backend

# Start production server locally
npm start
```

---

## MongoDB Atlas Setup

1. **Create an Account**: Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. **Create a Cluster**: Deploy a free M0 Sandbox or dedicated cluster in your preferred cloud region.
3. **Create Database User**: Under **Security → Database Access**, create a user with `Read and write to any database` privileges.
4. **Configure Network Access**: Under **Security → Network Access**, add IP Address `0.0.0.0/0` (Allow Access from Anywhere) to permit connections from Vercel serverless functions.
5. **Obtain Connection String**: Click **Clusters → Connect → Drivers (Node.js)**. Copy the connection URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Set Variable**: Set `MONGODB_URI` in `.env` (local) and Vercel Project Settings (production).
7. **Start the Application**: When the app starts, MongoDB will automatically create collections and establish indexes for high-speed queries.

---

## Google OAuth 2.0 Setup

To enable **&ldquo;Continue with Google&rdquo;**:

1. **Create Project**: Open the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (e.g. `OLD-LETTERS`).
2. **OAuth Consent Screen**:
   - Go to **APIs & Services → OAuth consent screen**.
   - Choose **External** user type.
   - Enter App name (`OLD-LETTERS`), User support email, and Developer contact information.
   - Scopes required: `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
3. **Create OAuth Client ID**:
   - Navigate to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
   - Application type: **Web application**.
   - Name: `OLD-LETTERS Web Client`.
4. **Authorized JavaScript Origins**:
   - Local: `http://localhost:3000`
   - Production: `https://your-project.vercel.app`
5. **Authorized Redirect URIs**:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-project.vercel.app/api/auth/google/callback`
6. **Save Credentials**: Copy your **Client ID** and **Client Secret**.
7. **Configure Variables**:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"
   GOOGLE_CALLBACK_URL="https://your-project.vercel.app/api/auth/google/callback"
   ```
8. **Production Verification**: Ensure the redirect URI in Google Cloud Console matches the exact production callback URL.

---

## Vercel Deployment

1. **Push to GitHub**: Ensure all code is committed and pushed to your GitHub repository.
2. **Import Project**: In the [Vercel Dashboard](https://vercel.com/), click **Add New → Project** and import your repository.
3. **Framework Preset**: Vercel will detect `Vite`. Leave the Build Command as `npm run build` and Output Directory as `dist`.
4. **Environment Variables**: Add all production variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `APP_URL` (set to `https://your-project.vercel.app`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL` (`https://your-project.vercel.app/api/auth/google/callback`)
   - `RESEND_API_KEY` (if using email)
5. **Deploy**: Click **Deploy**. Vercel will build the frontend into `dist/` and configure the Serverless Function from `api/index.ts` via `vercel.json`.
6. **Verify Endpoints**:
   - Health check: `https://your-project.vercel.app/api/health`
   - Session status: `https://your-project.vercel.app/api/auth/me`
   - Google Sign-In: Click &ldquo;Continue with Google&rdquo; on your production site.

---

## Authentication Flow

```
VISITOR
   │
   ├─► Clicks "Write a Letter" / "Sign in"
   │
   ▼
AUTH MODAL (Bureau Registry)
   │
   ├── Option A: Email & Password (Signup / Login)
   │     │
   │     ▼
   │   POST /api/auth/signup OR /api/auth/login
   │     │
   │     ▼ (Verify credentials / bcrypt hash)
   │
   └── Option B: Continue with Google
         │
         ▼
       GET /api/auth/google
         │
         ▼ (Google OAuth Consent Screen)
         │
       GET /api/auth/google/callback
         │
         ▼ (Link or create account in MongoDB)
   │
   ▼
ISSUE HTTP-ONLY SESSION COOKIE
   │ `oldletters_session` (JWT, 30 days, SameSite=Lax, Secure)
   │
   ▼
COMPOSER DESK
   │ Inscribe letter, select stationery, mount photograph
   │
   ▼
REVIEW & POST
   │ Select recipient verification (Passphrase, OTP, or Open)
   │ Choose delivery delay (48 Hours, 7 Days, 30 Days, Custom)
   │
   ▼
TEMPORAL DELIVERY VAULT
   │ Locked until arrival timestamp
   │
   ▼
RECIPIENT UNSEALING CEREMONY & ARCHIVE
```

---

## Security Architecture

- **Bcrypt Password Hashing**: User passwords are encrypted with bcrypt (10 salt rounds) before touching database records.
- **HTTP-Only JWT Cookies**: Authentication tokens are stored in `oldletters_session` cookies configured with `httpOnly: true`, `secure: true`, and `sameSite: 'lax'`, preventing JavaScript token theft via XSS.
- **Strict Server-Side Ownership**: Letters and archives can only be retrieved or updated by the authenticated author.
- **Protected Administrative Endpoints**: Bureau moderation and payment verification endpoints require verified admin status or secret keys.
- **Input Sanitization & Validation**: API payloads are validated using strict Zod schemas with character and size constraints.
- **No Committed Secrets**: The repository contains only `.env.example` with blank placeholders. All live credentials remain in local environments or encrypted Vercel settings.

---

## Project Structure

```
old-letters/
├── api/
│   └── index.ts                 # Vercel serverless function entrypoint
├── components/
│   └── ui/
│       └── index.tsx            # Bureau authentication modal & form
├── scripts/
│   ├── seed.ts                  # Database seeding script
│   └── test-backend.ts          # Backend validation test
├── src/
│   ├── components/
│   │   ├── admin/               # Administrative verification desk
│   │   ├── archive/             # Personal correspondence archive
│   │   ├── auth/                # Profile and Auth modal containers
│   │   ├── common/              # PaperSheet, EnvelopeObject, LoadingScreen
│   │   ├── composer/            # LetterWriter, ReviewStep, StationeryGallery
│   │   ├── landing/             # LandingHero, LandingScenes
│   │   ├── legal/               # CookiePolicyView, PrivacyPolicyView, TermsOfServiceView
│   │   ├── recipient/           # RecipientExperience, Unsealing ceremony
│   │   └── ui/                  # Radial carousel, scroll triggers, footer
│   ├── data/
│   │   └── mockData.ts          # Curated templates, letter types, archives
│   ├── lib/
│   │   ├── api.ts               # Frontend API client
│   │   └── mongodb.ts           # MongoDB Atlas connection & collection schemas
│   ├── types/
│   │   ├── backend.ts           # Zod validation schemas
│   │   └── letter.ts            # Frontend letter & template interfaces
│   ├── App.tsx                  # Root application router & state
│   └── main.tsx                 # Client entrypoint
├── .env.example                 # Environment variables specification
├── index.html                   # HTML entrypoint
├── package.json                 # Project dependencies & build scripts
├── server.ts                    # Express application & standalone server
├── tsconfig.json                # TypeScript compiler configuration
├── vercel.json                  # Vercel serverless routing & SPA rewrites
└── vite.config.ts               # Vite bundler configuration
```

---

## Troubleshooting

### 1. 404 NOT_FOUND on `/api/auth/google` on Vercel
- **Cause**: Vercel was serving the project as a pure static site without serverless routing for Express.
- **Resolution**: Ensure `api/index.ts` and `vercel.json` are present in the repository root. `vercel.json` must rewrite `/api/(.*)` to `/api`.

### 2. Google OAuth Redirect URI Mismatch (`redirect_uri_mismatch`)
- **Cause**: The redirect URI registered in Google Cloud Console does not match the actual callback URL.
- **Resolution**: In Google Cloud Console under **OAuth 2.0 Client IDs**, verify that **Authorized redirect URIs** contains your exact domain:
  `https://your-project.vercel.app/api/auth/google/callback` (no trailing slash).

### 3. MongoDB Connection Failure
- **Cause**: Network access restriction or incorrect credentials in `MONGODB_URI`.
- **Resolution**:
  - In MongoDB Atlas, verify that **Network Access** allows `0.0.0.0/0`.
  - Ensure special characters in database passwords are URL-encoded.
  - Run `npm run test:backend` to confirm connectivity.

### 4. Missing Environment Variables on Vercel
- **Cause**: Variables configured locally in `.env` were not added to Vercel.
- **Resolution**: Navigate to **Project Settings → Environment Variables** in Vercel, add the required keys (`MONGODB_URI`, `JWT_SECRET`, `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), and trigger a redeployment.

### 5. Session Not Persisting After Login
- **Cause**: Browser blocking cross-site cookies or missing cookie attributes.
- **Resolution**: Verify that cookies are configured with `path: '/'`, `sameSite: 'lax'`, and `secure: true` in production HTTPS environments.

---

## License

Copyright © 2026 OLD-LETTERS. All rights reserved.
