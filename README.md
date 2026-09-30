# OLD-LETTERS

> *Some things are worth waiting for.*

OLD-LETTERS is a modern luxury digital correspondence platform designed around the emotional experience of writing, sealing, waiting, and receiving a letter. In a world saturated with ephemeral instant messaging and fleeting notifications, OLD-LETTERS restores the quiet patience, deliberate intention, and reverence of physical post to the digital realm.

Every letter penned on OLD-LETTERS is sealed in virtual wax and placed inside an unhurried delivery vault. It cannot be opened prematurely. When the appointed hour arrives, the recipient receives a confidential postal dispatch link protected by physical wax-seal mechanics, confidential ciphers, or one-time verification.

---

## The Core Experience

```
   WRITE  ─────────▶  SEAL  ─────────▶  WAIT  ─────────▶  ARRIVE
(Intention)        (Wax & Token)    (48h Vault)      (Unsealing)
```

1. **WRITE**: The sender chooses a tactile stationery sheet (Ivory Classical, Typewritten Sheet, Air Courier, Burgundy Velvet, Midnight Ink) and pens their thoughts with careful measure.
2. **SEAL**: The correspondence is stamped with a digital wax seal, assigned an archival tracking reference (e.g. `OL-1892-A`), and locked with an irreversible cryptographic delivery token.
3. **WAIT**: The letter enters the transit vault for a mandatory minimum of 48 hours (or a scheduled future date like 7 days, 30 days, or a custom anniversary). During this period, the letter is held in quiet trust.
4. **ARRIVE**: At the appointed time, the scheduler delivers an arrival dispatch to the recipient. The letter is unsealed only after authentication, private OTP verification, or entering a secret cipher passphrase.

---

## Table of Contents

1. [About OLD-LETTERS](#1-about-old-letters)
2. [Core Experience](#2-core-experience)
3. [Features](#3-features)
4. [Letter Types](#4-letter-types)
5. [Templates & Stationery](#5-templates--stationery)
6. [Delivery System](#6-delivery-system)
7. [Recipient Verification](#7-recipient-verification)
8. [Authentication System](#8-authentication-system)
9. [Google Sign-In](#9-google-sign-in)
10. [Paid Experiences](#10-paid-experiences)
11. [Manual UPI Payment System](#11-manual-upi-payment-system)
12. [Bureau Desk / Administration](#12-bureau-desk--administration)
13. [Technology Stack](#13-technology-stack)
14. [Architecture & Data Flow](#14-architecture--data-flow)
15. [MongoDB Collections](#15-mongodb-collections)
16. [API Structure](#16-api-structure)
17. [Environment Variables](#17-environment-variables)
18. [Local Development](#18-local-development)
19. [Google OAuth Setup](#19-google-oauth-setup)
20. [MongoDB Atlas Setup](#20-mongodb-atlas-setup)
21. [Resend Setup](#21-resend-setup)
22. [UPI Payment Setup](#22-upi-payment-setup)
23. [Vercel Deployment](#23-vercel-deployment)
24. [Security Architecture](#24-security-architecture)
25. [Project Structure](#25-project-structure)
26. [Testing](#26-testing)
27. [Future Features](#27-future-features)
28. [License](#28-license)

---

### 1. About OLD-LETTERS

OLD-LETTERS re-imagines digital correspondence as an intimate ceremonial act. Rather than encouraging rapid back-and-forth chatter, it introduces artificial latency—a mandatory minimum 48-hour delivery period. This intentional pause changes the writer's mindset, elevating ordinary text into meaningful keepsakes.

### 2. Core Experience

- **Physical Paper Presence**: Bespoke typography, realistic texture styling, authentic paper weight, margins, and custom wax seals.
- **Sealing Ceremony**: Visual animation where the paper folds, slides into a lined envelope, and receives a stamped wax emblem.
- **The 48-Hour Vault**: A strictly enforced waiting period where letters cannot be accelerated.
- **Recipient Reveal**: A private unsealing screen where recipients break the seal, enter their verification code, and read the letter in an immersive, quiet reading mode.

### 3. Features

- **Unhurried Delivery Engine**: Enforces delivery intervals of 48 hours, 7 days, 30 days, or bespoke calendar dates.
- **Private Envelope Architecture**: The recipient receives a unique link (`/letter/<secure-token>`). The actual content of the letter is never exposed in URL parameters or arrival emails.
- **Zero Content Leakage**: Letters remain encrypted/protected server-side until verified.
- **Reply Correspondence**: Recipients can pen reciprocal letters, creating an ongoing archival thread between two correspondents.
- **Sender Archives**: Senders can revisit their sent dispatches, track postal statuses, and inspect postmarks.

### 4. Letter Types

OLD-LETTERS curates correspondence prompts tailored for deliberate writing:
- **LOVE**: Unrushed confessions and deep declarations.
- **APOLOGY**: Humble words that require space and quiet reflection.
- **THANK YOU**: Honoring kindness that deserves permanent recognition.
- **I MISS YOU**: Bridges across physical distance and time zones.
- **FRIENDSHIP**: Celebrating enduring companionship over years.
- **BIRTHDAY**: Timeless tributes honoring another year of life.
- **CONFESSION**: Quiet truths intended for recipient eyes alone.
- **CONGRATULATIONS**: Saluting discipline, milestones, and perseverance.
- **ENCOURAGEMENT**: Steadfast warmth during seasons of doubt.
- **JUST BECAUSE**: Spontaneous appreciation without needing an occasion.
- **CUSTOM**: Blank canvas for bespoke correspondence.

### 5. Templates & Stationery

Each template combines authentic color theory, font pairings, and physical accents:
1. **Ivory Studio**: Clean warm off-white surface with sharp editorial serif typography and dark charcoal ink.
2. **Typewritten Sheet**: Crisp mechanical typewriter monospace on warm stone paper with black ribbon accents.
3. **Air Courier**: Modern aerogramme with signature blue and red aviation margins and editorial sans text.
4. **Muted Wine**: Aged ivory vellum with burgundy fountain ink and antique seal emblem.
5. **Midnight Ink**: Soft archival cream parchment inscribed with deep nocturnal indigo ink.
6. **Ruled Notebook**: Subtle feint ruled ledger lines with honest handwriting styling.
7. **Modern Ledger**: Contemporary architectural grid alignment for measured thought.
8. **Archival Mount**: Gallery mount cardstock with aperture for photographic enclosures.

### 6. Delivery System

The delivery engine runs on an automated cron architecture:
- Schedulers query letters whose `status === 'SCHEDULED'` and `deliveryDate <= current_time`.
- Uses **atomic MongoDB updates** (`findOneAndUpdate`) to guarantee strict idempotency—preventing double deliveries or duplicate emails.
- Generates high-entropy cryptographic delivery tokens via Node `crypto.randomBytes(32)`.
- Dispatches transactional arrival emails via **Resend** without exposing the letter body.

### 7. Recipient Verification

Before any letter body or media is decrypted, recipients verify their identity through one of three methods chosen by the sender:
- **DIRECT**: The recipient opens the secure link directly.
- **GMAIL OTP**: A 6-digit one-time code is dispatched via Resend to the recipient's registered Gmail/email. The code expires in 10 minutes and is locked after 5 failed attempts.
- **SECRET PASSPHRASE**: A confidential passphrase or cipher known only to the sender and recipient, hashed with `bcrypt` server-side.

### 8. Authentication System

The application features a built-in session authentication engine without third-party vendor lock-in:
- **Email + Password**: Hashed with `bcrypt` (10 rounds). Passwords are never logged or returned in responses.
- **Session Management**: Secure, signed HTTP-only cookies (`oldletters_session`) using JWT.
- **Strict Sender Ownership**: Letters created via `/api/letters` automatically inherit `senderId = req.user.id`. The client cannot spoof sender identities.

### 9. Google Sign-In

Integrated using Passport Google OAuth 2.0:
- When a user clicks **"Continue with Google"**, they are redirected to Google's consent screen.
- On callback, the backend validates their identity and looks up existing users by `googleId` or `email`.
- **Intelligent Account Linking**: If an email previously registered via email/password logs in with Google, the accounts are linked seamlessly and `authProvider` is updated to `"BOTH"`.

### 10. Paid Experiences

Senders can enrich their correspondence with intimate sensory features:
- **Voice Note (₹99)**: Private audio recording sealed inside the letter envelope.
- **Video Note (₹149)**: High-fidelity private video message embedded on archival paper.
- **Live Meeting / Salon (₹299)**: Private scheduled video ceremony to open the letter together.

### 11. Manual UPI Payment System

OLD-LETTERS uses India's Unified Payments Interface (UPI) for a human, deliberate payment flow:
1. The user selects a paid feature (Voice Note, Video Note, Live Meeting).
2. The Bureau displays an official UPI QR code and UPI ID (`oldletters@okhdfcbank`).
3. The user scans using any UPI app (Google Pay, PhonePe, Paytm, BHIM, CRED).
4. The user submits their **UTR / Reference Number** (and optional transaction screenshot).
5. The payment record is created in MongoDB with status strictly **`PENDING`**.
6. A Bureau postmaster verifies the bank reference manually and approves the feature.
7. Features are unlocked **only** upon server-side admin approval.

### 12. Bureau Desk / Administration

The Post Office Bureau Desk provides administrators with oversight:
- Review pending UPI transactions with UTR references and screenshots.
- Approve or reject payments with administrative notes.
- Inspect real-time delivery events and postal audit logs.
- Manually trigger delivery scheduler cycles.
- Protected server-side by `requireAdmin` middleware.

### 13. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion / Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, MongoDB Atlas native driver, Passport.js.
- **Security**: Bcrypt, JSON Web Tokens, HTTP-only secure cookies.
- **Emails**: Resend API.
- **Scheduling**: Vercel Cron / Express Scheduler Endpoint.

---

### 14. Architecture & Data Flow

```
                      +-------------------+
                      |   Client Browser  |
                      |   (Vite + React)  |
                      +---------+---------+
                                |
                     HTTP / JSON| Cookies
                                v
                      +-------------------+
                      | Express API Server|
                      |    (server.ts)    |
                      +----+---------+----+
                           |         |
         +-----------------+         +-----------------+
         |                                             |
         v                                             v
+-------------------+                         +-------------------+
|   MongoDB Atlas   |                         |  External APIs    |
+-------------------+                         +-------------------+
| • users           |                         | • Google OAuth    |
| • letters         |                         | • Resend Email    |
| • letterRecipients|                         | • UPI Gateway     |
| • deliveryTokens  |                         +-------------------+
| • otpCodes        |                                   ^
| • payments        |                                   |
| • paidFeatures    |                         +---------+---------+
| • deliveryEvents  |                         | Delivery Scheduler|
| • auditLogs       |                         |  (/api/scheduler) |
+-------------------+                         +-------------------+
```

#### Scheduler Execution Flow:
```
Scheduler Trigger (Vercel Cron / Internal Runner)
   ↓
Find status="SCHEDULED" & deliveryDate <= NOW
   ↓
Atomic findOneAndUpdate (status="DELIVERED") [Idempotency Guard]
   ↓
Generate 32-byte Cryptographic Token
   ↓
Store SHA-256(token) in deliveryTokens
   ↓
Dispatch Arrival Email via Resend with URL: /letter/<rawToken>
   ↓
Log LETTER_DELIVERED & RECIPIENT_EMAIL_SENT in deliveryEvents
```

---

### 15. MongoDB Collections

| Collection | Description | Primary Key / Unique Indexes |
|---|---|---|
| `users` | Correspondent profiles, credentials, auth providers | `_id`, `email` (unique), `googleId` (sparse unique) |
| `letters` | Core letters, stationery styling, postmarks, delivery dates | `_id`, `trackingCode` (unique), `senderId`, `status` |
| `letterRecipients`| Registered recipient name and email for each letter | `_id`, `letterId`, `email` |
| `letterTemplates` | Curated stationery configurations and emblems | `_id`, `slug` (unique) |
| `deliveryTokens` | Hashed delivery links (`SHA-256`) with expiry | `_id`, `tokenHash` (unique), `expiresAt` |
| `otpCodes` | 6-digit hashed verification codes with attempt limits | `_id`, `email`, `letterId`, `expiresAt` |
| `verificationAttempts` | Security rate limiting records | `_id`, `identifier` |
| `letterMedia` | Metadata and storage keys for private attachments | `_id`, `letterId`, `userId` |
| `payments` | UPI reference numbers, amounts, manual review status | `_id`, `status`, `userId`, `letterId` |
| `paidFeatures` | Unlocked sensory features tied to approved payments | `_id`, `paymentId`, `status` |
| `liveSessions` | Scheduled opening ceremonies and salons | `_id`, `letterId` |
| `notifications`| In-app correspondent dispatch alerts | `_id`, `userId` |
| `adminUsers` | Authorized bureau postal administrators | `_id`, `email` (unique) |
| `auditLogs` | Append-only security audit log of all bureau actions | `_id`, `timestamp`, `action` |

---

### 16. API Structure

#### Authentication
- `POST /api/auth/register` — Create new correspondent account with email & password.
- `POST /api/auth/login` — Sign in with email & password.
- `GET /api/auth/google` — Initiate Google OAuth 2.0 authentication.
- `GET /api/auth/google/callback` — Google OAuth redirect callback.
- `GET /api/auth/me` — Retrieve active session profile.
- `POST /api/auth/logout` — Terminate session and clear cookie.
- `POST /api/auth/request-otp` — Request 6-digit email sign-in code.
- `POST /api/auth/verify-otp` — Verify code and generate session.

#### Letters & Archive
- `GET /api/letters` — Fetch correspondent's private letter archive (requires authentication).
- `POST /api/letters` — Seal and post a letter (enforces 48-hour delivery minimum; binds `senderId`).
- `GET /api/letters/:id` — Retrieve single letter record with IDOR verification.
- `GET /api/templates` — List active stationery templates.

#### Recipient Experience
- `GET /api/delivery/token/:token` — Retrieve unsealed letter metadata (safely masks email; zero content returned).
- `POST /api/delivery/request-otp` — Dispatch verification code to recipient's email.
- `POST /api/delivery/verify` — Verify OTP or cipher passphrase to unlock and unseal letter body.

#### Payments & Bureau Desk
- `GET /api/config/payment` — Public UPI QR code and payment metadata.
- `POST /api/payments/create` — Submit manual UPI transaction reference (starts strictly as `PENDING`).
- `GET /api/payments` — View personal payment status.
- `GET /api/admin/payments` — Bureau administrator review desk (requires admin session).
- `POST /api/admin/payments/:id/approve` — Approve UPI payment & unlock feature.
- `POST /api/admin/payments/:id/reject` — Reject invalid reference & cancel feature.
- `GET /api/admin/audit-logs` — Read immutable bureau audit log.

#### Delivery Scheduler
- `POST /api/scheduler/tick` or `POST /api/cron/delivery` — Idempotent delivery runner (protected by `CRON_SECRET`).

---

### 17. Environment Variables

Create a `.env` file in the root directory:

```bash
# MongoDB Atlas Database Connection
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/old_letters?retryWrites=true&w=majority"
MONGODB_DB_NAME="old_letters"

# Server-Side Session & JWT Secret
SESSION_SECRET="your-strong-random-session-secret"

# Google OAuth 2.0 Credentials (Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Resend Transactional Email API (https://resend.com)
RESEND_API_KEY="re_123456789"
RESEND_FROM_EMAIL="post@old-letters.in"
ADMIN_EMAIL="admin@old-letters.in"

# Application Deployment URL
APP_URL="http://localhost:3000"

# Vercel Cron Delivery Scheduler Secret
CRON_SECRET="your-cron-secret-key"
ADMIN_SECRET="your-admin-secret-key"

# Manual UPI Payment Gateway Configuration
UPI_ID="oldletters@okhdfcbank"
UPI_DISPLAY_NAME="OLD-LETTERS CORRESPONDENCE"
PAYMENT_QR_URL="/assets/upi-qr.png"

# Private Object Storage
STORAGE_PROVIDER="cloudinary"
STORAGE_BUCKET=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
```

*Note: Never expose `MONGODB_URI`, `GOOGLE_CLIENT_SECRET`, or `RESEND_API_KEY` to client-side `VITE_` variables.*

---

### 18. Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in credentials.

3. **Seed Database**:
   ```bash
   npx tsx scripts/seed.ts
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### 19. Google OAuth Setup

To enable Google Sign-In:

1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `OLD-LETTERS`.
3. Navigate to **APIs & Services** → **OAuth consent screen**:
   - User Type: **External**
   - App Name: `OLD-LETTERS`
   - User Support Email & Developer Contact: Your email
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
4. Navigate to **Credentials** → **Create Credentials** → **OAuth Client ID**:
   - Application Type: **Web application**
   - Name: `OLD-LETTERS Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://oldletters.vercel.app` (your production URL)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://oldletters.vercel.app/api/auth/google/callback`
5. Copy the generated **Client ID** and **Client Secret** into your `.env`:
   ```bash
   GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="<your-client-secret>"
   GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"
   ```

---

### 20. MongoDB Atlas Setup

1. Create a free M0 or production cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Database Access**, create a database user with read and write privileges.
3. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere for Vercel serverless execution).
4. Click **Connect** → **Drivers** → select **Node.js** and copy the connection string.
5. Set `MONGODB_URI` and `MONGODB_DB_NAME="old_letters"` in `.env`.

---

### 21. Resend Setup

1. Create an account on [Resend](https://resend.com/).
2. Generate an API Key in the Resend dashboard.
3. Add and verify your custom sending domain (e.g. `old-letters.in`), or use `onboarding@resend.dev` for testing.
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env`.

---

### 22. UPI Payment Setup

1. Place your official UPI QR code image at `public/assets/upi-qr.png`.
2. Update `UPI_ID` (e.g. `oldletters@okhdfcbank`) and `UPI_DISPLAY_NAME` in `.env`.
3. Senders will scan the QR code in any UPI application and submit their transaction UTR reference for administrative approval.

---

### 23. Vercel Deployment

1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com/).
3. Add all environment variables from `.env.example` into Vercel Project Settings.
4. Ensure `vercel.json` contains the cron configuration for delivery dispatch:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/delivery",
         "schedule": "*/10 * * * *"
       }
     ]
   }
   ```
5. Deploy. Vercel will trigger the delivery endpoint every 10 minutes using `CRON_SECRET`.

---

### 24. Security Architecture

- **Password Hashing**: Bcrypt with salt rounds = 10.
- **Token Cryptography**: High-entropy 32-byte tokens generated using Node `crypto.randomBytes`. Stored only as `SHA-256` hashes in MongoDB.
- **Zero Content Leakage**: Content remains locked until verification succeeds.
- **Session Protection**: HTTP-only, `SameSite=Lax`, secure cookies.
- **IDOR Prevention**: Letters query only against `senderId === req.user.id`.
- **Server-Side Admin Validation**: Bureau mutations require authenticated admin session tokens.

---

### 25. Project Structure

```
├── components/
│   └── ui/
│       ├── demo.tsx             # Auth7 demo wrapper
│       └── index.tsx            # Auth7 component (Login / Signup / Google)
├── scripts/
│   ├── seed.ts                  # Stationery, admin, and Indian sample seed script
│   └── test-backend.ts          # End-to-end authentication and security test suite
├── src/
│   ├── assets/                  # Icons and visual assets
│   ├── components/
│   │   ├── admin/               # Bureau Desk & Payment Verification Modal
│   │   ├── archive/             # Sender Archive View
│   │   ├── auth/
│   │   │   ├── AuthModal.tsx    # Modal wrapper for Auth7
│   │   │   └── ProfileModal.tsx # Correspondent Seal & Profile Card
│   │   ├── common/              # LoadingScreen & shared primitives
│   │   ├── composer/            # 48-hour letter composer ceremony
│   │   ├── landing/             # Editorial hero and stationery showcase
│   │   ├── recipient/           # Unsealing ceremony, cipher & OTP verify
│   │   └── Navigation.tsx       # Header with subtle correspondent controls
│   ├── data/
│   │   └── mockData.ts          # Stationery templates & sample correspondence
│   ├── lib/
│   │   ├── api.ts               # Clean backend API client
│   │   ├── mongodb.ts           # Cached MongoDB Atlas connection & schemas
│   │   └── utils.ts             # Tailwind merge utility (cn)
│   ├── types/
│   │   ├── backend.ts           # Zod schemas and database record interfaces
│   │   └── letter.ts            # Letter, Template, and Attachment types
│   ├── App.tsx                  # Main router, auth gating, and state
│   ├── index.css                # Tailwind CSS v4 entry
│   └── main.tsx                 # React DOM mount point
├── .env.example                 # Environment configuration template
├── package.json                 # Project dependencies and build scripts
├── server.ts                    # Node/Express API with MongoDB and Passport
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite configuration
```

---

### 26. Testing

Run the automated integration test suite:

```bash
npx tsx scripts/test-backend.ts
```

The test suite validates:
1. Health check & MongoDB Atlas protocol verification.
2. Email + Password signup.
3. Duplicate account rejection.
4. Invalid password rejection (generic 401 message).
5. Valid credential login & session cookie issuance.
6. Session verification via `/api/auth/me`.
7. Session logout and cache clearing.
8. Route protection on `/api/letters` (blocks unauthenticated access).
9. Strict sender ID binding (prevents client spoofing).
10. Letter retrieval restricted strictly to authenticated owner.
11. Google OAuth flow & intelligent account linking (`authProvider = BOTH`).
12. Admin route protection (403 for regular users, 200 for postmasters).

---

### 27. Future Features

- **Parchment Wax Kits**: Physical wax seal stampers mailed to correspondents.
- **Calligraphy Recognition**: Inscribing digitized handwriting using stylus input.
- **Audio Vinyl Pressing**: Turning voice notes into physical phonograph records.

---

### 28. License

Copyright © 2026 OLD-LETTERS Correspondence Bureau. All rights reserved.
Licensed under the Apache-2.0 License.
