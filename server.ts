import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {
  sendMail,
  isEmailConfigured,
  SENDER_EMAIL,
  SENDER_NAME,
  logEmailDispatch,
  sendLetterDispatchedSenderEmail,
  sendLetterDispatchedRecipientEmail,
  sendHalfwaySenderEmail,
  sendHalfwayRecipientEmail,
  sendPreArrivalOtpRecipientEmail,
  sendArrivalRecipientEmail,
  sendPaymentSubmittedSenderEmail,
  sendPaymentApprovedEmail,
  sendPaymentIssueEmail,
} from './src/lib/email';
import {
  CreateLetterSchema,
  SubmitPaymentSchema,
  AdminVerifyPaymentSchema,
  RecipientVerifySchema,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from './src/types/backend';
import {
  getDb,
  setupDatabaseIndexes,
  isUsingAtlas,
  getSanitizedMongoUri,
  ObjectId,
  LetterDoc,
  UserDoc,
  DeliveryTokenDoc,
  OtpCodeDoc,
  PaymentDoc,
  PaidFeatureDoc,
  AuditLogDoc,
  DeliveryEventDoc,
  LetterRecipientDoc,
  LetterTemplateDoc,
  AdminUserDoc,
  LetterMediaDoc,
  uploadGridFSBuffer,
  downloadGridFSBuffer,
  deleteGridFSFile,
} from './src/lib/mongodb';
import { seedDatabase } from './scripts/seed';
import { ADMIN_EMAILS, isAdminEmail, isUserAdminRole } from './src/lib/admin';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'old-letters-super-confidential-secret-key-1892';
const CRON_SECRET = process.env.CRON_SECRET || 'old-letters-cron-secure-key-2026';

const getProductionAppUrl = (): string => {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }
  return `http://localhost:${PORT}`;
};

const APP_URL = getProductionAppUrl();

// Security Headers, Vercel Path Normalization & Request Parsers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restore path rewritten by Vercel serverless functions
  const forwardedUri = (req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-invoke-path']) as string | undefined;
  if (forwardedUri && forwardedUri.startsWith('/api') && !req.url.startsWith('/api')) {
    req.url = forwardedUri;
  } else if (!req.url.startsWith('/api') && (
    req.url.startsWith('/payments') ||
    req.url.startsWith('/letters') ||
    req.url.startsWith('/auth') ||
    req.url.startsWith('/admin') ||
    req.url.startsWith('/delivery') ||
    req.url.startsWith('/user') ||
    req.url.startsWith('/scheduler')
  )) {
    req.url = `/api${req.url}`;
  }

  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Ensure all /api responses default to application/json header unless redirecting or streaming
app.use('/api', (req, res, next) => {
  if (!req.path.includes('/auth/google') && !req.path.includes('/media/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

const adminEmail = process.env.ADMIN_EMAIL || 'admin@old-letters.in';

// Helpers
function hashSha256(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

// User Session Payload Interface
export interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
  role?: 'USER' | 'ADMIN';
  avatarUrl?: string;
  authProvider?: 'EMAIL' | 'GOOGLE' | 'BOTH';
  emailVerified?: boolean;
}

declare global {
  namespace Express {
    interface User extends SessionUser {}
    interface Request {
      user?: SessionUser;
    }
  }
}

export type AuthenticatedRequest = express.Request;

// Helper to determine production cookie security
function getCookieSecurity(req: express.Request): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (req.secure) return true;
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string' && forwardedProto.toLowerCase().includes('https')) return true;
  if (req.protocol === 'https') return true;
  if (req.hostname && !req.hostname.includes('localhost') && !req.hostname.includes('127.0.0.1')) {
    return true;
  }
  return false;
}

// Unified session cookie setter ensuring standard flags
function setSessionCookie(res: express.Response, req: express.Request, token: string) {
  const secure = getCookieSecurity(req);
  res.cookie('oldletters_session', token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: 30 * 24 * 3600 * 1000,
    path: '/',
  });

  // Client-accessible presence indicator cookie
  res.cookie('oldletters_logged_in', '1', {
    httpOnly: false,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: 30 * 24 * 3600 * 1000,
    path: '/',
  });
}

function clearSessionCookie(res: express.Response, req: express.Request) {
  const secure = getCookieSecurity(req);
  res.clearCookie('oldletters_session', { path: '/', secure, sameSite: secure ? 'none' : 'lax' });
  res.clearCookie('oldletters_logged_in', { path: '/', secure, sameSite: secure ? 'none' : 'lax' });
}

// Token Extraction & Session Authentication Middleware
const authenticateToken: express.RequestHandler = (req, res, next) => {
  let token =
    req.cookies?.oldletters_session ||
    req.cookies?.['oldletters_session'] ||
    req.cookies?.token ||
    req.cookies?.session;

  // Fallback to manual parsing if cookieParser didn't catch the cookie header
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)(?:oldletters_session|token|session)=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1].trim());
    }
  }

  // Fallback to Bearer token header
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.replace(/^Bearer\s+/i, '').trim();
  }

  // Fallback to query param token (essential for <audio src="..."> / <video src="..."> preview elements)
  if (!token && req.query && typeof req.query.token === 'string') {
    token = (req.query.token as string).trim();
  }

  if (token && typeof token === 'string') {
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
  } catch {
    // Invalid token, leave req.user undefined
  }
  next();
};

app.use(authenticateToken);

// Require Authentication Middleware
const requireAuth: express.RequestHandler = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Authentication required. Please sign in to access your correspondence.',
    });
  }
  next();
};

// Admin Verification Helper (Strict Server-Side Only)
async function verifyAdminServerSide(req: express.Request): Promise<boolean> {
  // Must have an authenticated user with verified identity
  if (!req.user || !req.user.id || !req.user.email) {
    return false;
  }

  const cleanEmail = req.user.email.trim().toLowerCase();

  // 1. Check if email is in the admin allowlist (e.g. poosala15@gmail.com, oldletters.mailroom@gmail.com)
  if (isAdminEmail(cleanEmail)) {
    return true;
  }

  // 2. Check if user's JWT session role is ADMIN
  if (isUserAdminRole(req.user.role)) {
    return true;
  }

  // 3. Check MongoDB user record for persistent admin role
  try {
    const db = await getDb();
    const usersColl = db.collection('users');
    let userDoc = null;
    if (ObjectId.isValid(req.user.id)) {
      userDoc = await usersColl.findOne({ _id: new ObjectId(req.user.id) });
    }
    if (!userDoc) {
      userDoc = await usersColl.findOne({ email: cleanEmail });
    }
    if (userDoc && isUserAdminRole(userDoc.role)) {
      return true;
    }

    // 4. Check adminUsers collection
    const adminColl = db.collection('adminUsers');
    const adminRec = await adminColl.findOne({ email: cleanEmail });
    if (adminRec) {
      return true;
    }
  } catch (err) {
    console.warn('[OLD-LETTERS Admin verification warning]', err);
  }

  return false;
}

// Require Admin Middleware
const requireAdmin: express.RequestHandler = async (req, res, next) => {
  // 1. Verify normal authenticated session. Return 401 for unauthenticated users.
  if (!req.user || !req.user.id || !req.user.email) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Authentication required. Please sign in to access bureau administrative controls.',
    });
  }

  // 2. Resolve the authenticated user and verify admin role / authorized admin email.
  const isAdmin = await verifyAdminServerSide(req);

  // 3. Return HTTP 403 for authenticated non-admin users.
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Bureau administrative privileges required.',
    });
  }

  next();
};

// Rate Limiting Bucket
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count += 1;
  return true;
}

// ====================================================================
// GOOGLE OAUTH 2.0 CONFIGURATION (Passport Strategy)
// ====================================================================
function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL?.trim() || `${APP_URL}/api/auth/google/callback`;
  return { clientId, clientSecret, callbackUrl };
}

let googleStrategyConfigured = false;
function ensureGoogleStrategy(): boolean {
  const { clientId, clientSecret, callbackUrl } = getGoogleOAuthConfig();
  if (!clientId || !clientSecret) {
    return false;
  }
  if (googleStrategyConfigured) {
    return true;
  }

  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: clientId,
          clientSecret: clientSecret,
          callbackURL: callbackUrl,
          proxy: true,
          passReqToCallback: true,
        },
        async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!email) {
              return done(new Error('No email found in Google profile'), undefined);
            }

            // Extract explicit pre-authentication consent from session cookie or OAuth state
            let consentData: any = null;
            if (req.cookies?.oldletters_oauth_consent) {
              try {
                consentData = typeof req.cookies.oldletters_oauth_consent === 'string'
                  ? JSON.parse(req.cookies.oldletters_oauth_consent)
                  : req.cookies.oldletters_oauth_consent;
              } catch {}
            }
            if (!consentData && req.query?.state) {
              try {
                const rawState = Buffer.from(String(req.query.state), 'base64').toString('utf8');
                consentData = JSON.parse(rawState);
              } catch {}
            }

            const hasExplicitConsent = Boolean(
              consentData &&
              consentData.termsAccepted === true &&
              consentData.privacyAccepted === true
            );

            const db = await getDb();
            const usersColl = db.collection('users');
            const now = new Date();

            // 1. Check if user already exists by googleId
            let user = await usersColl.findOne({ googleId: profile.id });
            if (user) {
              const consentValid = hasExplicitConsent || (user.termsAccepted && user.privacyAccepted && user.termsVersion === CURRENT_TERMS_VERSION);
              if (!consentValid) {
                return done(new Error('CONSENT_REQUIRED'), undefined);
              }

              const role = isAdminEmail(user.email) ? 'ADMIN' : (user.role || 'USER');
              const updateFields: any = { lastLoginAt: now, updatedAt: now, role };
              if (hasExplicitConsent) {
                updateFields.termsAccepted = true;
                updateFields.privacyAccepted = true;
                updateFields.termsVersion = consentData.termsVersion || CURRENT_TERMS_VERSION;
                updateFields.privacyVersion = consentData.privacyVersion || CURRENT_PRIVACY_VERSION;
                updateFields.legalConsentAt = user.legalConsentAt || now;
              }
              await usersColl.updateOne({ _id: user._id }, { $set: updateFields });
              return done(null, {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                role,
                authProvider: user.authProvider || 'GOOGLE',
                emailVerified: true,
              });
            }

            // 2. Check if user exists by email -> Intelligently Link Google ID!
            user = await usersColl.findOne({ email });
            if (user) {
              const consentValid = hasExplicitConsent || (user.termsAccepted && user.privacyAccepted && user.termsVersion === CURRENT_TERMS_VERSION);
              if (!consentValid) {
                return done(new Error('CONSENT_REQUIRED'), undefined);
              }

              const role = isAdminEmail(email) ? 'ADMIN' : (user.role || 'USER');
              const updateFields: any = {
                googleId: profile.id,
                authProvider: 'BOTH',
                emailVerified: true,
                lastLoginAt: now,
                updatedAt: now,
                role,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
              };
              if (hasExplicitConsent) {
                updateFields.termsAccepted = true;
                updateFields.privacyAccepted = true;
                updateFields.termsVersion = consentData.termsVersion || CURRENT_TERMS_VERSION;
                updateFields.privacyVersion = consentData.privacyVersion || CURRENT_PRIVACY_VERSION;
                updateFields.legalConsentAt = user.legalConsentAt || now;
              }
              await usersColl.updateOne({ _id: user._id }, { $set: updateFields });
              return done(null, {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                role,
                authProvider: 'BOTH',
                emailVerified: true,
              });
            }

            // 3. New Google User -> STRICTLY REQUIRE EXPLICIT CONSENT
            if (!hasExplicitConsent) {
              return done(new Error('CONSENT_REQUIRED'), undefined);
            }

            const newUserId = new ObjectId();
            const newUserRole = isAdminEmail(email) ? 'ADMIN' : 'USER';
            const newUser: UserDoc = {
              _id: newUserId,
              email,
              fullName: profile.displayName || email.split('@')[0],
              avatarUrl: profile.photos?.[0]?.value,
              authProvider: 'GOOGLE',
              googleId: profile.id,
              role: newUserRole,
              emailVerified: true,
              termsAccepted: true,
              privacyAccepted: true,
              termsVersion: consentData.termsVersion || CURRENT_TERMS_VERSION,
              privacyVersion: consentData.privacyVersion || CURRENT_PRIVACY_VERSION,
              legalConsentAt: now,
              createdAt: now,
              updatedAt: now,
              lastLoginAt: now,
            };
            await usersColl.insertOne(newUser);
            return done(null, {
              id: newUserId.toString(),
              email: newUser.email,
              fullName: newUser.fullName,
              avatarUrl: newUser.avatarUrl,
              role: newUser.role,
              authProvider: 'GOOGLE',
              emailVerified: true,
            });
          } catch (err) {
            return done(err as any, undefined);
          }
        }
      )
    );
    googleStrategyConfigured = true;
    return true;
  } catch (err) {
    console.error('[Google OAuth Setup Error]', err);
    return false;
  }
}

// Initial strategy registration attempt
ensureGoogleStrategy();

// ====================================================================
// API ROUTES
// ====================================================================

// 1. Health & Config
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    backend: 'mongodb-atlas',
    atlasConnected: isUsingAtlas(),
    emailConfigured: isEmailConfigured(),
    googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    database: 'MongoDB Atlas Protocol',
  });
});

// Public UPI QR and Payment config
app.get('/api/config/payment', (req, res) => {
  res.json({
    upiId: process.env.UPI_ID || 'oldletters@okhdfcbank',
    upiDisplayName: process.env.UPI_DISPLAY_NAME || 'OLD-LETTERS CORRESPONDENCE',
    paymentQrUrl: process.env.PAYMENT_QR_URL || '/assets/upi-qr.png',
  });
});

// ====================================================================
// AUTHENTICATION ROUTES (Email/Password, Google OAuth, Sessions)
// ====================================================================

// Current Authenticated User Session
app.get(['/api/auth/me', '/api/me', '/auth/me'], async (req: AuthenticatedRequest, res) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  if (!req.user || !req.user.id) {
    return res.json({ authenticated: false, user: null });
  }

  let userDoc: any = null;
  let lettersCount = 0;

  try {
    const db = await getDb();
    const usersColl = db.collection('users');
    const lettersColl = db.collection('letters');

    if (req.user.id) {
      try {
        if (ObjectId.isValid(req.user.id)) {
          userDoc = await usersColl.findOne({ _id: new ObjectId(req.user.id) });
        }
      } catch {}

      if (!userDoc) {
        try {
          userDoc = await usersColl.findOne({ _id: req.user.id as any });
        } catch {}
      }
    }

    if (!userDoc && req.user.email) {
      try {
        userDoc = await usersColl.findOne({ email: req.user.email.toLowerCase() });
      } catch {}
    }

    // If not found in DB but JWT is cryptographically verified, restore user doc
    if (!userDoc && req.user.email) {
      try {
        const now = new Date();
        const restoredUser: UserDoc = {
          _id: req.user.id && ObjectId.isValid(req.user.id) ? new ObjectId(req.user.id) : new ObjectId(),
          email: req.user.email.toLowerCase(),
          fullName: req.user.fullName || req.user.email.split('@')[0] || 'Correspondent',
          avatarUrl: req.user.avatarUrl,
          role: req.user.role || (isAdminEmail(req.user.email) ? 'ADMIN' : 'USER'),
          authProvider: req.user.authProvider || 'GOOGLE',
          emailVerified: req.user.emailVerified ?? true,
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          legalConsentAt: now,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        };
        await usersColl.insertOne(restoredUser);
        userDoc = restoredUser;
      } catch {}
    }

    if (userDoc && isAdminEmail(userDoc.email) && userDoc.role !== 'ADMIN') {
      try {
        await usersColl.updateOne({ _id: userDoc._id }, { $set: { role: 'ADMIN' } });
        userDoc.role = 'ADMIN';
      } catch {}
    }

    if (lettersColl) {
      try {
        lettersCount = await lettersColl.countDocuments({
          $or: [
            { senderId: userDoc?._id?.toString() || req.user.id },
            { senderId: userDoc?._id || req.user.id },
            { senderEmail: req.user.email },
          ],
        });
      } catch {}
    }
  } catch (err) {
    console.warn('[OLD-LETTERS auth/me notice]:', err);
  }

  const effectiveRole = (userDoc?.role === 'ADMIN' || isAdminEmail(userDoc?.email || req.user.email))
    ? 'ADMIN'
    : (userDoc?.role || req.user.role || 'USER');

  const resolvedUser = {
    id: userDoc?._id ? userDoc._id.toString() : req.user.id,
    email: userDoc?.email || req.user.email,
    fullName: userDoc?.fullName || req.user.fullName || req.user.email?.split('@')[0] || 'Correspondent',
    avatarUrl: userDoc?.avatarUrl || req.user.avatarUrl,
    role: effectiveRole,
    authProvider: userDoc?.authProvider || req.user.authProvider || 'GOOGLE',
    emailVerified: userDoc?.emailVerified ?? req.user.emailVerified ?? true,
    googleLinked: !!userDoc?.googleId || req.user.authProvider === 'GOOGLE' || req.user.authProvider === 'BOTH',
    termsAccepted: userDoc?.termsAccepted ?? false,
    privacyAccepted: userDoc?.privacyAccepted ?? false,
    termsVersion: userDoc?.termsVersion || undefined,
    privacyVersion: userDoc?.privacyVersion || undefined,
    legalConsentAt: userDoc?.legalConsentAt ? (typeof userDoc.legalConsentAt === 'string' ? userDoc.legalConsentAt : userDoc.legalConsentAt.toISOString()) : undefined,
    createdAt: userDoc?.createdAt ? (typeof userDoc.createdAt === 'string' ? userDoc.createdAt : userDoc.createdAt.toISOString()) : undefined,
    lettersCount,
  };

  return res.json({
    authenticated: true,
    user: resolvedUser,
  });
});

// Email + Password Registration / Signup
app.post(['/api/auth/register', '/api/auth/signup', '/auth/register', '/auth/signup'], async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '').trim();
    const fullName = String(req.body.fullName || '').trim() || 'Correspondent';

    // Legal Consent Verification: Checkbox MUST be explicitly checked
    const termsAccepted = req.body.termsAccepted === true || req.body.termsAccepted === 'true';
    const privacyAccepted = req.body.privacyAccepted === true || req.body.privacyAccepted === 'true';

    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the Terms of Service and Privacy Policy to create an account.',
      });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    if (!checkRateLimit(`register:${email}`, 6, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Too many registration attempts. Please try again later.' });
    }

    const db = await getDb();
    const usersColl = db.collection('users');

    const existing = await usersColl.findOne({ email });
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    if (existing) {
      // If user previously signed up via Google with no local password, link and set password!
      if (existing.authProvider === 'GOOGLE' && !existing.passwordHash) {
        await usersColl.updateOne(
          { _id: existing._id },
          {
            $set: {
              passwordHash,
              authProvider: 'BOTH',
              fullName: existing.fullName || fullName,
              termsAccepted: true,
              privacyAccepted: true,
              termsVersion: req.body.termsVersion || CURRENT_TERMS_VERSION,
              privacyVersion: req.body.privacyVersion || CURRENT_PRIVACY_VERSION,
              legalConsentAt: existing.legalConsentAt || now,
              updatedAt: now,
              lastLoginAt: now,
            },
          }
        );
        const userPayload = {
          id: existing._id.toString(),
          email: existing.email,
          fullName: existing.fullName || fullName,
          role: isAdminEmail(existing.email) ? 'ADMIN' : (existing.role || 'USER'),
          authProvider: 'BOTH' as const,
          emailVerified: true,
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: req.body.termsVersion || CURRENT_TERMS_VERSION,
          privacyVersion: req.body.privacyVersion || CURRENT_PRIVACY_VERSION,
        };
        const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
        setSessionCookie(res, req, sessionToken);
        return res.json({ success: true, token: sessionToken, user: userPayload });
      }

      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const newUserId = new ObjectId();
    const newUserRole = isAdminEmail(email) ? 'ADMIN' : 'USER';
    const newUser: UserDoc = {
      _id: newUserId,
      fullName,
      email,
      passwordHash,
      authProvider: 'EMAIL',
      role: newUserRole,
      emailVerified: false,
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: req.body.termsVersion || CURRENT_TERMS_VERSION,
      privacyVersion: req.body.privacyVersion || CURRENT_PRIVACY_VERSION,
      legalConsentAt: now,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    await usersColl.insertOne(newUser);

    const userPayload = {
      id: newUserId.toString(),
      email,
      fullName,
      role: newUser.role,
      authProvider: 'EMAIL' as const,
      emailVerified: false,
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion: newUser.termsVersion,
      privacyVersion: newUser.privacyVersion,
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
    setSessionCookie(res, req, sessionToken);
    res.json({ success: true, token: sessionToken, user: userPayload });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Email + Password Login
app.post(['/api/auth/login', '/auth/login'], async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required.' });
    }

    if (!checkRateLimit(`login:${email}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Too many login attempts. Please wait 15 minutes.' });
    }

    const db = await getDb();
    const usersColl = db.collection('users');

    const user = await usersColl.findOne({ email });
    if (!user || !user.passwordHash) {
      // Generic invalid credentials message to prevent user enumeration
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const now = new Date();
    let userRole = user.role || 'USER';
    if (isAdminEmail(email)) {
      userRole = 'ADMIN';
      await usersColl.updateOne(
        { _id: user._id },
        { $set: { role: 'ADMIN', lastLoginAt: now, updatedAt: now } }
      );
    } else {
      await usersColl.updateOne({ _id: user._id }, { $set: { lastLoginAt: now, updatedAt: now } });
    }

    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: userRole,
      authProvider: user.authProvider || 'EMAIL',
      emailVerified: user.emailVerified ?? false,
      termsAccepted: user.termsAccepted ?? false,
      privacyAccepted: user.privacyAccepted ?? false,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion,
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
    setSessionCookie(res, req, sessionToken);
    res.json({ success: true, token: sessionToken, user: userPayload });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Google OAuth Initiation
app.get(['/api/auth/google', '/auth/google'], (req, res, next) => {
  const isConfigured = ensureGoogleStrategy();
  if (!isConfigured) {
    if (req.accepts('html')) {
      return res.redirect('/?auth=google_not_configured');
    }
    return res.status(503).json({
      success: false,
      error: 'Google sign-in is not configured yet. Please use email and password.',
    });
  }

  // Legal Consent Check: User MUST accept Terms of Service & Privacy Policy before initiating Google authentication
  const consentGiven = req.query.consent === 'true' || req.query.consent === '1';
  if (!consentGiven) {
    if (req.accepts('html')) {
      return res.redirect('/?auth=consent_required');
    }
    return res.status(400).json({
      success: false,
      error: 'Consent to Terms of Service and Privacy Policy is required before continuing with Google.',
    });
  }

  const consentPayload = {
    termsAccepted: true,
    privacyAccepted: true,
    termsVersion: (req.query.termsVersion as string) || CURRENT_TERMS_VERSION,
    privacyVersion: (req.query.privacyVersion as string) || CURRENT_PRIVACY_VERSION,
    timestamp: Date.now(),
  };

  res.cookie('oldletters_oauth_consent', JSON.stringify(consentPayload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  const state = Buffer.from(JSON.stringify(consentPayload)).toString('base64');
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state,
  })(req, res, next);
});

// Google OAuth Callback
app.get(['/api/auth/google/callback', '/auth/google/callback'], (req, res, next) => {
  const isConfigured = ensureGoogleStrategy();
  if (!isConfigured) {
    if (req.accepts('html')) {
      return res.redirect('/?auth=google_not_configured');
    }
    return res.status(503).json({
      success: false,
      error: 'Google sign-in is not configured yet. Please use email and password.',
    });
  }

  passport.authenticate('google', { session: false }, (err: any, user: any) => {
    res.clearCookie('oldletters_oauth_consent');

    if (err || !user) {
      if (err?.message === 'CONSENT_REQUIRED') {
        if (req.accepts('html')) {
          return res.redirect('/?auth=consent_required');
        }
        return res.status(400).json({
          success: false,
          error: 'You must agree to the Terms of Service and Privacy Policy before continuing with Google.',
        });
      }
      console.error('[Google OAuth Error]', err);
      if (req.accepts('html')) {
        return res.redirect('/?auth=error');
      }
      return res.status(401).json({
        success: false,
        error: 'Google authentication failed. Please try again.',
      });
    }

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
    // Set standard production-safe HTTP-only session cookie
    setSessionCookie(res, req, token);

    // Provide safe user payload in the redirect URL for immediate, synchronous frontend state hydration
    const safeUser = {
      id: user.id || user._id?.toString(),
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role || 'USER',
      authProvider: user.authProvider || 'GOOGLE',
      emailVerified: true,
      termsAccepted: user.termsAccepted ?? true,
      privacyAccepted: user.privacyAccepted ?? true,
      termsVersion: user.termsVersion || CURRENT_TERMS_VERSION,
      privacyVersion: user.privacyVersion || CURRENT_PRIVACY_VERSION,
    };
    const userParam = encodeURIComponent(JSON.stringify(safeUser));

    res.redirect(`/?auth=google_success&token=${encodeURIComponent(token)}&u=${userParam}`);
  })(req, res, next);
});

// Update Policy Consent (For logged-in users when policy versions update)
app.post(['/api/auth/consent', '/auth/consent'], async (req, res) => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.id) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const { termsAccepted, privacyAccepted, termsVersion, privacyVersion } = req.body;
    if (termsAccepted !== true || privacyAccepted !== true) {
      return res.status(400).json({ success: false, error: 'Terms and Privacy must both be accepted.' });
    }

    const db = await getDb();
    const usersColl = db.collection('users');
    const now = new Date();
    await usersColl.updateOne(
      { _id: new ObjectId(userPayload.id) },
      {
        $set: {
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: termsVersion || CURRENT_TERMS_VERSION,
          privacyVersion: privacyVersion || CURRENT_PRIVACY_VERSION,
          legalConsentAt: now,
          updatedAt: now,
        },
      }
    );
    res.json({ success: true, message: 'Legal consent updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Google Sign-In Testing / Direct Verification Endpoint
app.post('/api/auth/google/test-login', async (req, res) => {
  try {
    const {
      email,
      googleId,
      fullName,
      avatarUrl,
      termsAccepted,
      privacyAccepted,
      termsVersion,
      privacyVersion,
    } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ success: false, error: 'Email and googleId required for verification.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = await getDb();
    const usersColl = db.collection('users');
    const now = new Date();

    let user = await usersColl.findOne({ googleId });
    if (!user) {
      user = await usersColl.findOne({ email: cleanEmail });
    }

    const hasExplicitConsent = termsAccepted === true && privacyAccepted === true;

    // Strict Server-Side Validation: If user does not exist yet, explicit consent is strictly mandatory!
    if (!user && !hasExplicitConsent) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the Terms of Service and Privacy Policy before creating an account with Google.',
      });
    }

    if (user) {
      const role = isAdminEmail(cleanEmail) ? 'ADMIN' : (user.role || 'USER');
      const updateFields: any = {
        lastLoginAt: now,
        updatedAt: now,
        googleId,
        role,
        authProvider: user.passwordHash ? 'BOTH' : 'GOOGLE',
        avatarUrl: user.avatarUrl || avatarUrl,
      };
      if (hasExplicitConsent) {
        updateFields.termsAccepted = true;
        updateFields.privacyAccepted = true;
        updateFields.termsVersion = termsVersion || CURRENT_TERMS_VERSION;
        updateFields.privacyVersion = privacyVersion || CURRENT_PRIVACY_VERSION;
        updateFields.legalConsentAt = user.legalConsentAt || now;
      }
      await usersColl.updateOne({ _id: user._id }, { $set: updateFields });
      user = await usersColl.findOne({ _id: user._id });
    } else {
      const newUserId = new ObjectId();
      const newUserRole = isAdminEmail(cleanEmail) ? 'ADMIN' : 'USER';
      const newUser: UserDoc = {
        _id: newUserId,
        email: cleanEmail,
        fullName: fullName || cleanEmail.split('@')[0],
        avatarUrl,
        authProvider: 'GOOGLE',
        googleId,
        role: newUserRole,
        emailVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: termsVersion || CURRENT_TERMS_VERSION,
        privacyVersion: privacyVersion || CURRENT_PRIVACY_VERSION,
        legalConsentAt: now,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      await usersColl.insertOne(newUser);
      user = newUser;
    }

    const userPayload = {
      id: user!._id.toString(),
      email: user!.email,
      fullName: user!.fullName,
      role: isAdminEmail(cleanEmail) ? 'ADMIN' : (user!.role || 'USER'),
      authProvider: user!.authProvider,
      emailVerified: user!.emailVerified,
      termsAccepted: user!.termsAccepted ?? true,
      privacyAccepted: user!.privacyAccepted ?? true,
      termsVersion: user!.termsVersion || CURRENT_TERMS_VERSION,
      privacyVersion: user!.privacyVersion || CURRENT_PRIVACY_VERSION,
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
    setSessionCookie(res, req, sessionToken);

    res.json({ success: true, user: userPayload, token: sessionToken });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout
app.post(['/api/auth/logout', '/auth/logout'], (req, res) => {
  clearSessionCookie(res, req);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ====================================================================
// USER CORRESPONDENCE BUREAU & PROFILE MANAGEMENT
// ====================================================================

// Bureau Summary Statistics (Aggregated from real MongoDB data)
app.get(['/api/user/bureau-summary', '/api/bureau/summary'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');
    const paymentsColl = db.collection('payments');
    const usersColl = db.collection('users');

    const userId = req.user!.id;
    const userEmail = (req.user!.email || '').toLowerCase();

    // 1. Sent Letters Count (letters penned by this user)
    const sentCount = await lettersColl.countDocuments({
      $or: [
        { senderId: userId },
        ...(ObjectId.isValid(userId) ? [{ senderId: new ObjectId(userId) }] : []),
        { senderEmail: userEmail },
      ],
    });

    // 2. Received Letters Count (letters addressed to this user's email)
    const recipientRecords = await recipientsColl.find({ email: userEmail }).toArray();
    const recipientLetterIds = recipientRecords.map((r: any) => r.letterId);
    const receivedCount = await lettersColl.countDocuments({
      $or: [
        { recipientEmail: userEmail },
        ...(recipientLetterIds.length > 0
          ? [{ _id: { $in: recipientLetterIds.map((id: any) => (typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id)) } }]
          : []),
      ],
    });

    // 3. In Transit Count
    const now = new Date();
    const sentInTransit = await lettersColl.countDocuments({
      $or: [
        { senderId: userId },
        ...(ObjectId.isValid(userId) ? [{ senderId: new ObjectId(userId) }] : []),
        { senderEmail: userEmail },
      ],
      status: { $in: ['SCHEDULED', 'IN_TRANSIT'] },
      deliveryDate: { $gt: now },
    });

    const receivedInTransit = await lettersColl.countDocuments({
      $or: [
        { recipientEmail: userEmail },
        ...(recipientLetterIds.length > 0
          ? [{ _id: { $in: recipientLetterIds.map((id: any) => (typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id)) } }]
          : []),
      ],
      deliveryDate: { $gt: now },
    });
    const inTransitCount = sentInTransit + receivedInTransit;

    // 4. Delivered Count
    const sentDelivered = await lettersColl.countDocuments({
      $or: [
        { senderId: userId },
        ...(ObjectId.isValid(userId) ? [{ senderId: new ObjectId(userId) }] : []),
        { senderEmail: userEmail },
      ],
      status: { $in: ['DELIVERED', 'OPENED'] },
    });

    const receivedDelivered = await lettersColl.countDocuments({
      $or: [
        { recipientEmail: userEmail },
        ...(recipientLetterIds.length > 0
          ? [{ _id: { $in: recipientLetterIds.map((id: any) => (typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id)) } }]
          : []),
      ],
      status: { $in: ['DELIVERED', 'OPENED'] },
    });
    const deliveredCount = sentDelivered + receivedDelivered;

    // 5. Total Amount Spent (sum of approved/paid payments for this user)
    const payments = await paymentsColl.find({
      $or: [
        { userId: userId },
        ...(ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : []),
      ],
      status: { $in: ['APPROVED', 'PAID'] },
    }).toArray();
    const totalSpent = payments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);

    // Fetch user document
    let userDoc: any = null;
    if (ObjectId.isValid(userId)) {
      userDoc = await usersColl.findOne({ _id: new ObjectId(userId) });
    }
    if (!userDoc) {
      userDoc = await usersColl.findOne({ email: userEmail });
    }

    res.json({
      success: true,
      stats: {
        sentCount,
        receivedCount,
        inTransitCount,
        deliveredCount,
        totalSpent,
      },
      user: {
        id: userDoc?._id ? userDoc._id.toString() : userId,
        email: userDoc?.email || req.user!.email,
        fullName: userDoc?.fullName || req.user!.fullName || req.user!.email?.split('@')[0] || 'Correspondent',
        avatarUrl: userDoc?.avatarUrl || req.user!.avatarUrl,
        role: userDoc?.role || req.user!.role || 'USER',
        authProvider: userDoc?.authProvider || req.user!.authProvider || 'EMAIL',
        googleLinked: !!userDoc?.googleId || req.user!.authProvider === 'GOOGLE' || req.user!.authProvider === 'BOTH',
        status: userDoc?.status || 'ACTIVE',
        termsAccepted: userDoc?.termsAccepted ?? true,
        privacyAccepted: userDoc?.privacyAccepted ?? true,
        termsVersion: userDoc?.termsVersion || CURRENT_TERMS_VERSION,
        privacyVersion: userDoc?.privacyVersion || CURRENT_PRIVACY_VERSION,
        legalConsentAt: userDoc?.legalConsentAt
          ? (typeof userDoc.legalConsentAt === 'string' ? userDoc.legalConsentAt : userDoc.legalConsentAt.toISOString())
          : (userDoc?.createdAt ? (typeof userDoc.createdAt === 'string' ? userDoc.createdAt : userDoc.createdAt.toISOString()) : new Date().toISOString()),
        createdAt: userDoc?.createdAt
          ? (typeof userDoc.createdAt === 'string' ? userDoc.createdAt : userDoc.createdAt.toISOString())
          : new Date().toISOString(),
        hasPassword: !!userDoc?.passwordHash,
        notificationPreferences: userDoc?.notificationPreferences || {
          letterDispatched: true,
          deliveryUpdates: true,
          preArrival: true,
          arrival: true,
          paymentUpdates: true,
        },
      },
    });
  } catch (err: any) {
    console.error('Error fetching bureau summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Profile (Full Name, Avatar URL)
app.put(['/api/user/profile', '/api/profile'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const avatarUrl = req.body.avatarUrl !== undefined ? String(req.body.avatarUrl).trim() : undefined;

    if (!fullName) {
      return res.status(400).json({ success: false, error: 'Full name cannot be blank.' });
    }

    const db = await getDb();
    const usersColl = db.collection('users');
    const userId = req.user!.id;

    const updateFields: any = {
      fullName,
      updatedAt: new Date(),
    };
    if (avatarUrl !== undefined) {
      updateFields.avatarUrl = avatarUrl;
    }

    let filter: any = { _id: userId };
    if (ObjectId.isValid(userId)) {
      filter = { _id: new ObjectId(userId) };
    }

    await usersColl.updateOne(filter, { $set: updateFields });

    req.user!.fullName = fullName;
    if (avatarUrl !== undefined) req.user!.avatarUrl = avatarUrl;
    const updatedUserPayload = {
      id: userId,
      email: req.user!.email,
      fullName,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : req.user!.avatarUrl,
      role: req.user!.role,
      authProvider: req.user!.authProvider,
    };
    const sessionToken = jwt.sign(updatedUserPayload, JWT_SECRET, { expiresIn: '30d' });
    setSessionCookie(res, req, sessionToken);

    res.json({
      success: true,
      message: 'Correspondent profile updated.',
      user: {
        id: userId,
        email: req.user!.email,
        fullName,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : req.user!.avatarUrl,
        role: req.user!.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Notification Preferences
app.put(['/api/user/preferences', '/api/preferences'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const prefs = req.body.preferences || req.body;
    if (!prefs || typeof prefs !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid preferences format.' });
    }

    const validPrefs = {
      letterDispatched: prefs.letterDispatched !== false,
      deliveryUpdates: prefs.deliveryUpdates !== false,
      preArrival: prefs.preArrival !== false,
      arrival: prefs.arrival !== false,
      paymentUpdates: prefs.paymentUpdates !== false,
    };

    const db = await getDb();
    const usersColl = db.collection('users');
    const userId = req.user!.id;

    let filter: any = { _id: userId };
    if (ObjectId.isValid(userId)) {
      filter = { _id: new ObjectId(userId) };
    }

    await usersColl.updateOne(filter, {
      $set: {
        notificationPreferences: validPrefs,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Notification preferences recorded in Bureau registry.',
      preferences: validPrefs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Change Password
app.put(['/api/user/password', '/api/password'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
    }

    const db = await getDb();
    const usersColl = db.collection('users');
    const userId = req.user!.id;

    let user: any = null;
    if (ObjectId.isValid(userId)) {
      user = await usersColl.findOne({ _id: new ObjectId(userId) });
    }
    if (!user) {
      user = await usersColl.findOne({ email: req.user!.email.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'Correspondent account not found.' });
    }

    // Verify current password if user has one set
    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password is required to change password.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Current password does not match our records.' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await usersColl.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newHash,
          authProvider: user.authProvider === 'GOOGLE' ? 'BOTH' : user.authProvider,
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download / Export User Account Data
app.get(['/api/user/export-data', '/api/export-data'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const usersColl = db.collection('users');
    const lettersColl = db.collection('letters');
    const paymentsColl = db.collection('payments');

    const userId = req.user!.id;
    const userEmail = (req.user!.email || '').toLowerCase();

    let userDoc: any = null;
    if (ObjectId.isValid(userId)) {
      userDoc = await usersColl.findOne({ _id: new ObjectId(userId) });
    }
    if (!userDoc) {
      userDoc = await usersColl.findOne({ email: userEmail });
    }

    const sentLetters = await lettersColl.find({
      $or: [
        { senderId: userId },
        ...(ObjectId.isValid(userId) ? [{ senderId: new ObjectId(userId) }] : []),
        { senderEmail: userEmail },
      ],
    }).sort({ createdAt: -1 }).toArray();

    const receivedLetters = await lettersColl.find({
      recipientEmail: userEmail,
    }).sort({ createdAt: -1 }).toArray();

    const payments = await paymentsColl.find({
      $or: [
        { userId: userId },
        ...(ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : []),
      ],
    }).sort({ createdAt: -1 }).toArray();

    const exportPayload = {
      exportMetadata: {
        service: 'OLD-LETTERS Correspondence Bureau',
        registryReference: `OL-EXP-${userId.slice(-6).toUpperCase()}`,
        exportedAt: new Date().toISOString(),
      },
      profile: {
        id: userId,
        fullName: userDoc?.fullName || req.user!.fullName,
        email: userEmail,
        authProvider: userDoc?.authProvider || req.user!.authProvider,
        enrolledAt: userDoc?.createdAt || null,
        legalConsent: {
          termsAccepted: userDoc?.termsAccepted ?? true,
          privacyAccepted: userDoc?.privacyAccepted ?? true,
          termsVersion: userDoc?.termsVersion || CURRENT_TERMS_VERSION,
          privacyVersion: userDoc?.privacyVersion || CURRENT_PRIVACY_VERSION,
          consentedAt: userDoc?.legalConsentAt || userDoc?.createdAt || null,
        },
        notificationPreferences: userDoc?.notificationPreferences || {
          letterDispatched: true,
          deliveryUpdates: true,
          preArrival: true,
          arrival: true,
          paymentUpdates: true,
        },
      },
      summary: {
        sentLettersCount: sentLetters.length,
        receivedLettersCount: receivedLetters.length,
        paymentsCount: payments.length,
      },
      sentLetters: sentLetters.map((l: any) => ({
        trackingCode: l.trackingCode,
        type: l.letterType,
        recipientName: l.recipientName,
        recipientEmail: l.recipientEmail ? l.recipientEmail.replace(/(?<=.).(?=.*@)/g, '*') : undefined,
        letterDate: l.letterDate || (l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-US') : undefined),
        postedAt: l.postedAt,
        scheduledDeliveryAt: l.deliveryDate,
        deliveredAt: l.deliveredAt,
        status: l.status,
        waitingHours: l.waitingHours,
        postmarkCity: l.postmarkCity,
      })),
      receivedLetters: receivedLetters.map((l: any) => ({
        trackingCode: l.trackingCode,
        type: l.letterType,
        senderName: l.senderName,
        letterDate: l.letterDate || (l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-US') : undefined),
        scheduledDeliveryAt: l.deliveryDate,
        deliveredAt: l.deliveredAt,
        status: l.status,
        postmarkCity: l.postmarkCity,
      })),
      payments: payments.map((p: any) => ({
        paymentId: `PAY-${p._id.toString().slice(-8).toUpperCase()}`,
        featureCode: p.featureCode,
        amount: p.amount,
        currency: p.currency || 'INR',
        upiReference: p.upiReference,
        status: p.status,
        date: p.createdAt,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="old-letters-bureau-${userId.slice(-6)}.json"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete / Close User Account (With safe phrase confirmation)
app.delete(['/api/user/account', '/api/account'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const confirmation = String(req.body.confirmation || '').trim();
    if (confirmation !== 'DELETE MY BUREAU') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation phrase must be exactly "DELETE MY BUREAU" to close this Bureau account.',
      });
    }

    const db = await getDb();
    const usersColl = db.collection('users');
    const userId = req.user!.id;

    let filter: any = { _id: userId };
    if (ObjectId.isValid(userId)) {
      filter = { _id: new ObjectId(userId) };
    }

    // Safely mark user as DELETED and scrub sensitive credentials
    await usersColl.updateOne(filter, {
      $set: {
        status: 'DELETED',
        passwordHash: undefined,
        fullName: 'Closed Correspondent',
        email: `deleted_${Date.now()}_${req.user!.email}`,
        updatedAt: new Date(),
      },
    });

    clearSessionCookie(res, req);
    res.json({
      success: true,
      message: 'Your Bureau account and correspondent records have been closed.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Request Auth OTP (Alternative Email Verification Code)
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address required.' });
    }

    if (!checkRateLimit(`auth_otp:${email}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Too many OTP requests. Please wait 15 minutes.' });
    }

    const db = await getDb();
    const otpColl = db.collection('otpCodes');

    await otpColl.updateOne({ email, used: false }, { $set: { used: true } });

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashSha256(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await otpColl.insertOne({
      _id: new ObjectId(),
      email,
      otpHash,
      attempts: 0,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    if (isEmailConfigured()) {
      await sendMail({
        to: email,
        subject: 'Your OLD-LETTERS Bureau Access Code',
        html: `
          <div style="background-color: #faf9f7; padding: 40px; font-family: serif; color: #134e4a; text-align: center;">
            <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border: 1px solid #eae4da; padding: 36px; border-radius: 4px;">
              <div style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #78716c; margin-bottom: 12px; font-family: monospace;">
                OLD-LETTERS BUREAU AUTHENTICATION
              </div>
              <h2 style="font-size: 24px; font-weight: 300; margin: 0 0 16px 0; color: #134e4a;">Correspondence Sign-in</h2>
              <p style="font-size: 14px; font-family: sans-serif; color: #57534e; margin-bottom: 24px;">
                Use the following single-use code to authenticate your session. Valid for 10 minutes.
              </p>
              <div style="font-size: 34px; font-family: monospace; letter-spacing: 0.3em; font-weight: bold; background: #faf9f7; padding: 16px; border: 1px dashed #134e4a; color: #134e4a; margin: 24px 0;">
                ${otpCode}
              </div>
            </div>
          </div>
        `,
      });
    }

    res.json({
      success: true,
      message: 'Access code sent to email.',
      devOtpHint: isEmailConfigured() ? undefined : otpCode,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Auth OTP & Issue Session
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    const fullName = String(req.body.fullName || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
    }

    const db = await getDb();
    const otpColl = db.collection('otpCodes');
    const usersColl = db.collection('users');

    const activeOtp = await otpColl.findOne({
      email,
      used: false,
      expiresAt: { $gte: new Date() },
    });

    if (!activeOtp) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
    }

    if (activeOtp.attempts >= 5) {
      await otpColl.updateOne({ _id: activeOtp._id }, { $set: { used: true } });
      return res.status(429).json({ success: false, error: 'Maximum verification attempts exceeded.' });
    }

    const inputHash = hashSha256(otp);
    if (inputHash !== activeOtp.otpHash) {
      await otpColl.updateOne({ _id: activeOtp._id }, { $inc: { attempts: 1 } });
      return res.status(401).json({ success: false, error: 'Incorrect verification code.' });
    }

    await otpColl.updateOne({ _id: activeOtp._id }, { $set: { used: true } });

    let user = await usersColl.findOne({ email });
    const now = new Date();
    if (!user) {
      const defaultName = fullName || email.split('@')[0].replace(/[._-]/g, ' ');
      const newUserId = new ObjectId();
      const newUserRole = isAdminEmail(email) ? 'ADMIN' : 'USER';
      await usersColl.insertOne({
        _id: newUserId,
        fullName: defaultName,
        email,
        authProvider: 'EMAIL',
        role: newUserRole,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
      user = await usersColl.findOne({ _id: newUserId });
    } else if (isAdminEmail(email) && user.role !== 'ADMIN') {
      await usersColl.updateOne({ _id: user._id }, { $set: { role: 'ADMIN' } });
      user.role = 'ADMIN';
    }

    const userPayload = {
      id: user!._id.toString(),
      email: user!.email,
      fullName: user!.fullName,
      role: isAdminEmail(email) ? 'ADMIN' : (user!.role || 'USER'),
      authProvider: user!.authProvider,
      emailVerified: true,
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
    setSessionCookie(res, req, sessionToken);

    res.json({
      success: true,
      token: sessionToken,
      user: userPayload,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// TEMPLATES
// ====================================================================
app.get('/api/templates', async (req, res) => {
  try {
    const db = await getDb();
    const templatesColl = db.collection('letterTemplates');
    const templates = await (await templatesColl.find({ isActive: true })).sort({ sortOrder: 1 }).toArray();
    res.json({ success: true, templates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// LETTERS: ARCHIVE & POSTING (Protected & Sender-Authoritative)
// ====================================================================

// Helper for mapping letter documents for API responses
async function mapLetterDocToResponse(ltr: any, db: any, reqUser?: SessionUser) {
  const recipientsColl = db.collection('letterRecipients');
  const recipient = await recipientsColl.findOne({ letterId: ltr._id });

  // Lookup payment records for this letter
  const paymentsColl = db.collection('payments');
  let payment: any = null;
  try {
    payment = await paymentsColl.findOne({
      $or: [
        { letterId: ltr._id.toString() },
        { letterId: ltr._id },
        ...(ltr.trackingCode ? [{ letterId: ltr.trackingCode }] : []),
      ],
    });
  } catch {}

  const rawRecipientEmail = ltr.recipientEmail || recipient?.email || 'recipient@correspondence.in';
  const recipientEmailMasked = rawRecipientEmail ? rawRecipientEmail.replace(/(?<=.).(?=.*@)/g, '*') : '***@***.com';

  const now = Date.now();
  const createdAtTime = ltr.createdAt ? new Date(ltr.createdAt).getTime() : now;
  const postedAtTime = ltr.postedAt ? new Date(ltr.postedAt).getTime() : createdAtTime;
  const deliveryDateTime = ltr.deliveryDate ? new Date(ltr.deliveryDate).getTime() : postedAtTime + 48 * 3600 * 1000;
  const deliveredAtTime = ltr.deliveredAt ? new Date(ltr.deliveredAt).getTime() : undefined;

  const isWritten = true;
  const isSealed = ltr.status !== 'DRAFT';
  const isDispatched = ltr.status !== 'DRAFT';
  const isInTransit = ['IN_TRANSIT', 'DELIVERED', 'OPENED'].includes(ltr.status) || (ltr.status === 'SCHEDULED' && now >= postedAtTime);
  const isArriving = ['DELIVERED', 'OPENED'].includes(ltr.status) || (now >= deliveryDateTime - 24 * 3600 * 1000);
  const isDelivered = ltr.status === 'DELIVERED' || ltr.status === 'OPENED' || (now >= deliveryDateTime && ltr.status !== 'DRAFT' && ltr.status !== 'CANCELLED');

  const timeline = [
    {
      step: 'WRITTEN',
      label: 'Written',
      timestamp: ltr.createdAt ? new Date(ltr.createdAt).toISOString() : undefined,
      completed: isWritten,
      current: !isSealed,
    },
    {
      step: 'SEALED',
      label: 'Sealed',
      timestamp: isSealed ? (ltr.postedAt ? new Date(ltr.postedAt).toISOString() : new Date(ltr.createdAt).toISOString()) : undefined,
      completed: isSealed,
      current: isSealed && !isInTransit,
    },
    {
      step: 'DISPATCHED',
      label: 'Dispatched',
      timestamp: isDispatched ? (ltr.postedAt ? new Date(ltr.postedAt).toISOString() : new Date(ltr.createdAt).toISOString()) : undefined,
      completed: isDispatched,
      current: isDispatched && isInTransit && !isArriving,
    },
    {
      step: 'IN_TRANSIT',
      label: 'In Transit',
      timestamp: isInTransit ? (ltr.postedAt ? new Date(ltr.postedAt).toISOString() : undefined) : undefined,
      completed: isInTransit,
      current: isInTransit && !isArriving && !isDelivered,
    },
    {
      step: 'ARRIVING',
      label: 'Arriving',
      timestamp: isArriving ? new Date(deliveryDateTime - 24 * 3600 * 1000).toISOString() : undefined,
      completed: isArriving,
      current: isArriving && !isDelivered,
    },
    {
      step: 'DELIVERED',
      label: 'Delivered',
      timestamp: isDelivered ? (deliveredAtTime ? new Date(deliveredAtTime).toISOString() : new Date(deliveryDateTime).toISOString()) : undefined,
      completed: isDelivered,
      current: isDelivered,
    },
  ];

  return {
    id: ltr._id.toString(),
    trackingCode: ltr.trackingCode,
    type: ltr.letterType,
    templateId: ltr.templateId,
    senderName: ltr.senderName || reqUser?.fullName || 'Correspondent',
    senderEmail: ltr.senderEmail || reqUser?.email || 'correspondent@oldletters.in',
    recipientName: ltr.recipientName || recipient?.displayName || 'Recipient',
    recipientEmail: rawRecipientEmail,
    recipientEmailMasked,
    letterDate: new Date(ltr.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    greeting: ltr.salutation,
    content: ltr.body,
    signoff: ltr.signoff,
    attachments: ltr.attachments || [],
    verificationMethod: ltr.recipientVerificationMethod,
    postedAt: ltr.postedAt ? ltr.postedAt.toISOString() : ltr.createdAt.toISOString(),
    scheduledDeliveryAt: ltr.deliveryDate ? ltr.deliveryDate.toISOString() : undefined,
    deliveredAt: isDelivered ? (ltr.deliveredAt ? ltr.deliveredAt.toISOString() : (ltr.deliveryDate ? ltr.deliveryDate.toISOString() : undefined)) : undefined,
    waitingHours: ltr.waitingHours || 48,
    status: isDelivered ? 'DELIVERED' : ltr.status,
    postmarkCity: ltr.postmarkCity || 'Hyderabad Bureau',
    paymentStatus: payment ? (payment.status === 'APPROVED' ? 'PAID' : payment.status) : 'COMPLIMENTARY',
    amountPaid: payment?.amount || 0,
    currency: payment?.currency || 'INR',
    upiReference: payment?.upiReference,
    timeline,
    createdAt: ltr.createdAt ? ltr.createdAt.toISOString() : new Date().toISOString(),
  };
}

// 2. Letters Archive & Sent Letters: GET all letters for current authenticated sender
app.get(['/api/letters', '/api/archive', '/api/letters/sent'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const senderId = req.user!.id;
    const senderEmail = (req.user!.email || '').toLowerCase();

    // Strict ownership: Only retrieve letters penned by this authenticated sender
    const query: any = {
      $or: [
        { senderId },
        ...(ObjectId.isValid(senderId) ? [{ senderId: new ObjectId(senderId) }] : []),
        { senderEmail },
      ],
    };

    const rawLetters = await (await lettersColl.find(query)).sort({ createdAt: -1 }).toArray();
    const mapped = await Promise.all(
      rawLetters.map((ltr: any) => mapLetterDocToResponse(ltr, db, req.user))
    );

    res.json({ success: true, letters: mapped });
  } catch (err: any) {
    console.error('Error fetching letters:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Received Letters: GET letters addressed to current authenticated user's email
app.get(['/api/letters/received', '/api/letters-received'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');
    const tokensColl = db.collection('deliveryTokens');
    const userEmail = (req.user!.email || '').toLowerCase();

    // Query letters addressed to user email
    const recipientDocs = await recipientsColl.find({ email: userEmail }).toArray();
    const recipientLetterIds = recipientDocs.map((r: any) => r.letterId);

    const query: any = {
      $or: [
        { recipientEmail: userEmail },
        ...(recipientLetterIds.length > 0
          ? [{ _id: { $in: recipientLetterIds.map((id: any) => (typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id)) } }]
          : []),
      ],
    };

    const rawLetters = await (await lettersColl.find(query)).sort({ createdAt: -1 }).toArray();
    const now = new Date();

    const receivedLetters = await Promise.all(
      rawLetters.map(async (ltr: any) => {
        const isDelivered = ltr.status === 'DELIVERED' || (ltr.deliveryDate && new Date(ltr.deliveryDate) <= now);

        let deliveryToken: string | undefined = undefined;
        if (isDelivered) {
          const tokenDoc = await tokensColl.findOne({
            $or: [{ letterId: ltr._id }, { letterId: ltr._id.toString() }],
          });
          if (tokenDoc?.rawToken) {
            deliveryToken = tokenDoc.rawToken;
          }
        }

        const scheduledAt = ltr.deliveryDate ? new Date(ltr.deliveryDate).toISOString() : undefined;
        const postedAt = ltr.postedAt
          ? new Date(ltr.postedAt).toISOString()
          : ltr.createdAt
          ? new Date(ltr.createdAt).toISOString()
          : undefined;

        // Privacy rule: Sealed letters never reveal content/salutation/signoff
        return {
          id: ltr._id.toString(),
          trackingCode: ltr.trackingCode,
          senderName: ltr.senderName || 'Anonymous Correspondent',
          letterType: ltr.letterType,
          templateId: ltr.templateId || 'ivory',
          letterDate: new Date(ltr.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          postedAt,
          scheduledDeliveryAt: scheduledAt,
          deliveredAt: isDelivered ? (ltr.deliveredAt ? new Date(ltr.deliveredAt).toISOString() : scheduledAt) : undefined,
          status: isDelivered ? 'DELIVERED' : 'IN_TRANSIT',
          isSealed: !isDelivered,
          canOpen: isDelivered,
          deliveryToken,
          sealedMessage: !isDelivered ? 'SEALED IN TRANSIT · Your letter is still making its way to you.' : undefined,
          postmarkCity: ltr.postmarkCity || 'Hyderabad Bureau',
          verificationMethod: ltr.recipientVerificationMethod || 'open',
          createdAt: ltr.createdAt ? new Date(ltr.createdAt).toISOString() : new Date().toISOString(),
        };
      })
    );

    res.json({ success: true, letters: receivedLetters });
  } catch (err: any) {
    console.error('Error fetching received letters:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save or sync working draft letter in MongoDB (Authenticated)
app.post(['/api/letters/draft', '/api/letters/save-draft'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const senderId = req.user!.id;
    const senderEmail = (req.user?.email || '').toLowerCase();
    const senderName = req.user?.fullName || 'Correspondent';

    const {
      letterId: requestedId,
      type = 'LOVE',
      templateId = 'ivory',
      recipientName = '',
      recipientEmail = '',
      greeting = 'Dear Friend,',
      content = '',
      signoff = 'Yours,',
      verificationMethod = 'open',
      scheduledDeliveryAt,
      waitingHours = 48,
      postmarkCity = 'Hyderabad Bureau',
      attachments = [],
    } = req.body;

    const now = new Date();
    const deliveryDate = scheduledDeliveryAt ? new Date(scheduledDeliveryAt) : new Date(now.getTime() + (Number(waitingHours) || 48) * 3600 * 1000);

    let letter: any = null;
    if (requestedId && ObjectId.isValid(requestedId)) {
      letter = await lettersColl.findOne({
        _id: new ObjectId(requestedId),
        $or: [{ senderId }, { senderId: new ObjectId(senderId) }],
      });
    }

    if (letter) {
      await lettersColl.updateOne(
        { _id: letter._id },
        {
          $set: {
            letterType: type,
            templateId,
            recipientName: recipientName.trim(),
            recipientEmail: recipientEmail.trim().toLowerCase(),
            salutation: greeting,
            body: content,
            signoff,
            recipientVerificationMethod: verificationMethod,
            scheduledDeliveryAt: deliveryDate,
            deliveryDate,
            waitingHours: Number(waitingHours) || 48,
            postmarkCity,
            attachments,
            updatedAt: now,
          },
        }
      );
      const updated: any = (await lettersColl.findOne({ _id: letter._id })) || letter;
      return res.json({
        success: true,
        letter: {
          id: (updated._id || letter._id).toString(),
          trackingCode: updated.trackingCode || letter.trackingCode,
          type: updated.letterType || letter.letterType,
          templateId: updated.templateId || letter.templateId,
          recipientName: updated.recipientName || letter.recipientName,
          recipientEmail: updated.recipientEmail || letter.recipientEmail,
          status: updated.status || letter.status,
          scheduledDeliveryAt: updated.scheduledDeliveryAt?.toISOString ? updated.scheduledDeliveryAt.toISOString() : updated.scheduledDeliveryAt,
          waitingHours: updated.waitingHours || letter.waitingHours,
        },
      });
    }

    const newId = requestedId && ObjectId.isValid(requestedId) ? new ObjectId(requestedId) : new ObjectId();
    const trackingCode = `OL-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;

    const draftDoc = {
      _id: newId,
      senderId,
      senderEmail,
      senderName,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      letterType: type,
      templateId,
      salutation: greeting,
      body: content,
      signoff,
      status: 'DRAFT',
      deliveryDate,
      scheduledDeliveryAt: deliveryDate,
      trackingCode,
      recipientVerificationMethod: verificationMethod,
      postmarkCity,
      waitingHours: Number(waitingHours) || 48,
      attachments,
      createdAt: now,
      updatedAt: now,
    };

    await lettersColl.insertOne(draftDoc);

    return res.status(201).json({
      success: true,
      letter: {
        id: newId.toString(),
        trackingCode,
        type,
        templateId,
        recipientName: draftDoc.recipientName,
        recipientEmail: draftDoc.recipientEmail,
        status: 'DRAFT',
        scheduledDeliveryAt: deliveryDate.toISOString(),
        waitingHours: draftDoc.waitingHours,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// 3. Create Letter / Schedule Post (Strictly authenticated & senderId bound)
app.post('/api/letters', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = CreateLetterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues.map((e: any) => e.message).join(', '),
      });
    }

    const input = parseResult.data;
    const trackingCode = `OL-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const rawDeliveryToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSha256(rawDeliveryToken);

    let passphraseHash: string | undefined = undefined;
    if (input.passphrase) {
      passphraseHash = await bcrypt.hash(input.passphrase.trim().toLowerCase(), 10);
    }

    const db = await getDb();
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');
    const tokensColl = db.collection('deliveryTokens');
    const eventsColl = db.collection('deliveryEvents');
    const paymentsColl = db.collection('payments');
    const mediaMetadataColl = db.collection('mediaMetadata');

    const letterId = new ObjectId();
    const now = new Date();
    const createdAt = now;

    // ONE CANONICAL SERVER-SIDE CALCULATION:
    // deliveryAt = createdAt + 48 hours (when 48-hour option is selected)
    let deliveryDate: Date;
    if (input.waitingHours === 48 || input.selectedTempoId === '48h' || !input.scheduledDeliveryAt) {
      deliveryDate = new Date(createdAt.getTime() + 48 * 3600 * 1000);
    } else {
      const parsed = new Date(input.scheduledDeliveryAt);
      const minDeliveryTime = createdAt.getTime() + (input.waitingHours || 48) * 3600 * 1000;
      if (!isNaN(parsed.getTime()) && parsed.getTime() >= createdAt.getTime() + 48 * 3600 * 1000 - (15 * 60 * 1000)) {
        deliveryDate = parsed;
      } else {
        deliveryDate = new Date(minDeliveryTime);
      }
    }

    // CRITICAL: Always use req.user.id as senderId (never trust client body senderId)
    const senderId = req.user!.id;
    const senderEmail = (req.user?.email || input.senderEmail).toLowerCase();
    const senderName = input.senderName || req.user?.fullName || 'Correspondent';
    const recipientEmail = input.recipientEmail.trim().toLowerCase();
    const recipientName = input.recipientName.trim();

    if (!input.templateId || !input.templateId.trim()) {
      return res.status(400).json({ success: false, error: 'Please choose your stationery before sealing the letter.' });
    }

    if (!recipientName) {
      return res.status(400).json({ success: false, error: 'Recipient name is required.' });
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid recipient email required.' });
    }

    const linkedPaymentId = input.paymentId || (req.body.personalMessage?.paymentId);
    const hasMedia = Boolean(input.hasMediaAttachment || req.body.personalMessage?.hasMediaAttachment || req.body.personalMessage?.mediaStorageKey);
    const mediaType = input.mediaType || req.body.personalMessage?.mediaType || (req.body.personalMessage?.type === 'VIDEO' ? 'VIDEO' : req.body.personalMessage?.type === 'VOICE' ? 'VOICE' : undefined);
    const mediaStorageKey = input.mediaStorageKey || req.body.personalMessage?.mediaStorageKey || undefined;
    const mediaStatus = input.mediaStatus || req.body.personalMessage?.mediaStatus || 'PENDING';

    // 1. Insert Letter document in MongoDB with distinct sender and recipient identities
    await lettersColl.insertOne({
      _id: letterId,
      senderId,
      senderEmail,
      senderName,
      recipientEmail,
      recipientName,
      letterType: input.type,
      templateId: input.templateId,
      salutation: input.greeting,
      body: input.content,
      signoff: input.signoff,
      status: input.status,
      deliveryDate,
      scheduledDeliveryAt: deliveryDate,
      trackingCode,
      recipientVerificationMethod: input.verificationMethod,
      secretPassphraseHash: passphraseHash,
      postmarkCity: input.postmarkCity || 'Hyderabad Bureau',
      waitingHours: input.waitingHours,
      attachments: req.body.attachments || [],
      personalMessage: req.body.personalMessage || undefined,
      hasMediaAttachment: hasMedia,
      mediaType: mediaType || undefined,
      mediaStorageKey: mediaStorageKey || undefined,
      mediaPaymentId: linkedPaymentId || undefined,
      mediaStatus: hasMedia ? mediaStatus : undefined,
      postedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Link payment & media if payment was submitted prior to sealing
    if (linkedPaymentId) {
      try {
        const foundPayment = await paymentsColl.findOne({
          $or: [
            { paymentId: linkedPaymentId },
            ...(ObjectId.isValid(linkedPaymentId) ? [{ _id: new ObjectId(linkedPaymentId) }] : [{ _id: linkedPaymentId }]),
          ],
        });

        if (foundPayment) {
          await paymentsColl.updateOne(
            { _id: foundPayment._id },
            {
              $set: {
                letterId: letterId.toString(),
                trackingCode,
                recipientEmail,
                recipientName,
                updatedAt: now,
              },
            }
          );
          await mediaMetadataColl.updateMany(
            {
              $or: [
                { paymentId: foundPayment._id.toString() },
                { paymentId: foundPayment.paymentId },
                ...(mediaStorageKey ? [{ storageKey: mediaStorageKey }] : []),
              ],
            },
            {
              $set: {
                letterId: letterId.toString(),
                updatedAt: now,
              },
            }
          );
        }
      } catch (linkErr) {
        console.warn('[OLD-LETTERS] Failed to link payment to letter:', linkErr);
      }
    }

    // 2. Insert Recipient document
    await recipientsColl.insertOne({
      _id: new ObjectId(),
      letterId,
      email: recipientEmail,
      displayName: recipientName,
      verificationMethod: input.verificationMethod,
      createdAt: now,
    });

    // 3. Insert Delivery Token (both hash for lookup and token for references)
    await tokensColl.insertOne({
      _id: new ObjectId(),
      letterId,
      tokenHash,
      rawToken: rawDeliveryToken,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
      createdAt: now,
    });

    // 4. Emit Delivery Event
    await eventsColl.insertOne({
      _id: new ObjectId(),
      letterId,
      eventType: 'LETTER_POSTED',
      metadata: {
        scheduledDeliveryAt: input.scheduledDeliveryAt,
        trackingCode,
        recipient: recipientEmail,
      },
      createdAt: now,
    });

    const scheduledArrivalFormatted = deliveryDate.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const recipientUrl = `${APP_URL}/letter/${rawDeliveryToken}`;
    const archiveUrl = `${APP_URL}/archive`;

    // ----------------------------------------------------
    // EMAIL 1 — IMMEDIATE DISPATCH CONFIRMATION (SENDER ONLY)
    // ----------------------------------------------------
    try {
      const senderMailRes = await sendLetterDispatchedSenderEmail({
        senderEmail,
        senderName,
        recipientName,
        trackingCode,
        letterType: input.type,
        scheduledArrivalFormatted,
        waitingHours: input.waitingHours,
        archiveUrl,
      });

      logEmailDispatch({
        type: 'SENDER_DISPATCH',
        to: senderEmail,
        letterId: letterId.toString(),
        paymentId: linkedPaymentId || undefined,
        dispatchRef: trackingCode,
        status: senderMailRes.success ? 'SENT' : 'FAILED',
        error: senderMailRes.error,
        timestamp: new Date().toISOString(),
      });

      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId,
        eventType: 'SENDER_DISPATCH_EMAIL_SENT',
        metadata: { senderEmail, status: senderMailRes.success ? 'SENT' : 'FAILED' },
        createdAt: new Date(),
      });
    } catch (err: any) {
      logEmailDispatch({
        type: 'SENDER_DISPATCH',
        to: senderEmail,
        letterId: letterId.toString(),
        paymentId: linkedPaymentId || undefined,
        dispatchRef: trackingCode,
        status: 'FAILED',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }

    // ----------------------------------------------------
    // EMAIL 2 — RECIPIENT NOTIFICATION (RECIPIENT ONLY)
    // ----------------------------------------------------
    try {
      const recipientMailRes = await sendLetterDispatchedRecipientEmail({
        recipientEmail,
        recipientName,
        senderName,
        trackingCode,
        scheduledArrivalFormatted,
        waitingHours: input.waitingHours,
        recipientUrl,
      });

      logEmailDispatch({
        type: 'RECIPIENT_DISPATCH',
        to: recipientEmail,
        letterId: letterId.toString(),
        paymentId: linkedPaymentId || undefined,
        dispatchRef: trackingCode,
        status: recipientMailRes.success ? 'SENT' : 'FAILED',
        error: recipientMailRes.error,
        timestamp: new Date().toISOString(),
      });

      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId,
        eventType: 'RECIPIENT_DISPATCH_EMAIL_SENT',
        metadata: { recipientEmail, status: recipientMailRes.success ? 'SENT' : 'FAILED' },
        createdAt: new Date(),
      });
    } catch (err: any) {
      logEmailDispatch({
        type: 'RECIPIENT_DISPATCH',
        to: recipientEmail,
        letterId: letterId.toString(),
        paymentId: linkedPaymentId || undefined,
        dispatchRef: trackingCode,
        status: 'FAILED',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }

    const responseLetter = {
      id: letterId.toString(),
      trackingCode,
      type: input.type,
      templateId: input.templateId,
      senderName,
      senderEmail,
      recipientName,
      recipientEmail,
      letterDate: now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      greeting: input.greeting,
      content: input.content,
      signoff: input.signoff,
      attachments: req.body.attachments || [],
      verificationMethod: input.verificationMethod,
      postedAt: now.toISOString(),
      scheduledDeliveryAt: deliveryDate.toISOString(),
      waitingHours: input.waitingHours,
      status: input.status,
      postmarkCity: input.postmarkCity || 'Hyderabad Bureau',
    };

    res.status(201).json({
      success: true,
      letter: responseLetter,
      trackingCode,
      deliveryToken: rawDeliveryToken,
    });
  } catch (err: any) {
    console.error('Error posting letter:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single letter lookup by ID (with strict ownership check)
app.get('/api/letters/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const lettersColl = db.collection('letters');

    let letter = null;
    try {
      letter = await lettersColl.findOne({ _id: new ObjectId(id) });
    } catch {
      letter = await lettersColl.findOne({ trackingCode: id });
    }

    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    // Verify ownership or recipient or admin privileges
    const isAdmin = await verifyAdminServerSide(req);
    const userId = req.user!.id;
    const userEmail = (req.user!.email || '').toLowerCase();

    const isSender =
      letter.senderId?.toString() === userId ||
      (ObjectId.isValid(userId) && letter.senderId?.toString() === new ObjectId(userId).toString()) ||
      letter.senderEmail?.toLowerCase() === userEmail;

    const isRecipient = letter.recipientEmail?.toLowerCase() === userEmail;

    if (!isSender && !isRecipient && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied to this correspondence.' });
    }

    // For recipients: strictly enforce sealed protection if delivery date has not arrived
    const now = new Date();
    const isDelivered = letter.status === 'DELIVERED' || (letter.deliveryDate && new Date(letter.deliveryDate) <= now);

    if (isRecipient && !isSender && !isAdmin && !isDelivered) {
      return res.json({
        success: true,
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          senderName: letter.senderName || 'Anonymous Correspondent',
          letterType: letter.letterType,
          templateId: letter.templateId || 'ivory',
          letterDate: new Date(letter.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          status: 'IN_TRANSIT',
          isSealed: true,
          canOpen: false,
          sealedMessage: 'SEALED IN TRANSIT · Your letter is still making its way to you.',
          scheduledDeliveryAt: letter.deliveryDate ? new Date(letter.deliveryDate).toISOString() : undefined,
          postmarkCity: letter.postmarkCity || 'Hyderabad Bureau',
        },
      });
    }

    const mapped = await mapLetterDocToResponse(letter, db, req.user);
    res.json({ success: true, letter: mapped });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Finalize and Post / Seal a draft letter by ID (Strictly authenticated & ownership verified)
app.post('/api/letters/:id/post', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const tokensColl = db.collection('deliveryTokens');
    const eventsColl = db.collection('deliveryEvents');

    let letter = null;
    try {
      letter = await lettersColl.findOne({ _id: new ObjectId(id) });
    } catch {
      letter = await lettersColl.findOne({ trackingCode: id });
    }

    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    if (letter.senderId?.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only post your own correspondence.' });
    }

    const now = new Date();
    await lettersColl.updateOne(
      { _id: letter._id },
      {
        $set: {
          status: 'SCHEDULED',
          postedAt: now,
          updatedAt: now,
        },
      }
    );

    const existingToken = await tokensColl.findOne({ letterId: letter._id });
    let rawDeliveryToken = existingToken?.rawToken || '';
    if (!existingToken) {
      rawDeliveryToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashSha256(rawDeliveryToken);
      await tokensColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        tokenHash,
        rawToken: rawDeliveryToken,
        expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
        createdAt: now,
      });
    }

    await eventsColl.insertOne({
      _id: new ObjectId(),
      letterId: letter._id,
      eventType: 'LETTER_POSTED',
      metadata: { trackingCode: letter.trackingCode },
      createdAt: now,
    });

    const updated = await lettersColl.findOne({ _id: letter._id });
    const mapped = await mapLetterDocToResponse(updated, db, req.user);

    // Email dispatch for finalized letter
    const recipientsColl = db.collection('letterRecipients');
    const recipientDoc = await recipientsColl.findOne({ letterId: letter._id });
    const senderEmail = (letter.senderEmail || req.user!.email).toLowerCase();
    const senderName = letter.senderName || req.user?.fullName || 'Correspondent';
    const recipientEmail = (recipientDoc?.email || letter.recipientEmail || '').toLowerCase();
    const recipientName = recipientDoc?.displayName || letter.recipientName || 'Recipient';
    const deliveryDate = new Date(letter.deliveryDate || letter.scheduledDeliveryAt || now);
    const scheduledArrivalFormatted = deliveryDate.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const recipientUrl = `${APP_URL}/letter/${rawDeliveryToken || letter.trackingCode}`;
    const archiveUrl = `${APP_URL}/archive`;

    if (senderEmail) {
      try {
        const sRes = await sendLetterDispatchedSenderEmail({
          senderEmail,
          senderName,
          recipientName,
          trackingCode: letter.trackingCode,
          letterType: letter.letterType,
          scheduledArrivalFormatted,
          waitingHours: letter.waitingHours || 48,
          archiveUrl,
        });

        logEmailDispatch({
          type: 'SENDER_DISPATCH',
          to: senderEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: sRes.success ? 'SENT' : 'FAILED',
          error: sRes.error,
        });
      } catch (err: any) {
        logEmailDispatch({
          type: 'SENDER_DISPATCH',
          to: senderEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    if (recipientEmail) {
      try {
        const rRes = await sendLetterDispatchedRecipientEmail({
          recipientEmail,
          recipientName,
          senderName,
          trackingCode: letter.trackingCode,
          scheduledArrivalFormatted,
          waitingHours: letter.waitingHours || 48,
          recipientUrl,
        });

        logEmailDispatch({
          type: 'RECIPIENT_DISPATCH',
          to: recipientEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: rRes.success ? 'SENT' : 'FAILED',
          error: rRes.error,
        });
      } catch (err: any) {
        logEmailDispatch({
          type: 'RECIPIENT_DISPATCH',
          to: recipientEmail,
          letterId: letter._id.toString(),
          dispatchRef: letter.trackingCode,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      letter: mapped,
      trackingCode: letter.trackingCode,
      deliveryToken: rawDeliveryToken || undefined,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update a letter or draft by ID (Strictly authenticated & ownership verified)
app.put('/api/letters/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');

    let letter = null;
    try {
      letter = await lettersColl.findOne({ _id: new ObjectId(id) });
    } catch {
      letter = await lettersColl.findOne({ trackingCode: id });
    }

    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    if (letter.senderId?.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only edit your own correspondence.' });
    }

    const {
      salutation,
      greeting,
      body,
      content,
      signoff,
      recipientName,
      recipientEmail,
      templateId,
      letterType,
      type,
      scheduledDeliveryAt,
      waitingHours,
      verificationMethod,
    } = req.body;

    const updateFields: any = { updatedAt: new Date() };
    if (greeting !== undefined || salutation !== undefined) updateFields.salutation = greeting ?? salutation;
    if (content !== undefined || body !== undefined) updateFields.body = content ?? body;
    if (signoff !== undefined) updateFields.signoff = signoff;
    if (templateId !== undefined) updateFields.templateId = templateId;
    if (type !== undefined || letterType !== undefined) updateFields.letterType = type ?? letterType;
    if (waitingHours !== undefined) updateFields.waitingHours = waitingHours;
    if (scheduledDeliveryAt !== undefined) updateFields.deliveryDate = new Date(scheduledDeliveryAt);
    if (verificationMethod !== undefined) updateFields.recipientVerificationMethod = verificationMethod;

    await lettersColl.updateOne({ _id: letter._id }, { $set: updateFields });

    if (recipientName || recipientEmail) {
      const recipientUpdate: any = {};
      if (recipientName) recipientUpdate.displayName = recipientName;
      if (recipientEmail) recipientUpdate.email = recipientEmail.toLowerCase();
      await recipientsColl.updateOne({ letterId: letter._id }, { $set: recipientUpdate });
    }

    const updated = await lettersColl.findOne({ _id: letter._id });
    const mapped = await mapLetterDocToResponse(updated, db, req.user);
    res.json({ success: true, letter: mapped });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a letter or draft by ID (Strictly authenticated & ownership verified)
app.delete('/api/letters/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');
    const tokensColl = db.collection('deliveryTokens');

    let letter = null;
    try {
      letter = await lettersColl.findOne({ _id: new ObjectId(id) });
    } catch {
      letter = await lettersColl.findOne({ trackingCode: id });
    }

    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    if (letter.senderId?.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only delete your own correspondence.' });
    }

    await lettersColl.deleteOne({ _id: letter._id });
    await recipientsColl.deleteMany({ letterId: letter._id });
    await tokensColl.deleteMany({ letterId: letter._id });

    res.json({ success: true, message: 'Correspondence removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// RECIPIENT EXPERIENCE (Strict Delivery Verification & Zero Content Leakage)
// ====================================================================

// Helper to resolve letter and recipient records securely from a delivery token or tracking code
async function resolveLetterFromToken(rawToken: string, db: any) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const cleanToken = rawToken.trim();
  const tokenHash = hashSha256(cleanToken);

  const tokensColl = db.collection('deliveryTokens');
  const lettersColl = db.collection('letters');
  const recipientsColl = db.collection('letterRecipients');

  // 1. Primary lookup: By SHA-256 hash in deliveryTokens collection
  let tokenRec = await tokensColl.findOne({
    tokenHash,
    expiresAt: { $gte: new Date() },
  });

  let letter = null;
  if (tokenRec) {
    letter = await lettersColl.findOne({ _id: new ObjectId(tokenRec.letterId) });
  } else {
    // 2. Direct token record fallback
    tokenRec = await tokensColl.findOne({
      $or: [{ tokenHash: cleanToken }, { rawToken: cleanToken }],
      expiresAt: { $gte: new Date() },
    });
    if (tokenRec) {
      letter = await lettersColl.findOne({ _id: new ObjectId(tokenRec.letterId) });
    } else {
      // 3. Tracking code lookup
      const letterByCode = await lettersColl.findOne({ trackingCode: cleanToken });
      if (letterByCode) {
        letter = letterByCode;
        tokenRec = await tokensColl.findOne({ letterId: letterByCode._id });
      }
    }
  }

  if (!letter) return null;
  const recipient = await recipientsColl.findOne({ letterId: letter._id });
  return { letter, tokenRec, recipient, tokenHash };
}

// Helper to verify if the current HTTP request has a verified recipient session for a specific letter
function isRecipientSessionVerified(req: express.Request, letterId: string): boolean {
  const rcptCookieName = `oldletters_rcpt_${letterId}`;
  const candidateToken =
    req.cookies?.[rcptCookieName] ||
    req.headers['x-recipient-token'] ||
    (req.headers.authorization?.startsWith('Bearer rcpt_') ? req.headers.authorization.slice(7) : null);

  if (candidateToken && typeof candidateToken === 'string') {
    try {
      const cleanJwt = candidateToken.startsWith('rcpt_') ? candidateToken.slice(5) : candidateToken;
      const decoded: any = jwt.verify(cleanJwt, JWT_SECRET);
      if (decoded && decoded.letterId === letterId && decoded.verified === true) {
        return true;
      }
    } catch {
      // Invalid or expired recipient session token
    }
  }
  return false;
}

// 4. Delivery Token: Retrieve public letter metadata (STRICTLY NO content before verified arrival)
app.get(['/api/delivery/token/:token', '/api/letter/:token'], async (req, res) => {
  try {
    const rawToken = req.params.token;
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const usersColl = db.collection('users');
    const paidFeaturesColl = db.collection('paidFeatures');

    const resolved = await resolveLetterFromToken(rawToken, db);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'Correspondence not found or delivery link expired.' });
    }

    const { letter, recipient } = resolved;
    const now = new Date();
    const deliveryDate = new Date(letter.deliveryDate || letter.createdAt);
    const isArrived = now.getTime() >= deliveryDate.getTime();
    const remainingMs = Math.max(0, deliveryDate.getTime() - now.getTime());
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

    // Auto-transition status if arrived but still scheduled
    if (isArrived && letter.status === 'SCHEDULED') {
      await lettersColl.updateOne(
        { _id: letter._id, status: 'SCHEDULED' },
        { $set: { status: 'DELIVERED', deliveredAt: now, updatedAt: now } }
      );
      letter.status = 'DELIVERED';
    }

    // Mask recipient email for privacy
    const rawEmail = recipient?.email || '';
    const maskedEmail = rawEmail.replace(/(?<=.).(?=.*@)/g, '*');

    // Resolve authoritative sender display name
    let senderDisplayName = letter.senderName || 'A correspondent';
    if ((!letter.senderName || letter.senderName === 'Correspondent') && letter.senderId) {
      try {
        const senderDoc = await usersColl.findOne({ _id: new ObjectId(letter.senderId) });
        if (senderDoc?.fullName) {
          senderDisplayName = senderDoc.fullName;
        }
      } catch {
        // Fallback
      }
    }

    const verificationMethod = letter.recipientVerificationMethod || 'open';
    const isVerifiedSession = isArrived && isRecipientSessionVerified(req, letter._id.toString());

    // 1. BEFORE ARRIVAL: STRICTLY SEALED IN TRANSIT. NEVER RETURN LETTER BODY/CONTENT.
    if (!isArrived) {
      return res.json({
        success: true,
        isSealed: true,
        isArrived: false,
        canUnseal: false,
        isVerified: false,
        metadata: {
          trackingCode: letter.trackingCode,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || 'Recipient',
          recipientEmailMasked: maskedEmail,
          verificationMethod,
          status: 'IN TRANSIT',
          isDelivered: false,
          isArrived: false,
          canUnseal: false,
          deliveryDate: deliveryDate.toISOString(),
          scheduledDeliveryAt: deliveryDate.toISOString(),
          waitingHours: letter.waitingHours || 48,
          remainingMs,
          remainingSeconds,
          remainingHours,
          templateId: letter.templateId || 'ivory',
          postmarkCity: letter.postmarkCity || 'Hyderabad Bureau',
        },
      });
    }

    // 2. AFTER ARRIVAL & RECIPIENT ALREADY VERIFIED IN SESSION: Return decrypted letter content
    if (isVerifiedSession) {
      const paidList = await (
        await paidFeaturesColl.find({
          letterId: letter._id.toString(),
          status: 'UNLOCKED',
        })
      ).toArray();

      // Check for approved personal message enclosure
      const paymentsColl = db.collection('payments');
      const mediaColl = db.collection('mediaMetadata');
      const approvedPayment = await paymentsColl.findOne({
        letterId: letter._id.toString(),
        status: 'APPROVED',
      });
      const approvedMedia = await mediaColl.findOne({
        letterId: letter._id.toString(),
        mediaStatus: 'APPROVED',
      });
      const personalMessage = (approvedPayment && approvedMedia && approvedMedia.mediaStatus === 'APPROVED') ? {
        mediaType: approvedMedia.mediaType,
        storageKey: approvedMedia.storageKey,
        mediaStatus: 'APPROVED',
        streamUrl: `/api/delivery/media/${rawToken}`,
      } : null;

      return res.json({
        success: true,
        isSealed: false,
        isArrived: true,
        canUnseal: true,
        isVerified: true,
        metadata: {
          trackingCode: letter.trackingCode,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || 'Recipient',
          recipientEmailMasked: maskedEmail,
          verificationMethod,
          status: letter.status,
          isDelivered: true,
          isArrived: true,
          canUnseal: true,
          deliveryDate: deliveryDate.toISOString(),
          scheduledDeliveryAt: deliveryDate.toISOString(),
          waitingHours: letter.waitingHours || 48,
          remainingMs: 0,
          remainingSeconds: 0,
          remainingHours: 0,
          templateId: letter.templateId || 'ivory',
          postmarkCity: letter.postmarkCity || 'Hyderabad Bureau',
        },
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          type: letter.letterType,
          templateId: letter.templateId,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || 'Recipient',
          letterDate: new Date(letter.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          greeting: letter.salutation,
          content: letter.body,
          signoff: letter.signoff,
          attachments: letter.attachments || [],
          status: letter.status,
          personalMessage,
          paidFeatures: paidList.map((pf: any) => pf.featureCode),
        },
      });
    }

    // 3. AFTER ARRIVAL BUT NOT YET VERIFIED: Return arrived metadata, ready to unseal/verify. NO BODY.
    return res.json({
      success: true,
      isSealed: true,
      isArrived: true,
      canUnseal: true,
      isVerified: false,
      metadata: {
        trackingCode: letter.trackingCode,
        senderName: senderDisplayName,
        recipientName: recipient?.displayName || 'Recipient',
        recipientEmailMasked: maskedEmail,
        verificationMethod,
        status: letter.status,
        isDelivered: true,
        isArrived: true,
        canUnseal: true,
        deliveryDate: deliveryDate.toISOString(),
        scheduledDeliveryAt: deliveryDate.toISOString(),
        waitingHours: letter.waitingHours || 48,
        remainingMs: 0,
        remainingSeconds: 0,
        remainingHours: 0,
        templateId: letter.templateId || 'ivory',
        postmarkCity: letter.postmarkCity || 'Hyderabad Bureau',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Recipient Verification: Request OTP (Strictly blocked before arrival)
app.post(['/api/delivery/request-otp', '/api/recipient/request-otp'], async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Delivery token required.' });
    }

    const db = await getDb();
    const otpColl = db.collection('otpCodes');
    const eventsColl = db.collection('deliveryEvents');

    const resolved = await resolveLetterFromToken(token, db);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'Correspondence not found.' });
    }

    const { letter, recipient } = resolved;
    const now = new Date();
    const deliveryDate = new Date(letter.deliveryDate || letter.createdAt);
    const isArrived = now.getTime() >= deliveryDate.getTime();
    const remainingMs = Math.max(0, deliveryDate.getTime() - now.getTime());
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

    // STRICT SERVER-SIDE CHECK: NO OTP CAN BE REQUESTED BEFORE ARRIVAL
    if (!isArrived) {
      return res.status(403).json({
        success: false,
        error: `This correspondence is still sealed in transit. Scheduled arrival is ${deliveryDate.toUTCString()} (${remainingHours} hours remaining). Verification codes cannot be dispatched before the scheduled arrival time.`,
      });
    }

    if (!recipient || !recipient.email) {
      return res.status(400).json({ success: false, error: 'Recipient address not registered.' });
    }

    if (!checkRateLimit(`recipient_otp:${letter._id.toString()}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Too many OTP requests. Please wait 15 minutes.' });
    }

    await otpColl.updateOne({ letterId: letter._id, used: false }, { $set: { used: true } });

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashSha256(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await otpColl.insertOne({
      _id: new ObjectId(),
      email: recipient.email,
      letterId: letter._id,
      otpHash,
      attempts: 0,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    await eventsColl.insertOne({
      _id: new ObjectId(),
      letterId: letter._id,
      eventType: 'OTP_SENT',
      metadata: { recipientEmail: recipient.email },
      createdAt: new Date(),
    });

    if (isEmailConfigured()) {
      await sendMail({
        to: recipient.email,
        subject: 'Your letter has arrived — OLD-LETTERS Verification Code',
        html: `
          <div style="background-color: #faf9f7; padding: 40px; font-family: serif; color: #134e4a; text-align: center;">
            <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border: 1px solid #eae4da; padding: 36px; border-radius: 4px;">
              <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #78716c; margin-bottom: 12px; font-family: monospace;">
                PRIVATE CORRESPONDENCE VERIFICATION
              </div>
              <h2 style="font-size: 26px; font-weight: 300; margin: 0 0 16px 0;">Verify Your Access</h2>
              <p style="font-size: 14px; font-family: sans-serif; color: #57534e; margin-bottom: 24px;">
                Enter this code to unseal your incoming letter. Valid for 10 minutes.
              </p>
              <div style="font-size: 36px; font-family: monospace; letter-spacing: 0.25em; font-weight: bold; background: #faf9f7; padding: 16px; border: 1px dashed #134e4a; color: #134e4a; margin: 24px 0;">
                ${otpCode}
              </div>
            </div>
          </div>
        `,
      });
    }

    res.json({
      success: true,
      message: 'Verification code dispatched to recipient email.',
      devOtpHint: isEmailConfigured() ? undefined : otpCode,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Recipient Verification: Submit OTP or Passphrase & Unseal Letter (Strictly blocked before arrival)
app.post(['/api/delivery/verify', '/api/delivery/verify/:token', '/api/delivery/verify-otp', '/api/recipient/verify', '/api/recipient/verify/:token', '/api/recipient/verify-otp', '/api/recipient/passphrase', '/api/letters/verify/:token', '/api/letters/:token/verify'], async (req, res) => {
  try {
    const rawToken = req.params.token || req.body.token;
    const bodyWithToken = { ...req.body, token: rawToken };
    const parseResult = RecipientVerifySchema.safeParse(bodyWithToken);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues.map((e: any) => e.message).join(', '),
      });
    }

    const { token, otp, passphrase } = parseResult.data;
    const verificationMethod = parseResult.data.verificationMethod || (otp ? 'otp' : passphrase ? 'passphrase' : 'open');
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');
    const otpColl = db.collection('otpCodes');
    const eventsColl = db.collection('deliveryEvents');
    const paidFeaturesColl = db.collection('paidFeatures');
    const usersColl = db.collection('users');

    const resolved = await resolveLetterFromToken(token, db);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'Correspondence not found or link expired.' });
    }

    const { letter, recipient, tokenHash } = resolved;
    const now = new Date();
    const deliveryDate = new Date(letter.deliveryDate || letter.createdAt);
    const isArrived = now.getTime() >= deliveryDate.getTime();
    const remainingMs = Math.max(0, deliveryDate.getTime() - now.getTime());
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

    // STRICT SERVER-SIDE CHECK: NO UNSEALING ALLOWED BEFORE SCHEDULED ARRIVAL TIME
    if (!isArrived) {
      return res.status(403).json({
        success: false,
        error: `This correspondence is still sealed in transit. Scheduled arrival is ${deliveryDate.toUTCString()} (${remainingHours} hours remaining). The wax seal cannot be broken before the appointed hour.`,
      });
    }

    let isVerified = false;

    if (verificationMethod === 'open') {
      // Direct unsealing is permitted once the arrival time is reached
      isVerified = true;
    } else if (verificationMethod === 'otp') {
      const activeOtp = await otpColl.findOne({
        letterId: letter._id,
        used: false,
        expiresAt: { $gte: new Date() },
      });

      if (!activeOtp) {
        return res.status(400).json({ success: false, error: 'Verification code expired or invalid. Please request a new code.' });
      }

      if (activeOtp.attempts >= 5) {
        await otpColl.updateOne({ _id: activeOtp._id }, { $set: { used: true } });
        return res.status(429).json({ success: false, error: 'Maximum attempts exceeded. Verification locked.' });
      }

      const inputHash = hashSha256(String(otp || '').trim());
      if (inputHash === activeOtp.otpHash) {
        await otpColl.updateOne({ _id: activeOtp._id }, { $set: { used: true } });
        isVerified = true;
      } else {
        await otpColl.updateOne({ _id: activeOtp._id }, { $inc: { attempts: 1 } });
        return res.status(401).json({ success: false, error: 'Incorrect verification code.' });
      }
    } else if (verificationMethod === 'passphrase') {
      const inputPassphrase = String(passphrase || '').trim().toLowerCase();
      if (!letter.secretPassphraseHash) {
        return res.status(400).json({ success: false, error: 'No passphrase set on this letter.' });
      }

      let match = false;
      if (letter.secretPassphraseHash.startsWith('$2a$') || letter.secretPassphraseHash.startsWith('$2b$')) {
        match = await bcrypt.compare(inputPassphrase, letter.secretPassphraseHash);
      } else {
        match = hashSha256(inputPassphrase) === letter.secretPassphraseHash;
      }

      if (match) {
        isVerified = true;
      } else {
        return res.status(401).json({ success: false, error: 'Incorrect cipher passphrase.' });
      }
    }

    if (isVerified) {
      await lettersColl.updateOne(
        { _id: letter._id },
        {
          $set: {
            status: 'OPENED',
            openedAt: now,
            updatedAt: now,
          },
        }
      );

      if (recipient) {
        await recipientsColl.updateOne({ _id: recipient._id }, { $set: { verifiedAt: now } });
      }

      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        eventType: 'RECIPIENT_VERIFIED',
        metadata: { method: verificationMethod },
        createdAt: now,
      });

      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        eventType: 'LETTER_OPENED',
        createdAt: now,
      });

      const paidList = await (
        await paidFeaturesColl.find({
          letterId: letter._id.toString(),
          status: 'UNLOCKED',
        })
      ).toArray();

      // Resolve authoritative sender display name
      let senderDisplayName = letter.senderName || 'A correspondent';
      if ((!letter.senderName || letter.senderName === 'Correspondent') && letter.senderId) {
        try {
          const senderDoc = await usersColl.findOne({ _id: new ObjectId(letter.senderId) });
          if (senderDoc?.fullName) {
            senderDisplayName = senderDoc.fullName;
          }
        } catch {
          // Fallback
        }
      }

      // Generate signed recipient session token to preserve verified state across page refreshes
      const recipientAccessToken = 'rcpt_' + jwt.sign(
        { letterId: letter._id.toString(), tokenHash, verified: true, role: 'RECIPIENT' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set HTTP-only recipient verification cookie
      const secure = getCookieSecurity(req);
      res.cookie(`oldletters_rcpt_${letter._id.toString()}`, recipientAccessToken, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600 * 1000,
        path: '/',
      });

      // Check for approved personal message enclosure
      const paymentsColl = db.collection('payments');
      const mediaColl = db.collection('mediaMetadata');
      const approvedPayment = await paymentsColl.findOne({
        $or: [
          { letterId: letter._id.toString() },
          ...(letter.trackingCode ? [{ letterId: letter.trackingCode }] : []),
          ...(letter.mediaPaymentId ? [{ paymentId: letter.mediaPaymentId }, { _id: ObjectId.isValid(letter.mediaPaymentId) ? new ObjectId(letter.mediaPaymentId) : letter.mediaPaymentId }] : []),
          ...(letter.personalMessage?.paymentId ? [{ paymentId: letter.personalMessage.paymentId }] : []),
        ],
        status: 'APPROVED',
      });
      const approvedMedia = await mediaColl.findOne({
        $or: [
          { letterId: letter._id.toString() },
          ...(letter.mediaStorageKey ? [{ storageKey: letter.mediaStorageKey }] : []),
          ...(letter.personalMessage?.mediaStorageKey ? [{ storageKey: letter.personalMessage.mediaStorageKey }] : []),
          ...(approvedPayment ? [{ paymentId: approvedPayment._id.toString() }, { paymentId: approvedPayment.paymentId }] : []),
        ],
        mediaStatus: 'APPROVED',
      });
      const personalMessage = (approvedPayment && approvedMedia && approvedMedia.mediaStatus === 'APPROVED') ? {
        mediaType: approvedMedia.mediaType,
        storageKey: approvedMedia.storageKey,
        mediaStatus: 'APPROVED',
        streamUrl: `/api/delivery/media/${token}`,
      } : (letter.personalMessage?.mediaStatus === 'REJECTED' || approvedPayment?.status === 'REJECTED') ? {
        mediaStatus: 'REJECTED',
      } : null;

      return res.json({
        success: true,
        recipientAccessToken,
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          type: letter.letterType,
          templateId: letter.templateId,
          senderName: senderDisplayName,
          recipientName: recipient?.displayName || 'Recipient',
          letterDate: new Date(letter.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          greeting: letter.salutation,
          content: letter.body,
          signoff: letter.signoff,
          attachments: letter.attachments || [],
          status: 'OPENED',
          personalMessage,
          paidFeatures: paidList.map((pf: any) => pf.featureCode),
        },
      });
    }

    res.status(403).json({ success: false, error: 'Verification failed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ====================================================================
// DELIVERY SCHEDULER (Full 48-Hour Lifecycle & Email Dispatch)
// ====================================================================

// Core Delivery Scheduler implementing full 48-hour lifecycle
export async function runDeliveryScheduler(db: any) {
  const now = new Date();
  const lettersColl = db.collection('letters');
  const recipientsColl = db.collection('letterRecipients');
  const tokensColl = db.collection('deliveryTokens');
  const eventsColl = db.collection('deliveryEvents');
  const otpColl = db.collection('otpCodes');

  const processed = {
    halfwayCount: 0,
    preArrivalCount: 0,
    deliveredCount: 0,
    deliveredLetters: [] as any[],
  };

  const activeScheduledLetters = await lettersColl.find({ status: 'SCHEDULED' }).toArray();

  for (const letter of activeScheduledLetters) {
    const deliveryDate = new Date(letter.deliveryDate || letter.scheduledDeliveryAt || letter.createdAt);
    const postedAt = new Date(letter.postedAt || letter.createdAt);
    const elapsedMs = now.getTime() - postedAt.getTime();
    const msUntilArrival = deliveryDate.getTime() - now.getTime();

    // ----------------------------------------------------
    // EMAIL 3 — FIRST DAY / WAITING UPDATE (T+24h)
    // ----------------------------------------------------
    if (elapsedMs >= 24 * 3600 * 1000 && now < deliveryDate) {
      const alreadySentHalfway = await eventsColl.findOne({
        letterId: letter._id,
        eventType: 'HALFWAY_EMAIL_SENT',
      });

      if (!alreadySentHalfway) {
        // Atomic duplicate protection: insert event before dispatching to prevent duplicate emails from concurrent ticks
        try {
          await eventsColl.insertOne({
            _id: new ObjectId(),
            letterId: letter._id,
            eventType: 'HALFWAY_EMAIL_SENT',
            createdAt: now,
          });
        } catch {
          continue;
        }

        const recipient = await recipientsColl.findOne({ letterId: letter._id });
        const senderEmail = (letter.senderEmail || '').toLowerCase();
        const senderName = letter.senderName || 'Correspondent';
        const recipientEmail = (recipient?.email || letter.recipientEmail || '').toLowerCase();
        const recipientName = recipient?.displayName || letter.recipientName || 'Recipient';

        const tokenDoc = await tokensColl.findOne({ letterId: letter._id });
        const tokenStr = tokenDoc?.rawToken || letter.trackingCode;
        const recipientUrl = `${APP_URL}/letter/${tokenStr}`;
        const archiveUrl = `${APP_URL}/archive`;

        const scheduledArrivalFormatted = deliveryDate.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        });

        if (senderEmail) {
          try {
            const senderRes = await sendHalfwaySenderEmail({
              senderEmail,
              senderName,
              recipientName,
              trackingCode: letter.trackingCode,
              scheduledArrivalFormatted,
              archiveUrl,
            });

            logEmailDispatch({
              type: 'SENDER_WAITING_UPDATE',
              to: senderEmail,
              letterId: letter._id.toString(),
              dispatchRef: letter.trackingCode,
              status: senderRes.success ? 'SENT' : 'FAILED',
              error: senderRes.error,
            });
          } catch (err: any) {
            logEmailDispatch({
              type: 'SENDER_WAITING_UPDATE',
              to: senderEmail,
              letterId: letter._id.toString(),
              dispatchRef: letter.trackingCode,
              status: 'FAILED',
              error: err.message,
            });
          }
        }

        if (recipientEmail) {
          try {
            const rcptRes = await sendHalfwayRecipientEmail({
              recipientEmail,
              recipientName,
              trackingCode: letter.trackingCode,
              scheduledArrivalFormatted,
              recipientUrl,
            });

            logEmailDispatch({
              type: 'RECIPIENT_WAITING_UPDATE',
              to: recipientEmail,
              letterId: letter._id.toString(),
              dispatchRef: letter.trackingCode,
              status: rcptRes.success ? 'SENT' : 'FAILED',
              error: rcptRes.error,
            });
          } catch {}
        }

        processed.halfwayCount++;
      }
    }

    // ----------------------------------------------------
    // EMAIL 4 — 47.5 HOURS / 30 MINUTES BEFORE ARRIVAL (Pre-arrival OTP)
    // ----------------------------------------------------
    if (msUntilArrival <= 30 * 60 * 1000 && now < deliveryDate) {
      const alreadySentPreArrival = await eventsColl.findOne({
        letterId: letter._id,
        eventType: 'PRE_ARRIVAL_NOTICE_SENT',
      });

      if (!alreadySentPreArrival) {
        // Atomic duplicate protection: record pre-arrival event before sending email to prevent duplicate dispatches
        try {
          await eventsColl.insertOne({
            _id: new ObjectId(),
            letterId: letter._id,
            eventType: 'PRE_ARRIVAL_NOTICE_SENT',
            createdAt: now,
          });
        } catch {
          continue;
        }

        const recipient = await recipientsColl.findOne({ letterId: letter._id });
        const recipientEmail = (recipient?.email || letter.recipientEmail || '').toLowerCase();
        const recipientName = recipient?.displayName || letter.recipientName || 'Recipient';

        const tokenDoc = await tokensColl.findOne({ letterId: letter._id });
        const tokenStr = tokenDoc?.rawToken || letter.trackingCode;
        const recipientUrl = `${APP_URL}/letter/${tokenStr}`;

        const scheduledArrivalFormatted = deliveryDate.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        });

        if (recipientEmail) {
          if (letter.recipientVerificationMethod === 'otp') {
            const otpCode = crypto.randomInt(100000, 999999).toString();
            const otpHash = hashSha256(otpCode);
            const expiresAt = new Date(deliveryDate.getTime() + 60 * 60 * 1000);

            await otpColl.updateMany({ letterId: letter._id, used: false }, { $set: { used: true } });

            await otpColl.insertOne({
              _id: new ObjectId(),
              email: recipientEmail,
              letterId: letter._id,
              otpHash,
              attempts: 0,
              expiresAt,
              used: false,
              createdAt: now,
            });

            try {
              const otpRes = await sendPreArrivalOtpRecipientEmail({
                recipientEmail,
                recipientName,
                trackingCode: letter.trackingCode,
                otpCode,
                scheduledArrivalFormatted,
                recipientUrl,
              });

              logEmailDispatch({
                type: 'RECIPIENT_PRE_ARRIVAL_OTP',
                to: recipientEmail,
                letterId: letter._id.toString(),
                dispatchRef: letter.trackingCode,
                status: otpRes.success ? 'SENT' : 'FAILED',
                error: otpRes.error,
              });
            } catch (err: any) {
              logEmailDispatch({
                type: 'RECIPIENT_PRE_ARRIVAL_OTP',
                to: recipientEmail,
                letterId: letter._id.toString(),
                dispatchRef: letter.trackingCode,
                status: 'FAILED',
                error: err.message,
              });
            }
          }

          processed.preArrivalCount++;
        }
      }
    }
  }

  // ----------------------------------------------------
  // EMAIL 5 — EXACT 48 HOURS (Arrival / Opening Eligible)
  // ----------------------------------------------------
  const dueLetters = await lettersColl.find({
    status: 'SCHEDULED',
    deliveryDate: { $lte: now },
  }).toArray();

  for (const letter of dueLetters) {
    const updated = await lettersColl.findOneAndUpdate(
      { _id: letter._id, status: 'SCHEDULED' },
      {
        $set: {
          status: 'DELIVERED',
          deliveredAt: now,
          updatedAt: now,
        },
      }
    );

    if (!updated) continue;

    await eventsColl.insertOne({
      _id: new ObjectId(),
      letterId: letter._id,
      eventType: 'LETTER_DELIVERED',
      createdAt: now,
    });

    const recipient = await recipientsColl.findOne({ letterId: letter._id });
    const recipientEmail = (recipient?.email || letter.recipientEmail || '').toLowerCase();
    const recipientName = recipient?.displayName || letter.recipientName || 'Recipient';

    const tokenDoc = await tokensColl.findOne({ letterId: letter._id });
    let tokenStr = tokenDoc?.rawToken;
    if (!tokenStr) {
      tokenStr = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashSha256(tokenStr);
      await tokensColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        tokenHash,
        rawToken: tokenStr,
        expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
        createdAt: now,
      });
    }

    const deliveryUrl = `${APP_URL}/letter/${tokenStr}`;
    const arrivalFormatted = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    if (recipientEmail) {
      if (letter.recipientVerificationMethod === 'otp') {
        const existingOtp = await otpColl.findOne({
          letterId: letter._id,
          used: false,
          expiresAt: { $gte: now },
        });
        if (!existingOtp) {
          const otpCode = crypto.randomInt(100000, 999999).toString();
          const otpHash = hashSha256(otpCode);
          await otpColl.insertOne({
            _id: new ObjectId(),
            email: recipientEmail,
            letterId: letter._id,
            otpHash,
            attempts: 0,
            expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
            used: false,
            createdAt: now,
          });
        }
      }

      const hasApprovedMedia = Boolean(
        letter.hasMediaAttachment &&
        (letter.mediaStatus === 'APPROVED' || letter.personalMessage?.mediaStatus === 'APPROVED')
      );
      const enclosureMediaType = letter.mediaType || letter.personalMessage?.type || (letter.personalMessage?.mediaType);

      try {
        const arrivalRes = await sendArrivalRecipientEmail({
          recipientEmail,
          recipientName,
          trackingCode: letter.trackingCode,
          arrivalFormatted,
          recipientUrl: deliveryUrl,
          requiresOtp: letter.recipientVerificationMethod === 'otp',
          hasApprovedMedia,
          mediaType: enclosureMediaType === 'VIDEO' ? 'VIDEO' : enclosureMediaType === 'VOICE' ? 'VOICE' : undefined,
        });

        logEmailDispatch({
          type: 'LETTER_ARRIVED',
          to: recipientEmail,
          letterId: letter._id.toString(),
          paymentId: letter.mediaPaymentId || undefined,
          dispatchRef: letter.trackingCode,
          status: arrivalRes.success ? 'SENT' : 'FAILED',
          error: arrivalRes.error,
          timestamp: new Date().toISOString(),
        });

        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: letter._id,
          eventType: 'RECIPIENT_ARRIVAL_EMAIL_SENT',
          metadata: { recipientEmail, hasApprovedMedia },
          createdAt: now,
        });
      } catch (err: any) {
        logEmailDispatch({
          type: 'LETTER_ARRIVED',
          to: recipientEmail,
          letterId: letter._id.toString(),
          paymentId: letter.mediaPaymentId || undefined,
          dispatchRef: letter.trackingCode,
          status: 'FAILED',
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    processed.deliveredCount++;
    processed.deliveredLetters.push({
      id: letter._id.toString(),
      trackingCode: letter.trackingCode,
      recipient: recipientEmail,
    });
  }

  // ----------------------------------------------------
  // MEDIA RETENTION & AUTO-DELETION (Part 13 & 14)
  // After successful delivery and post-delivery retention period (default 7 days):
  // Permanently delete: GridFS file, GridFS chunks, media metadata; set mediaStatus = DELETED.
  // ----------------------------------------------------
  const mediaRetentionMs = Number(process.env.MEDIA_RETENTION_MS) || (7 * 24 * 3600 * 1000);
  const mediaRetentionCutoff = new Date(now.getTime() - mediaRetentionMs);
  const mediaMetadataColl = db.collection('mediaMetadata');
  const paymentsColl = db.collection('payments');

  try {
    const deliveredPastRetention = await lettersColl.find({
      status: { $in: ['DELIVERED', 'OPENED', 'COMPLETED'] },
      $or: [
        { deliveredAt: { $lte: mediaRetentionCutoff } },
        { deliveryDate: { $lte: mediaRetentionCutoff } },
      ],
    }).toArray();

    let mediaCleanedCount = 0;
    for (const dLetter of deliveredPastRetention) {
      const activeMedia = await mediaMetadataColl.find({
        letterId: dLetter._id.toString(),
        mediaStatus: { $ne: 'DELETED' },
      }).toArray();

      for (const m of activeMedia) {
        if (m.gridFsFileId) {
          try {
            await deleteGridFSFile('letterMedia', m.gridFsFileId);
          } catch {}
        }
        await mediaMetadataColl.updateOne(
          { _id: m._id },
          {
            $set: {
              mediaStatus: 'DELETED',
              storageKey: '',
              deletedAt: now,
              updatedAt: now,
            },
          }
        );
        if (m.paymentId) {
          await paymentsColl.updateOne(
            {
              $or: [
                { _id: ObjectId.isValid(m.paymentId) ? new ObjectId(m.paymentId) : m.paymentId },
                { paymentId: m.paymentId },
              ],
            },
            {
              $set: {
                mediaStatus: 'DELETED',
                mediaStorageKey: null,
                updatedAt: now,
              },
            }
          );
        }
        mediaCleanedCount++;
      }
    }
    (processed as any).mediaCleanedCount = mediaCleanedCount;
  } catch (mediaCleanupErr) {
    console.warn('[OLD-LETTERS Scheduler] Media retention cleanup notice:', mediaCleanupErr);
  }

  return processed;
}

// Canonical production scheduler trigger endpoint (HTTP GET for Vercel Cron, POST for manual/testing)
app.all(['/api/scheduler/tick', '/api/cron/delivery', '/api/internal/delivery/run'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const incomingAuth = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
    const cronHeader = (req.headers['x-cron-secret'] as string)?.trim();
    const querySecret = (req.query.secret as string)?.trim();

    // In production or when CRON_SECRET is set, strictly enforce authorization
    const expectedSecret = process.env.CRON_SECRET || CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

    if (process.env.CRON_SECRET || isProduction) {
      const authorized =
        (expectedSecret && incomingAuth === expectedSecret) ||
        (expectedSecret && cronHeader === expectedSecret) ||
        (expectedSecret && querySecret === expectedSecret);

      if (!authorized) {
        const isAdmin = await verifyAdminServerSide(req);
        if (!isAdmin) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized cron dispatch. Valid Authorization: Bearer <CRON_SECRET> or admin session required.',
          });
        }
      }
    }

    const db = await getDb();
    const result = await runDeliveryScheduler(db);

    res.json({
      success: true,
      endpoint: '/api/scheduler/tick',
      canonical: true,
      method: req.method,
      timestamp: new Date().toISOString(),
      halfwayCount: result.halfwayCount,
      preArrivalCount: result.preArrivalCount,
      deliveredCount: result.deliveredCount,
      processed: result.deliveredLetters,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Testing / Simulation: Advance delivery date for a specific letter (for QA, testing & simulation)
app.post(['/api/testing/advance-delivery', '/api/delivery/advance'], async (req, res) => {
  try {
    const { token, trackingCode, stage } = req.body;
    const lookup = token || trackingCode;
    if (!lookup) {
      return res.status(400).json({ success: false, error: 'Token or tracking code required.' });
    }

    const db = await getDb();
    const resolved = await resolveLetterFromToken(lookup, db);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'Correspondence not found.' });
    }

    const { letter } = resolved;
    const lettersColl = db.collection('letters');

    let newDeliveryDate = new Date(Date.now() - 60 * 1000); // 1 minute in past (arrived)
    let newPostedAt = letter.postedAt || letter.createdAt;

    if (stage === 'halfway' || stage === '24h') {
      newPostedAt = new Date(Date.now() - 25 * 3600 * 1000); // 25 hours ago
      newDeliveryDate = new Date(Date.now() + 23 * 3600 * 1000);
      await lettersColl.updateOne(
        { _id: letter._id },
        { $set: { postedAt: newPostedAt, deliveryDate: newDeliveryDate, scheduledDeliveryAt: newDeliveryDate, status: 'SCHEDULED', updatedAt: new Date() } }
      );
    } else if (stage === 'pre-arrival' || stage === '30m' || stage === '47.5h') {
      newDeliveryDate = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes in future (< 30m window)
      await lettersColl.updateOne(
        { _id: letter._id },
        { $set: { deliveryDate: newDeliveryDate, scheduledDeliveryAt: newDeliveryDate, status: 'SCHEDULED', updatedAt: new Date() } }
      );
    } else {
      // arrived
      await lettersColl.updateOne(
        { _id: letter._id },
        { $set: { deliveryDate: newDeliveryDate, scheduledDeliveryAt: newDeliveryDate, status: 'SCHEDULED', updatedAt: new Date() } }
      );
    }

    const schedulerResult = await runDeliveryScheduler(db);

    res.json({
      success: true,
      message: `Delivery date advanced for stage '${stage || 'arrived'}'. Scheduler processed successfully.`,
      deliveryDate: newDeliveryDate.toISOString(),
      trackingCode: letter.trackingCode,
      schedulerResult,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// PAYMENTS & PAID FEATURES (Manual UPI, Strictly PENDING by default)
// ====================================================================

// 1. Submit UTR Payment (Strictly authenticated, letter ownership verified, duplicate protected)
app.post(['/api/payments', '/api/payments/create', '/payments', '/payments/create'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = SubmitPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues.map((e: any) => e.message).join(', '),
      });
    }

    const input = parseResult.data;
    const db = await getDb();
    const paymentsColl = db.collection('payments');
    const lettersColl = db.collection('letters');
    const eventsColl = db.collection('deliveryEvents');
    const userId = req.user!.id;
    const userEmail = (req.user!.email || '').toLowerCase();

    // Verify Letter Ownership if letterId is supplied
    let letter: any = null;
    if (input.letterId) {
      const letterConds: any[] = [{ trackingCode: input.letterId }];
      if (ObjectId.isValid(input.letterId)) {
        letterConds.unshift({ _id: new ObjectId(input.letterId) });
      } else {
        letterConds.unshift({ _id: input.letterId as any });
      }
      letter = await lettersColl.findOne({ $or: letterConds });

      if (letter) {
        const isOwner =
          letter.senderId?.toString() === userId.toString() ||
          (ObjectId.isValid(userId) && letter.senderId?.toString() === new ObjectId(userId).toString());
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            error: 'Letter ownership verification failed. You may only submit payments for your own correspondence.',
          });
        }
      }
    }

    // Determine normalized media type & pricing (VOICE: 99, VIDEO: 149)
    const normalizedMediaType: 'VOICE' | 'VIDEO' =
      input.mediaType === 'VIDEO' ||
      input.featureCode === 'VIDEO_NOTE' ||
      input.featureCode === 'VIDEO' ||
      input.amount === 149
        ? 'VIDEO'
        : 'VOICE';

    const cleanUpi = input.upiReference.trim();
    if (cleanUpi.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A valid UPI reference / UTR number (at least 6 alphanumeric characters) is required.',
      });
    }

    // Duplicate Protection: If exact same UTR was already submitted by this user, return existing payment record
    const existingPayment = await paymentsColl.findOne({
      upiReference: cleanUpi,
      $or: [
        { userId: userId.toString() },
        ...(ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : []),
      ],
    });

    const recipientEmail = (input.recipientEmail || letter?.recipientEmail || '').toLowerCase();
    const recipientName = input.recipientName || letter?.recipientName || 'Recipient';
    const senderName = input.senderName || req.user?.fullName || letter?.senderName || 'Correspondent';
    const featureType = normalizedMediaType === 'VIDEO' ? 'VIDEO_MESSAGE' : 'VOICE_MESSAGE';

    if (existingPayment) {
      return res.status(200).json({
        success: true,
        paymentId: existingPayment.paymentId || `PAY-${existingPayment._id.toString().slice(-8).toUpperCase()}`,
        id: existingPayment._id.toString(),
        payment: {
          id: existingPayment._id.toString(),
          paymentId: existingPayment.paymentId || `PAY-${existingPayment._id.toString().slice(-8).toUpperCase()}`,
          letterId: existingPayment.letterId || null,
          userId: existingPayment.userId?.toString(),
          userEmail: existingPayment.userEmail || userEmail,
          senderName: existingPayment.senderName || senderName,
          recipientEmail: existingPayment.recipientEmail || recipientEmail,
          recipientName: existingPayment.recipientName || recipientName,
          amount: existingPayment.amount,
          currency: existingPayment.currency || 'INR',
          paymentMethod: 'UPI',
          upiReference: existingPayment.upiReference,
          mediaType: existingPayment.mediaType || normalizedMediaType,
          featureType: existingPayment.featureType || featureType,
          status: existingPayment.status || 'PENDING',
          mediaStatus: existingPayment.mediaStatus || 'AWAITING_RECORDING',
          mediaStorageKey: existingPayment.mediaStorageKey || null,
          hasMediaAttachment: Boolean(existingPayment.hasMediaAttachment),
          createdAt: existingPayment.createdAt instanceof Date ? existingPayment.createdAt.toISOString() : existingPayment.createdAt,
          updatedAt: existingPayment.updatedAt instanceof Date ? existingPayment.updatedAt.toISOString() : existingPayment.updatedAt,
        },
        message: 'Existing pending UPI payment reference returned.',
      });
    }

    const paymentId = new ObjectId();
    const paymentIdStr = `PAY-${paymentId.toString().slice(-8).toUpperCase()}`;
    const now = new Date();

    const paymentRecord: any = {
      _id: paymentId,
      paymentId: paymentIdStr,
      letterId: letter ? letter._id.toString() : (input.letterId || undefined),
      userId: userId.toString(),
      userEmail,
      senderName,
      recipientEmail,
      recipientName,
      featureType,
      mediaType: normalizedMediaType,
      featureCode: input.featureCode || normalizedMediaType,
      amount: input.amount,
      currency: 'INR',
      paymentMethod: 'UPI',
      upiReference: cleanUpi,
      status: 'PENDING',
      mediaStatus: 'AWAITING_RECORDING',
      mediaStorageKey: null,
      hasMediaAttachment: false,
      paymentScreenshotId: input.screenshotUrl || undefined,
      adminNote: null,
      verifiedBy: null,
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await paymentsColl.insertOne(paymentRecord);

    if (letter) {
      try {
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: letter._id,
          eventType: 'PAYMENT_CREATED',
          metadata: { paymentId: paymentIdStr, amount: input.amount, upiReference: cleanUpi, mediaType: normalizedMediaType },
          createdAt: now,
        });
      } catch {}
    }

    // EMAIL A: Payment Submitted for Verification (To Sender)
    try {
      const payMailRes = await sendPaymentSubmittedSenderEmail({
        senderEmail: userEmail,
        senderName,
        paymentId: paymentIdStr,
        upiReference: cleanUpi,
        amount: input.amount,
        currency: 'INR',
        mediaType: normalizedMediaType,
        recipientName: recipientName || undefined,
        letterReference: letter?.trackingCode || input.letterId || undefined,
      });

      logEmailDispatch({
        type: 'PAYMENT_SUBMITTED',
        to: userEmail,
        letterId: paymentRecord.letterId || '',
        paymentId: paymentIdStr,
        dispatchRef: paymentIdStr,
        status: payMailRes.success ? 'SENT' : 'FAILED',
        error: payMailRes.error,
        timestamp: new Date().toISOString(),
      });
    } catch (emailErr: any) {
      logEmailDispatch({
        type: 'PAYMENT_SUBMITTED',
        to: userEmail,
        letterId: paymentRecord.letterId || '',
        paymentId: paymentIdStr,
        dispatchRef: paymentIdStr,
        status: 'FAILED',
        error: emailErr.message,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      paymentId: paymentIdStr,
      id: paymentId.toString(),
      payment: {
        id: paymentId.toString(),
        paymentId: paymentIdStr,
        letterId: paymentRecord.letterId || null,
        userId: userId.toString(),
        userEmail,
        senderName,
        recipientEmail,
        recipientName,
        amount: input.amount,
        currency: 'INR',
        paymentMethod: 'UPI',
        upiReference: cleanUpi,
        mediaType: normalizedMediaType,
        featureType,
        status: 'PENDING',
        mediaStatus: 'AWAITING_RECORDING',
        mediaStorageKey: null,
        hasMediaAttachment: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      message: 'UPI payment submitted. Awaiting administrative verification.',
    });
  } catch (err: any) {
    console.error('[OLD-LETTERS Payment Error]', err);
    const isDbUnavailable =
      err?.message?.includes('Database connection unavailable') ||
      err?.message?.includes('MongoDB Atlas connection unavailable') ||
      err?.message?.includes('MONGODB_URI is missing or invalid') ||
      err?.message?.includes('querySrv') ||
      err?.message?.includes('ENOTFOUND') ||
      err?.message?.includes('ETIMEDOUT') ||
      err?.name === 'MongoServerSelectionError' ||
      err?.name === 'MongoNetworkError';
    const statusCode = isDbUnavailable ? 503 : 500;
    const clientMsg = isDbUnavailable
      ? 'Payment could not be registered because the payment service is temporarily unavailable. Please try again.'
      : (err.message || 'Payment submission could not be completed.');
    res.status(statusCode).json({ success: false, error: clientMsg });
  }
});

// 2. Upload Recorded Audio/Video Media to Private GridFS Vault
app.post(['/api/payments/:id/media', '/api/letters/:id/media', '/payments/:id/media', '/letters/:id/media'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const rawId = (req.params.id || req.body?.paymentId || '').trim();
    const db = await getDb();
    const paymentsColl = db.collection('payments');
    const lettersColl = db.collection('letters');
    const mediaMetadataColl = db.collection('mediaMetadata');
    const userId = req.user!.id;
    const now = new Date();

    if (!rawId || rawId === 'undefined' || rawId === 'null') {
      return res.status(400).json({
        success: false,
        error: 'A valid payment reference ID is required to link media enclosures.',
      });
    }

    // Find target payment record by any valid identifier
    const lookupConditions: any[] = [
      { paymentId: rawId },
      { paymentId: rawId.toUpperCase() },
      { letterId: rawId },
      { upiReference: rawId },
      { _id: rawId },
    ];
    if (ObjectId.isValid(rawId)) {
      try {
        lookupConditions.unshift({ _id: new ObjectId(rawId) });
      } catch {}
    }

    if (req.body?.paymentId && req.body.paymentId !== rawId) {
      const altId = req.body.paymentId.trim();
      lookupConditions.push({ paymentId: altId });
      lookupConditions.push({ paymentId: altId.toUpperCase() });
      if (ObjectId.isValid(altId)) {
        try {
          lookupConditions.push({ _id: new ObjectId(altId) });
        } catch {}
      }
    }

    let payment: any = await paymentsColl.findOne({ $or: lookupConditions });

    // Fallback: If not matched directly, find the user's latest PENDING payment created in the last 2 hours
    if (!payment) {
      payment = await paymentsColl.findOne(
        {
          $or: [
            { userId: userId.toString() },
            ...(ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : []),
            ...(req.user?.email ? [{ userEmail: req.user.email.toLowerCase() }] : []),
          ],
          status: 'PENDING',
        },
        { sort: { createdAt: -1 } }
      );
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: `Associated payment record not found. Please ensure payment is submitted before uploading media.`,
      });
    }

    const isOwner =
      payment.userId?.toString() === userId.toString() ||
      (ObjectId.isValid(userId) && payment.userId?.toString() === new ObjectId(userId).toString());
    const isAdmin = await verifyAdminServerSide(req);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only attach media to your own payment.' });
    }

    // Extract binary buffer from request (JSON base64 or raw stream)
    let buffer: Buffer | null = null;
    let mimeType = 'audio/webm';
    let durationSeconds = 0;

    if (req.body && req.body.data) {
      // Base64 payload
      const base64Data = req.body.data.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      mimeType = req.body.mimeType || (payment.mediaType === 'VIDEO' ? 'video/webm' : 'audio/webm');
      durationSeconds = Number(req.body.durationSeconds) || 0;
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
      mimeType = (req.headers['content-type'] as string) || (payment.mediaType === 'VIDEO' ? 'video/webm' : 'audio/webm');
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'No media binary received in request.' });
    }

    const mediaType: 'VOICE' | 'VIDEO' =
      payment.mediaType || (mimeType.toLowerCase().includes('video') ? 'VIDEO' : 'VOICE');
    const storageKey = `media_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const filename = `${storageKey}.${mediaType === 'VIDEO' ? 'webm' : 'webm'}`;

    // Upload to GridFS
    const gridResult = await uploadGridFSBuffer('letterMedia', filename, buffer, {
      paymentId: payment._id.toString(),
      letterId: payment.letterId || '',
      userId: userId.toString(),
      mimeType,
      mediaType,
      durationSeconds,
    });

    // Save Media Metadata Document
    const mediaDoc: LetterMediaDoc = {
      _id: new ObjectId(),
      letterId: payment.letterId || '',
      paymentId: payment._id.toString(),
      userId: userId.toString(),
      mediaType,
      mediaStatus: 'PENDING',
      storageKey,
      mimeType,
      fileSize: buffer.length,
      durationSeconds,
      gridFsFileId: gridResult.fileId,
      createdAt: now,
      updatedAt: now,
    };

    await mediaMetadataColl.insertOne(mediaDoc);

    // Update Payment Record with media link
    await paymentsColl.updateOne(
      { _id: payment._id },
      {
        $set: {
          mediaStorageKey: storageKey,
          hasMediaAttachment: true,
          mediaType,
          mediaStatus: 'PENDING',
          updatedAt: now,
        },
      }
    );

    // Update Letter if linked
    if (payment.letterId) {
      try {
        const lId = ObjectId.isValid(payment.letterId) ? new ObjectId(payment.letterId) : payment.letterId;
        await lettersColl.updateOne(
          { _id: lId },
          {
            $set: {
              hasMediaAttachment: true,
              mediaType,
              mediaStorageKey: storageKey,
              mediaPaymentId: payment._id.toString(),
              mediaStatus: 'PENDING',
              updatedAt: now,
            },
          }
        );
      } catch {}
    }

    res.status(201).json({
      success: true,
      storageKey,
      mediaType,
      mediaStatus: 'PENDING',
      fileSize: buffer.length,
      durationSeconds,
      paymentId: payment.paymentId || payment._id.toString(),
      message: 'Media recording successfully stored in private GridFS vault and linked to payment.',
    });
  } catch (err: any) {
    console.error('[OLD-LETTERS Media Upload Error]', err);
    const isDbUnavailable =
      err?.message?.includes('Database connection unavailable') ||
      err?.message?.includes('MongoDB Atlas connection unavailable') ||
      err?.message?.includes('GridFS storage unavailable') ||
      err?.message?.includes('MONGODB_URI is missing or invalid') ||
      err?.message?.includes('querySrv') ||
      err?.message?.includes('ENOTFOUND') ||
      err?.message?.includes('ETIMEDOUT') ||
      err?.name === 'MongoServerSelectionError' ||
      err?.name === 'MongoNetworkError';
    const statusCode = isDbUnavailable ? 503 : 500;
    const clientMsg = isDbUnavailable
      ? 'The postal media vault is temporarily unavailable. Please try again in a few moments.'
      : (err.message || 'Failed to upload media enclosure.');
    res.status(statusCode).json({ success: false, error: clientMsg });
  }
});

// 3. Admin: Stream Private Media for Verification Preview
app.get(['/api/admin/media/:storageKey', '/admin/media/:storageKey', '/api/media/:storageKey', '/media/:storageKey'], requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const storageKey = req.params.storageKey;
    const db = await getDb();
    const mediaColl = db.collection('mediaMetadata');

    const media = await mediaColl.findOne({ storageKey });
    if (!media || !media.gridFsFileId) {
      return res.status(404).json({ success: false, error: 'Media file not found in vault.' });
    }

    const download = await downloadGridFSBuffer('letterMedia', media.gridFsFileId);
    if (!download) {
      return res.status(404).json({ success: false, error: 'Media stream not found in GridFS.' });
    }

    res.setHeader('Content-Type', media.mimeType || (media.mediaType === 'VIDEO' ? 'video/webm' : 'audio/webm'));
    res.setHeader('Content-Length', download.buffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, no-cache');
    res.send(download.buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Recipient: Stream Private Media (Strictly upon arrival & after admin verification approval)
app.get(['/api/delivery/media/:token', '/api/delivery/media/:token/:storageKey', '/delivery/media/:token', '/delivery/media/:token/:storageKey'], async (req, res) => {
  try {
    const token = req.params.token;
    const db = await getDb();
    const tokensColl = db.collection('deliveryTokens');
    const lettersColl = db.collection('letters');
    const paymentsColl = db.collection('payments');
    const mediaColl = db.collection('mediaMetadata');

    // 1. Look up token
    const tokenHash = hashSha256(token);
    const tokenDoc = await tokensColl.findOne({
      $or: [{ tokenHash }, { rawToken: token }, { letterId: token }],
    });

    if (!tokenDoc) {
      return res.status(404).json({ success: false, error: 'Invalid delivery token.' });
    }

    // 2. Look up letter
    const letter = await lettersColl.findOne({ _id: new ObjectId(tokenDoc.letterId.toString()) });
    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    const now = new Date();
    const deliveryDate = new Date(letter.deliveryDate || letter.scheduledDeliveryAt);
    const isDelivered = letter.status !== 'SCHEDULED' && letter.status !== 'DRAFT';

    if (!isDelivered && now < deliveryDate) {
      return res.status(403).json({ success: false, error: 'Sealed in transit. Media is locked until arrival.' });
    }

    // 3. Find payment & media metadata
    const payment = await paymentsColl.findOne({
      $or: [
        { letterId: letter._id.toString() },
        ...(letter.trackingCode ? [{ letterId: letter.trackingCode }] : []),
        ...(letter.mediaPaymentId ? [{ paymentId: letter.mediaPaymentId }, { _id: ObjectId.isValid(letter.mediaPaymentId) ? new ObjectId(letter.mediaPaymentId) : letter.mediaPaymentId }] : []),
        ...(letter.personalMessage?.paymentId ? [{ paymentId: letter.personalMessage.paymentId }] : []),
      ],
    });
    const media = await mediaColl.findOne({
      $or: [
        { letterId: letter._id.toString() },
        ...(letter.mediaStorageKey ? [{ storageKey: letter.mediaStorageKey }] : []),
        ...(letter.personalMessage?.mediaStorageKey ? [{ storageKey: letter.personalMessage.mediaStorageKey }] : []),
        ...(payment ? [{ paymentId: payment._id.toString() }, { paymentId: payment.paymentId }] : []),
      ],
    });

    // CRITICAL (Part 9, 10, 11): Only APPROVED payment & media are delivered
    if (!payment || payment.status !== 'APPROVED' || !media || media.mediaStatus !== 'APPROVED') {
      return res.status(404).json({
        success: false,
        error: 'Personal voice/video message was not approved for delivery. Recipient receives letter only.',
      });
    }

    // CRITICAL (Part 14): Expired / deleted media returns 410 Gone
    if (media.mediaStatus === 'DELETED' || !media.gridFsFileId) {
      return res.status(410).json({
        success: false,
        error: 'This personal message has expired and been permanently deleted per retention policy.',
      });
    }

    const download = await downloadGridFSBuffer('letterMedia', media.gridFsFileId);
    if (!download) {
      return res.status(404).json({ success: false, error: 'Media stream not found in GridFS.' });
    }

    res.setHeader('Content-Type', media.mimeType || (media.mediaType === 'VIDEO' ? 'video/webm' : 'audio/webm'));
    res.setHeader('Content-Length', download.buffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, no-cache');
    res.send(download.buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Sender Preview: Stream Own Media
app.get('/api/user/media/:storageKey', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const storageKey = req.params.storageKey;
    const db = await getDb();
    const mediaColl = db.collection('mediaMetadata');
    const userId = req.user!.id;

    const media = await mediaColl.findOne({ storageKey });
    if (!media || !media.gridFsFileId) {
      return res.status(404).json({ success: false, error: 'Media recording not found.' });
    }

    const isOwner =
      media.userId?.toString() === userId.toString() ||
      (ObjectId.isValid(userId) && media.userId?.toString() === new ObjectId(userId).toString());
    const isAdmin = await verifyAdminServerSide(req);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied to this media recording.' });
    }

    const download = await downloadGridFSBuffer('letterMedia', media.gridFsFileId);
    if (!download) {
      return res.status(404).json({ success: false, error: 'Media file not found in vault.' });
    }

    res.setHeader('Content-Type', media.mimeType || (media.mediaType === 'VIDEO' ? 'video/webm' : 'audio/webm'));
    res.setHeader('Content-Length', download.buffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, no-cache');
    res.send(download.buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. List User's Payments (All statuses: PENDING, APPROVED, REJECTED)
app.get(['/api/payments', '/api/user/payments', '/payments', '/user/payments'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection('payments');
    const lettersColl = db.collection('letters');
    const userId = req.user!.id;

    const query: any = {
      $or: [
        { userId: userId.toString() },
        ...(ObjectId.isValid(userId) ? [{ userId: new ObjectId(userId) }] : []),
        ...(req.user?.email ? [{ userEmail: req.user.email.toLowerCase() }] : []),
      ],
    };

    const list = await (paymentsColl.find(query) as any).sort({ createdAt: -1 }).toArray();

    const featureDescriptions: Record<string, string> = {
      VOICE: 'Audio Epistolary Wax Seal (Voice Message)',
      VIDEO: 'Video Epistolary Parchment (Video Message)',
      VOICE_NOTE: 'Audio Epistolary Wax Seal (Voice Message)',
      VIDEO_NOTE: 'Video Epistolary Parchment (Video Message)',
      LIVE_MEETING: 'Bureau Live Dispatch Meeting',
    };

    const enriched = await Promise.all(
      list.map(async (p: any) => {
        let recipientName = p.recipientName || 'Postal Recipient';
        let recipientEmail = p.recipientEmail || '';
        let trackingCode = 'OL-BUREAU';

        if (p.letterId) {
          try {
            const letter = await lettersColl.findOne({
              $or: [
                { _id: ObjectId.isValid(p.letterId) ? new ObjectId(p.letterId) : p.letterId },
                { trackingCode: p.letterId },
              ],
            });
            if (letter) {
              recipientName = letter.recipientName || recipientName;
              recipientEmail = letter.recipientEmail || recipientEmail;
              trackingCode = letter.trackingCode || trackingCode;
            }
          } catch {}
        }

        const mediaType = p.mediaType || (p.featureCode?.includes('VIDEO') ? 'VIDEO' : 'VOICE');

        return {
          id: p._id.toString(),
          paymentId: p.paymentId || `PAY-${p._id.toString().slice(-8).toUpperCase()}`,
          letterId: p.letterId || null,
          trackingCode,
          recipientName,
          recipientEmail,
          mediaType,
          featureCode: p.featureCode || mediaType,
          description: featureDescriptions[mediaType] || featureDescriptions[p.featureCode] || 'Personal Message Enclosure',
          amount: p.amount,
          currency: p.currency || 'INR',
          paymentMethod: p.paymentMethod || 'UPI',
          upiReference: p.upiReference,
          status: p.status || 'PENDING',
          mediaStatus: p.mediaStatus || 'PENDING',
          mediaStorageKey: p.mediaStorageKey || null,
          hasMediaAttachment: Boolean(p.hasMediaAttachment),
          refundStatus: p.status === 'REFUNDED' ? 'REFUNDED' : 'NONE',
          adminNote: p.adminNote || null,
          verifiedBy: p.verifiedBy || null,
          verifiedAt: p.verifiedAt ? (p.verifiedAt instanceof Date ? p.verifiedAt.toISOString() : p.verifiedAt) : null,
          createdAt: p.createdAt ? (p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt) : new Date().toISOString(),
          updatedAt: p.updatedAt ? (p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt) : new Date().toISOString(),
        };
      })
    );

    res.json({
      success: true,
      payments: enriched,
    });
  } catch (err: any) {
    console.error('[OLD-LETTERS List Payments Error]', err);
    const isDbUnavailable =
      err?.message?.includes('Database connection unavailable') ||
      err?.message?.includes('MongoDB Atlas connection unavailable') ||
      err?.message?.includes('MONGODB_URI is missing or invalid') ||
      err?.message?.includes('querySrv') ||
      err?.message?.includes('ENOTFOUND') ||
      err?.message?.includes('ETIMEDOUT') ||
      err?.name === 'MongoServerSelectionError' ||
      err?.name === 'MongoNetworkError';
    const statusCode = isDbUnavailable ? 503 : 500;
    res.status(statusCode).json({ success: false, error: err.message, payments: [] });
  }
});

// 7. Single Payment Lookup (Protected: user or admin only)
app.get(['/api/payments/:id', '/payments/:id'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection('payments');
    const lettersColl = db.collection('letters');
    const userId = req.user!.id;
    const paymentId = req.params.id;

    let payment: any = null;
    if (ObjectId.isValid(paymentId)) {
      payment = await paymentsColl.findOne({ _id: new ObjectId(paymentId) });
    }
    if (!payment) {
      payment = await paymentsColl.findOne({
        $or: [{ paymentId }, { upiReference: paymentId }, { _id: paymentId as any }],
      });
    }

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found.' });
    }

    const isAdmin = await verifyAdminServerSide(req);
    const isOwner =
      payment.userId?.toString() === userId.toString() ||
      (ObjectId.isValid(userId) && payment.userId?.toString() === new ObjectId(userId).toString());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied to this payment record.' });
    }

    let recipientName = payment.recipientName || 'Postal Recipient';
    let recipientEmail = payment.recipientEmail || '';
    let trackingCode = 'OL-BUREAU';
    if (payment.letterId) {
      try {
        const letter = await lettersColl.findOne({
          $or: [
            { _id: ObjectId.isValid(payment.letterId) ? new ObjectId(payment.letterId) : payment.letterId },
            { trackingCode: payment.letterId },
          ],
        });
        if (letter) {
          recipientName = letter.recipientName || recipientName;
          recipientEmail = letter.recipientEmail || recipientEmail;
          trackingCode = letter.trackingCode;
        }
      } catch {}
    }

    const mediaType = payment.mediaType || (payment.featureCode?.includes('VIDEO') ? 'VIDEO' : 'VOICE');

    res.json({
      success: true,
      payment: {
        id: payment._id.toString(),
        paymentId: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
        letterId: payment.letterId || null,
        trackingCode,
        recipientName,
        recipientEmail,
        mediaType,
        featureCode: payment.featureCode || mediaType,
        description: mediaType === 'VIDEO' ? 'Video Message Enclosure' : 'Voice Message Enclosure',
        amount: payment.amount,
        currency: payment.currency || 'INR',
        paymentMethod: payment.paymentMethod || 'UPI',
        upiReference: payment.upiReference,
        status: payment.status || 'PENDING',
        mediaStatus: payment.mediaStatus || 'PENDING',
        mediaStorageKey: payment.mediaStorageKey || null,
        hasMediaAttachment: Boolean(payment.hasMediaAttachment),
        refundStatus: payment.status === 'REFUNDED' ? 'REFUNDED' : 'NONE',
        adminNote: payment.adminNote || null,
        verifiedBy: payment.verifiedBy || null,
        verifiedAt: payment.verifiedAt ? (payment.verifiedAt instanceof Date ? payment.verifiedAt.toISOString() : payment.verifiedAt) : null,
        createdAt: payment.createdAt ? (payment.createdAt instanceof Date ? payment.createdAt.toISOString() : payment.createdAt) : new Date().toISOString(),
        updatedAt: payment.updatedAt ? (payment.updatedAt instanceof Date ? payment.updatedAt.toISOString() : payment.updatedAt) : new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// ADMIN BUREAU DESK (Server-Side Authorization Required)
// ====================================================================

// 8. Admin: List Payments for Review (Exact same MongoDB payment document)
app.get(['/api/admin/payments', '/admin/payments'], requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection('payments');
    const lettersColl = db.collection('letters');
    const usersColl = db.collection('users');

    const list = await (paymentsColl.find({}) as any).sort({ createdAt: -1 }).toArray();

    const enriched = await Promise.all(
      list.map(async (p: any) => {
        let senderEmail = p.userEmail || '';
        let senderName = 'Sender';
        let recipientEmail = p.recipientEmail || '';
        let recipientName = p.recipientName || 'Recipient';
        let trackingCode = 'OL-BUREAU';

        if (p.userId) {
          try {
            const user = await usersColl.findOne({
              $or: [
                { _id: ObjectId.isValid(p.userId) ? new ObjectId(p.userId) : p.userId },
                { email: p.userEmail },
              ],
            });
            if (user) {
              senderEmail = user.email || senderEmail;
              senderName = user.fullName || senderName;
            }
          } catch {}
        }

        if (p.letterId) {
          try {
            const letter = await lettersColl.findOne({
              $or: [
                { _id: ObjectId.isValid(p.letterId) ? new ObjectId(p.letterId) : p.letterId },
                { trackingCode: p.letterId },
              ],
            });
            if (letter) {
              recipientEmail = letter.recipientEmail || recipientEmail;
              recipientName = letter.recipientName || recipientName;
              trackingCode = letter.trackingCode || trackingCode;
              senderName = letter.senderName || senderName;
              senderEmail = letter.senderEmail || senderEmail;
            }
          } catch {}
        }

        const mediaType = p.mediaType || (p.featureCode?.includes('VIDEO') ? 'VIDEO' : 'VOICE');

        return {
          id: p._id.toString(),
          paymentId: p.paymentId || `PAY-${p._id.toString().slice(-8).toUpperCase()}`,
          userId: p.userId?.toString(),
          senderEmail,
          senderName,
          letterId: p.letterId?.toString() || null,
          trackingCode,
          recipientEmail,
          recipientName,
          mediaType,
          mediaStatus: p.mediaStatus || 'PENDING',
          mediaStorageKey: p.mediaStorageKey || null,
          hasMediaAttachment: Boolean(p.hasMediaAttachment),
          mediaPreviewUrl: p.mediaStorageKey ? `/api/admin/media/${p.mediaStorageKey}` : null,
          featureCode: p.featureCode || mediaType,
          amount: p.amount,
          currency: p.currency || 'INR',
          paymentMethod: p.paymentMethod || 'UPI',
          upiReference: p.upiReference,
          paymentScreenshotPath: p.paymentScreenshotId,
          status: p.status || 'PENDING',
          adminNote: p.adminNote || null,
          verifiedBy: p.verifiedBy || null,
          verifiedAt: p.verifiedAt ? (p.verifiedAt instanceof Date ? p.verifiedAt.toISOString() : p.verifiedAt) : null,
          createdAt: p.createdAt ? (p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt) : new Date().toISOString(),
          updatedAt: p.updatedAt ? (p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt) : new Date().toISOString(),
        };
      })
    );

    res.json({
      success: true,
      payments: enriched,
    });
  } catch (err: any) {
    console.error('[OLD-LETTERS Admin List Payments Error]', err);
    const isDbUnavailable =
      err?.message?.includes('Database connection unavailable') ||
      err?.message?.includes('MongoDB Atlas connection unavailable') ||
      err?.message?.includes('MONGODB_URI is missing or invalid') ||
      err?.message?.includes('querySrv') ||
      err?.message?.includes('ENOTFOUND') ||
      err?.message?.includes('ETIMEDOUT') ||
      err?.name === 'MongoServerSelectionError' ||
      err?.name === 'MongoNetworkError';
    const statusCode = isDbUnavailable ? 503 : 500;
    res.status(statusCode).json({ success: false, error: err.message, payments: [] });
  }
});

// 9. Admin: Verify Payment (Approve or Reject)
app.post(['/api/admin/payments/:id/verify', '/api/admin/payments/:id/approve', '/api/admin/payments/:id/reject', '/admin/payments/:id/verify', '/admin/payments/:id/approve', '/admin/payments/:id/reject'], requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const paymentId = req.params.id;
    let targetStatus: 'APPROVED' | 'REJECTED' = req.body.status;
    if (req.path.endsWith('/approve')) targetStatus = 'APPROVED';
    if (req.path.endsWith('/reject')) targetStatus = 'REJECTED';

    const parseResult = AdminVerifyPaymentSchema.safeParse({
      paymentId,
      status: targetStatus,
      adminNote: req.body.adminNote,
    });

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues.map((e: any) => e.message).join(', '),
      });
    }

    const { status, adminNote } = parseResult.data;
    const db = await getDb();
    const paymentsColl = db.collection('payments');
    const mediaMetadataColl = db.collection('mediaMetadata');
    const lettersColl = db.collection('letters');
    const auditColl = db.collection('auditLogs');
    const eventsColl = db.collection('deliveryEvents');
    const usersColl = db.collection('users');

    let payment = null;
    try {
      const payConds: any[] = [{ paymentId }, { upiReference: paymentId }];
      if (ObjectId.isValid(paymentId)) {
        payConds.unshift({ _id: new ObjectId(paymentId) });
      } else {
        payConds.unshift({ _id: paymentId as any });
      }
      payment = await paymentsColl.findOne({ $or: payConds });
    } catch {
      payment = await paymentsColl.findOne({ upiReference: paymentId });
    }

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    const now = new Date();
    const adminIdentifier = req.user!.email;

    // 1. Update Payment status
    await paymentsColl.updateOne(
      { _id: payment._id },
      {
        $set: {
          status,
          mediaStatus: status,
          adminNote: adminNote || null,
          verifiedBy: adminIdentifier,
          verifiedAt: now,
          updatedAt: now,
        },
      }
    );

    // 2. Update Media metadata status
    await mediaMetadataColl.updateMany(
      {
        $or: [
          { paymentId: payment._id.toString() },
          { paymentId: payment.paymentId },
          ...(payment.letterId ? [{ letterId: payment.letterId }] : []),
        ],
      },
      {
        $set: {
          mediaStatus: status,
          updatedAt: now,
        },
      }
    );

    // 3. Update letter personalMessage status if applicable
    if (payment.letterId) {
      try {
        const lId = ObjectId.isValid(payment.letterId) ? new ObjectId(payment.letterId) : payment.letterId;
        await lettersColl.updateOne(
          { _id: lId },
          {
            $set: {
              'personalMessage.mediaStatus': status,
              mediaStatus: status,
              updatedAt: now,
            },
          }
        );
      } catch {}
    }

    // 4. Record Audit Log
    await auditColl.insertOne({
      _id: new ObjectId(),
      action: status === 'APPROVED' ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED',
      adminId: adminIdentifier,
      adminEmail: adminIdentifier,
      paymentId: payment._id.toString(),
      entityType: 'PAYMENT',
      entityId: payment._id.toString(),
      timestamp: now,
      metadata: {
        paymentId: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
        letterId: payment.letterId,
        mediaType: payment.mediaType,
        amount: payment.amount,
        upiReference: payment.upiReference,
        adminNote: adminNote || null,
      },
    });

    // 5. Emit Delivery Event
    if (payment.letterId) {
      try {
        const lId = ObjectId.isValid(payment.letterId) ? new ObjectId(payment.letterId) : payment.letterId;
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: lId,
          eventType: status === 'APPROVED' ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED',
          metadata: { amount: payment.amount, mediaType: payment.mediaType },
          createdAt: now,
        });
      } catch {}
    }

    // 6. Send Email Notifications (Strictly non-blocking)
    const senderEmail = payment.userEmail || (payment.userId ? (await usersColl.findOne({ $or: [{ _id: ObjectId.isValid(payment.userId) ? new ObjectId(payment.userId) : payment.userId }, { email: payment.userEmail }] }))?.email : null);
    if (senderEmail) {
      if (status === 'REJECTED') {
        try {
          const rejectMailRes = await sendPaymentIssueEmail({
            userEmail: senderEmail,
            orderReference: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
            amount: payment.amount || (payment.mediaType === 'VIDEO' ? 149 : 99),
            currency: payment.currency || 'INR',
            upiReference: payment.upiReference,
            adminNote: adminNote || 'Payment transaction details could not be verified. Your correspondence will continue without the personal voice/video enclosure.',
            contactUrl: `${process.env.APP_URL || 'https://oldletters.in'}/contact`,
          });

          logEmailDispatch({
            type: 'PAYMENT_REJECTED',
            to: senderEmail,
            letterId: payment.letterId || '',
            paymentId: payment.paymentId || payment._id.toString(),
            dispatchRef: payment.paymentId || payment._id.toString(),
            status: rejectMailRes.success ? 'SENT' : 'FAILED',
            error: rejectMailRes.error,
            timestamp: new Date().toISOString(),
          });
        } catch (emailErr: any) {
          logEmailDispatch({
            type: 'PAYMENT_REJECTED',
            to: senderEmail,
            letterId: payment.letterId || '',
            paymentId: payment.paymentId || payment._id.toString(),
            dispatchRef: payment.paymentId || payment._id.toString(),
            status: 'FAILED',
            error: emailErr.message,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (status === 'APPROVED') {
        try {
          const approveMailRes = await sendPaymentApprovedEmail({
            userEmail: senderEmail,
            orderReference: payment.paymentId || `PAY-${payment._id.toString().slice(-8).toUpperCase()}`,
            amount: payment.amount || (payment.mediaType === 'VIDEO' ? 149 : 99),
            currency: payment.currency || 'INR',
            upiReference: payment.upiReference,
            featureName: payment.mediaType === 'VIDEO' ? 'Video Message Enclosure' : 'Voice Message Enclosure',
            adminNote: adminNote || undefined,
            statusUrl: `${process.env.APP_URL || 'https://oldletters.in'}/bureau`,
          });

          logEmailDispatch({
            type: 'PAYMENT_APPROVED',
            to: senderEmail,
            letterId: payment.letterId || '',
            paymentId: payment.paymentId || payment._id.toString(),
            dispatchRef: payment.paymentId || payment._id.toString(),
            status: approveMailRes.success ? 'SENT' : 'FAILED',
            error: approveMailRes.error,
            timestamp: new Date().toISOString(),
          });
        } catch (emailErr: any) {
          logEmailDispatch({
            type: 'PAYMENT_APPROVED',
            to: senderEmail,
            letterId: payment.letterId || '',
            paymentId: payment.paymentId || payment._id.toString(),
            dispatchRef: payment.paymentId || payment._id.toString(),
            status: 'FAILED',
            error: emailErr.message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    const updatedPayment = await paymentsColl.findOne({ _id: payment._id });

    res.json({
      success: true,
      message: `Payment marked as ${status}.`,
      payment: updatedPayment ? {
        id: updatedPayment._id.toString(),
        paymentId: updatedPayment.paymentId || `PAY-${updatedPayment._id.toString().slice(-8).toUpperCase()}`,
        status: updatedPayment.status,
        mediaStatus: updatedPayment.mediaStatus,
        verifiedBy: updatedPayment.verifiedBy,
        verifiedAt: updatedPayment.verifiedAt ? (updatedPayment.verifiedAt instanceof Date ? updatedPayment.verifiedAt.toISOString() : updatedPayment.verifiedAt) : null,
        adminNote: updatedPayment.adminNote,
      } : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Admin: View Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const auditColl = db.collection('auditLogs');
    const logs = await (await auditColl.find({})).sort({ timestamp: -1 }).toArray();

    res.json({ success: true, auditLogs: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Explicit JSON 404 handler for any unmatched /api routes (prevents HTML fallthrough)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Postal API endpoint not found: ${req.method} ${req.path}`,
  });
});

// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[OLD-LETTERS API Error]', err);
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'An unexpected postal bureau error occurred.',
    });
  }
  next(err);
});

// ====================================================================
// VITE CLIENT MOUNT
// ====================================================================
async function startServer() {
  const uri = getSanitizedMongoUri();
  if (uri) {
    try {
      await setupDatabaseIndexes();
      await seedDatabase();
    } catch (seedErr) {
      console.warn('[OLD-LETTERS] Seeding notice:', seedErr);
    }
  } else {
    console.log('[OLD-LETTERS] MONGODB_URI not configured. Database initialization deferred until MONGODB_URI is set.');
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OLD-LETTERS] Bureau server active on port ${PORT}`);
  });

  // Start background delivery scheduler loop (every 30 seconds)
  setInterval(async () => {
    try {
      if (!getSanitizedMongoUri()) {
        return;
      }
      const db = await getDb();
      await runDeliveryScheduler(db);
    } catch (schedErr) {
      console.warn('[OLD-LETTERS Scheduler Notice]', schedErr);
    }
  }, 30 * 1000);
}

// Only start standalone HTTP server when executed directly (not in Vercel or test)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
export default app;
