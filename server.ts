import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Resend } from 'resend';
import {
  CreateLetterSchema,
  SubmitPaymentSchema,
  AdminVerifyPaymentSchema,
  RecipientVerifySchema,
} from './src/types/backend';
import {
  getDb,
  setupDatabaseIndexes,
  isUsingAtlas,
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
} from './src/lib/mongodb';
import { seedDatabase } from './scripts/seed';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'old-letters-super-confidential-secret-key-1892';
const CRON_SECRET = process.env.CRON_SECRET || 'old-letters-cron-secure-key-2026';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Security Headers & Request Parsers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Ensure all /api responses default to application/json header
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Resend client
const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'post@old-letters.in';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@old-letters.in';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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

// Token Extraction & Session Authentication Middleware
const authenticateToken: express.RequestHandler = (req, res, next) => {
  const token = req.cookies?.oldletters_session || req.headers.authorization?.replace(/^Bearer\s+/i, '');
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

// Admin Verification Helper
async function verifyAdminServerSide(req: express.Request): Promise<boolean> {
  const adminSecretHeader = req.headers['x-admin-secret'];
  if (adminSecretHeader && adminSecretHeader === process.env.ADMIN_SECRET) {
    return true;
  }

  if (req.user && req.user.email) {
    if (req.user.role === 'ADMIN' || req.user.email === adminEmail || req.user.email === 'lokesh@oldletters.in') {
      return true;
    }
    const db = await getDb();
    const adminColl = db.collection('adminUsers');
    const adminRec = await adminColl.findOne({ email: req.user.email });
    if (adminRec) {
      return true;
    }
  }

  // Local development bureau inspection flag
  const isDev = !isProd;
  const adminParam = req.query.admin === 'true' || req.headers['x-bureau-admin'] === 'true';
  if (isDev && adminParam) {
    return true;
  }

  return false;
}

// Require Admin Middleware
const requireAdmin: express.RequestHandler = async (req, res, next) => {
  const isAdmin = await verifyAdminServerSide(req);
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Bureau administrative privileges required.',
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
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || `${APP_URL}/api/auth/google/callback`;

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }
          const db = await getDb();
          const usersColl = db.collection('users');
          const now = new Date();

          // 1. Check if user already exists by googleId
          let user = await usersColl.findOne({ googleId: profile.id });
          if (user) {
            await usersColl.updateOne(
              { _id: user._id },
              { $set: { lastLoginAt: now, updatedAt: now } }
            );
            return done(null, {
              id: user._id.toString(),
              email: user.email,
              fullName: user.fullName,
              avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
              role: user.role || 'USER',
              authProvider: user.authProvider || 'GOOGLE',
              emailVerified: true,
            });
          }

          // 2. Check if user exists by email -> Intelligently Link Google ID!
          user = await usersColl.findOne({ email });
          if (user) {
            await usersColl.updateOne(
              { _id: user._id },
              {
                $set: {
                  googleId: profile.id,
                  authProvider: 'BOTH',
                  emailVerified: true,
                  lastLoginAt: now,
                  updatedAt: now,
                  avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                },
              }
            );
            return done(null, {
              id: user._id.toString(),
              email: user.email,
              fullName: user.fullName,
              avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
              role: user.role || 'USER',
              authProvider: 'BOTH',
              emailVerified: true,
            });
          }

          // 3. New Google User
          const newUserId = new ObjectId();
          const newUser: UserDoc = {
            _id: newUserId,
            email,
            fullName: profile.displayName || email.split('@')[0],
            avatarUrl: profile.photos?.[0]?.value,
            authProvider: 'GOOGLE',
            googleId: profile.id,
            role: email === adminEmail || email === 'lokesh@oldletters.in' ? 'ADMIN' : 'USER',
            emailVerified: true,
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
}

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
    resendConfigured: Boolean(resendApiKey),
    googleOAuthConfigured: Boolean(googleClientId && googleClientSecret),
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
app.get(['/api/auth/me', '/api/me'], async (req: AuthenticatedRequest, res) => {
  if (!req.user || !req.user.id) {
    return res.json({ authenticated: false, user: null });
  }

  const db = await getDb();
  const usersColl = db.collection('users');
  const lettersColl = db.collection('letters');

  let userDoc = null;
  try {
    userDoc = await usersColl.findOne({ _id: new ObjectId(req.user.id) });
  } catch {
    userDoc = await usersColl.findOne({ email: req.user.email });
  }

  if (!userDoc) {
    return res.json({ authenticated: false, user: null });
  }

  const lettersCount = await lettersColl.countDocuments({
    $or: [
      { senderId: userDoc._id.toString() },
      { senderId: userDoc._id },
    ],
  });

  res.json({
    authenticated: true,
    user: {
      id: userDoc._id.toString(),
      email: userDoc.email,
      fullName: userDoc.fullName,
      avatarUrl: userDoc.avatarUrl,
      role: userDoc.role || 'USER',
      authProvider: userDoc.authProvider || 'EMAIL',
      emailVerified: userDoc.emailVerified ?? false,
      googleLinked: !!userDoc.googleId || userDoc.authProvider === 'GOOGLE' || userDoc.authProvider === 'BOTH',
      createdAt: userDoc.createdAt ? userDoc.createdAt.toISOString() : undefined,
      lettersCount,
    },
  });
});

// Email + Password Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '').trim();
    const fullName = String(req.body.fullName || '').trim() || 'Correspondent';

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
              updatedAt: now,
              lastLoginAt: now,
            },
          }
        );
        const userPayload = {
          id: existing._id.toString(),
          email: existing.email,
          fullName: existing.fullName || fullName,
          role: existing.role || 'USER',
          authProvider: 'BOTH' as const,
          emailVerified: true,
        };
        const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
        res.cookie('oldletters_session', sessionToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          maxAge: 30 * 24 * 3600 * 1000,
        });
        return res.json({ success: true, token: sessionToken, user: userPayload });
      }

      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const newUserId = new ObjectId();
    const newUser: UserDoc = {
      _id: newUserId,
      fullName,
      email,
      passwordHash,
      authProvider: 'EMAIL',
      role: email === adminEmail || email === 'lokesh@oldletters.in' ? 'ADMIN' : 'USER',
      emailVerified: false,
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
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });

    res.cookie('oldletters_session', sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000,
    });

    res.json({ success: true, token: sessionToken, user: userPayload });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Email + Password Login
app.post('/api/auth/login', async (req, res) => {
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
    await usersColl.updateOne({ _id: user._id }, { $set: { lastLoginAt: now, updatedAt: now } });

    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role || 'USER',
      authProvider: user.authProvider || 'EMAIL',
      emailVerified: user.emailVerified ?? false,
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });

    res.cookie('oldletters_session', sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000,
    });

    res.json({ success: true, token: sessionToken, user: userPayload });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Google OAuth Initiation
app.get('/api/auth/google', (req, res, next) => {
  if (!googleClientId || !googleClientSecret) {
    return res.status(503).json({
      success: false,
      error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// Google OAuth Callback
app.get('/api/auth/google/callback', (req, res, next) => {
  if (!googleClientId || !googleClientSecret) {
    return res.redirect('/?auth=google_not_configured');
  }

  passport.authenticate('google', { session: false }, (err: any, user: any) => {
    if (err || !user) {
      console.error('[Google OAuth Error]', err);
      return res.redirect('/?auth=error');
    }
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('oldletters_session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000,
    });
    res.redirect('/?auth=google_success');
  })(req, res, next);
});

// Google Sign-In Testing / Direct Verification Endpoint
app.post('/api/auth/google/test-login', async (req, res) => {
  try {
    const { email, googleId, fullName, avatarUrl } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ success: false, error: 'Email and googleId required for verification.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = await getDb();
    const usersColl = db.collection('users');
    const now = new Date();

    let user = await usersColl.findOne({ googleId });
    if (user) {
      await usersColl.updateOne({ _id: user._id }, { $set: { lastLoginAt: now, updatedAt: now } });
    } else {
      user = await usersColl.findOne({ email: cleanEmail });
      if (user) {
        // Link Google ID to existing account!
        await usersColl.updateOne(
          { _id: user._id },
          {
            $set: {
              googleId,
              authProvider: 'BOTH',
              emailVerified: true,
              lastLoginAt: now,
              updatedAt: now,
            },
          }
        );
        user = await usersColl.findOne({ _id: user._id });
      } else {
        const newUserId = new ObjectId();
        await usersColl.insertOne({
          _id: newUserId,
          email: cleanEmail,
          fullName: fullName || cleanEmail.split('@')[0],
          avatarUrl,
          authProvider: 'GOOGLE',
          googleId,
          role: cleanEmail === adminEmail || cleanEmail === 'lokesh@oldletters.in' ? 'ADMIN' : 'USER',
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        });
        user = await usersColl.findOne({ _id: newUserId });
      }
    }

    const userPayload = {
      id: user!._id.toString(),
      email: user!.email,
      fullName: user!.fullName,
      role: user!.role || 'USER',
      authProvider: user!.authProvider,
      emailVerified: user!.emailVerified,
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('oldletters_session', sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000,
    });

    res.json({ success: true, user: userPayload, token: sessionToken });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('oldletters_session');
  res.json({ success: true, message: 'Logged out successfully.' });
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

    if (resend) {
      try {
        await resend.emails.send({
          from: `OLD-LETTERS <${resendFromEmail}>`,
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
      } catch (err) {
        console.error('Failed to send auth OTP email:', err);
      }
    }

    res.json({
      success: true,
      message: 'Access code sent to email.',
      devOtpHint: resend ? undefined : otpCode,
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
      await usersColl.insertOne({
        _id: newUserId,
        fullName: defaultName,
        email,
        authProvider: 'EMAIL',
        role: email === adminEmail || email === 'lokesh@oldletters.in' ? 'ADMIN' : 'USER',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
      user = await usersColl.findOne({ _id: newUserId });
    }

    const userPayload = {
      id: user!._id.toString(),
      email: user!.email,
      fullName: user!.fullName,
      role: user!.role || 'USER',
      authProvider: user!.authProvider,
      emailVerified: true,
    };

    const sessionToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });

    res.cookie('oldletters_session', sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000,
    });

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
  return {
    id: ltr._id.toString(),
    trackingCode: ltr.trackingCode,
    type: ltr.letterType,
    templateId: ltr.templateId,
    senderName: reqUser?.fullName || 'Correspondent',
    senderEmail: reqUser?.email || 'correspondent@oldletters.in',
    recipientName: recipient?.displayName || 'Recipient',
    recipientEmail: recipient?.email || 'recipient@correspondence.in',
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
    waitingHours: ltr.waitingHours || 48,
    status: ltr.status,
    postmarkCity: ltr.postmarkCity || 'Hyderabad Bureau',
  };
}

// 2. Letters Archive: GET all letters for current authenticated sender
app.get(['/api/letters', '/api/archive'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const senderId = req.user!.id;

    // Strict ownership: Only retrieve letters penned by this authenticated sender
    const query: any = {
      $or: [
        { senderId },
        { senderId: new ObjectId(senderId) },
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

    const letterId = new ObjectId();
    const now = new Date();
    const deliveryDate = new Date(input.scheduledDeliveryAt);

    // CRITICAL: Always use req.user.id as senderId (never trust client body senderId)
    const senderId = req.user!.id;

    // 1. Insert Letter document in MongoDB
    await lettersColl.insertOne({
      _id: letterId,
      senderId,
      letterType: input.type,
      templateId: input.templateId,
      salutation: input.greeting,
      body: input.content,
      signoff: input.signoff,
      status: input.status,
      deliveryDate,
      trackingCode,
      recipientVerificationMethod: input.verificationMethod,
      secretPassphraseHash: passphraseHash,
      postmarkCity: input.postmarkCity || 'Hyderabad Bureau',
      waitingHours: input.waitingHours,
      attachments: req.body.attachments || [],
      postedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Insert Recipient document
    await recipientsColl.insertOne({
      _id: new ObjectId(),
      letterId,
      email: input.recipientEmail.toLowerCase(),
      displayName: input.recipientName,
      verificationMethod: input.verificationMethod,
      createdAt: now,
    });

    // 3. Insert Delivery Token (only hashed value stored!)
    await tokensColl.insertOne({
      _id: new ObjectId(),
      letterId,
      tokenHash,
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
        recipient: input.recipientEmail,
      },
      createdAt: now,
    });

    const responseLetter = {
      id: letterId.toString(),
      trackingCode,
      type: input.type,
      templateId: input.templateId,
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail,
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

    // Verify ownership or admin privileges
    const isAdmin = await verifyAdminServerSide(req);
    const isOwner = letter.senderId?.toString() === req.user!.id;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied to this correspondence.' });
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

    let rawDeliveryToken = '';
    const existingToken = await tokensColl.findOne({ letterId: letter._id });
    if (!existingToken) {
      rawDeliveryToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashSha256(rawDeliveryToken);
      await tokensColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        tokenHash,
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
// RECIPIENT EXPERIENCE (Token-based, No body before verification)
// ====================================================================

// 4. Delivery Token: Retrieve public letter metadata (NO content before verification)
app.get(['/api/delivery/token/:token', '/api/letter/:token'], async (req, res) => {
  try {
    const rawToken = req.params.token;
    const tokenHash = hashSha256(rawToken);

    const db = await getDb();
    const tokensColl = db.collection('deliveryTokens');
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');

    const tokenRec = await tokensColl.findOne({
      tokenHash,
      expiresAt: { $gte: new Date() },
    });

    if (!tokenRec) {
      return res.status(404).json({ success: false, error: 'Letter link not found or expired.' });
    }

    const letter = await lettersColl.findOne({ _id: new ObjectId(tokenRec.letterId) });
    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    const recipient = await recipientsColl.findOne({ letterId: letter._id });

    // Mask recipient email for privacy
    const rawEmail = recipient?.email || '';
    const maskedEmail = rawEmail.replace(/(?<=.).(?=.*@)/g, '*');

    res.json({
      success: true,
      metadata: {
        trackingCode: letter.trackingCode,
        senderName: 'A correspondent',
        recipientName: recipient?.displayName || 'Recipient',
        recipientEmailMasked: maskedEmail,
        verificationMethod: letter.recipientVerificationMethod || 'open',
        status: letter.status,
        isDelivered: letter.status === 'DELIVERED' || letter.status === 'OPENED' || letter.status === 'COMPLETED',
        deliveryDate: letter.deliveryDate.toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Recipient Verification: Request OTP
app.post(['/api/delivery/request-otp', '/api/recipient/request-otp'], async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Delivery token required.' });
    }

    const tokenHash = hashSha256(token);
    const db = await getDb();
    const tokensColl = db.collection('deliveryTokens');
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');
    const otpColl = db.collection('otpCodes');
    const eventsColl = db.collection('deliveryEvents');

    const tokenRec = await tokensColl.findOne({ tokenHash });
    if (!tokenRec) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    const letter = await lettersColl.findOne({ _id: new ObjectId(tokenRec.letterId) });
    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    const recipient = await recipientsColl.findOne({ letterId: letter._id });
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

    if (resend) {
      try {
        await resend.emails.send({
          from: `OLD-LETTERS <${resendFromEmail}>`,
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
      } catch (emailErr) {
        console.error('Failed to send Resend OTP email:', emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Verification code dispatched to recipient email.',
      devOtpHint: resend ? undefined : otpCode,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Recipient Verification: Submit OTP or Passphrase & Unseal Letter
app.post(['/api/delivery/verify', '/api/recipient/verify-otp', '/api/recipient/passphrase'], async (req, res) => {
  try {
    const parseResult = RecipientVerifySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues.map((e: any) => e.message).join(', '),
      });
    }

    const { token, verificationMethod, otp, passphrase } = parseResult.data;
    const tokenHash = hashSha256(token);

    const db = await getDb();
    const tokensColl = db.collection('deliveryTokens');
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');
    const otpColl = db.collection('otpCodes');
    const eventsColl = db.collection('deliveryEvents');
    const paidFeaturesColl = db.collection('paidFeatures');

    const tokenRec = await tokensColl.findOne({ tokenHash });
    if (!tokenRec) {
      return res.status(404).json({ success: false, error: 'Letter not found or link expired.' });
    }

    const letter = await lettersColl.findOne({ _id: new ObjectId(tokenRec.letterId) });
    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found.' });
    }

    const recipient = await recipientsColl.findOne({ letterId: letter._id });
    let isVerified = false;

    if (verificationMethod === 'open') {
      isVerified = true;
    } else if (verificationMethod === 'otp') {
      const activeOtp = await otpColl.findOne({
        letterId: letter._id,
        used: false,
        expiresAt: { $gte: new Date() },
      });

      if (!activeOtp) {
        return res.status(400).json({ success: false, error: 'Verification code expired or invalid.' });
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
      const now = new Date();

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

      return res.json({
        success: true,
        letter: {
          id: letter._id.toString(),
          trackingCode: letter.trackingCode,
          type: letter.letterType,
          templateId: letter.templateId,
          senderName: 'Lokesh',
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
          paidFeatures: paidList.map((pf: any) => pf.featureCode),
        },
      });
    }

    res.status(403).json({ success: false, error: 'Verification failed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// DELIVERY SCHEDULER (Idempotent Cron Runner with CRON_SECRET)
// ====================================================================
app.post(['/api/scheduler/tick', '/api/cron/delivery', '/api/internal/delivery/run'], async (req, res) => {
  try {
    const incomingAuth = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const cronHeader = req.headers['x-cron-secret'];
    if (process.env.CRON_SECRET && incomingAuth !== CRON_SECRET && cronHeader !== CRON_SECRET) {
      const isAdmin = await verifyAdminServerSide(req);
      if (!isAdmin && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ success: false, error: 'Unauthorized cron dispatch.' });
      }
    }

    const now = new Date();
    const db = await getDb();
    const lettersColl = db.collection('letters');
    const recipientsColl = db.collection('letterRecipients');
    const tokensColl = db.collection('deliveryTokens');
    const eventsColl = db.collection('deliveryEvents');

    const dueLetters = await (
      await lettersColl.find({
        status: 'SCHEDULED',
        deliveryDate: { $lte: now },
      })
    ).toArray();

    const deliveredLetters = [];

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

      if (!updated) {
        continue;
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashSha256(rawToken);

      await tokensColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        tokenHash,
        expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
        createdAt: now,
      });

      await eventsColl.insertOne({
        _id: new ObjectId(),
        letterId: letter._id,
        eventType: 'LETTER_DELIVERED',
        createdAt: now,
      });

      const recipient = await recipientsColl.findOne({ letterId: letter._id });

      if (resend && recipient && recipient.email) {
        try {
          const deliveryUrl = `${APP_URL}/letter/${rawToken}`;
          await resend.emails.send({
            from: `OLD-LETTERS <${resendFromEmail}>`,
            to: recipient.email,
            subject: 'Your letter has arrived — OLD-LETTERS',
            html: `
              <div style="background-color: #faf9f7; padding: 48px 24px; font-family: serif; color: #134e4a; text-align: center;">
                <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #eae4da; padding: 40px 32px; border-radius: 4px;">
                  <div style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #78716c; margin-bottom: 16px; font-family: monospace;">
                    DISPATCH REF: ${letter.trackingCode}
                  </div>
                  <h1 style="font-size: 32px; font-weight: 300; margin: 0 0 16px 0; color: #134e4a;">
                    A letter has arrived.
                  </h1>
                  <p style="font-style: italic; font-size: 18px; color: #44403c; margin: 0 0 24px 0;">
                    Your letter is waiting for you.
                  </p>
                  <a href="${deliveryUrl}" style="display: inline-block; background-color: #134e4a; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 12px; font-family: sans-serif; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px;">
                    OPEN YOUR LETTER →
                  </a>
                </div>
              </div>
            `,
          });

          await eventsColl.insertOne({
            _id: new ObjectId(),
            letterId: letter._id,
            eventType: 'RECIPIENT_EMAIL_SENT',
            metadata: { recipientEmail: recipient.email },
            createdAt: new Date(),
          });
        } catch (e) {
          console.error('Scheduler email error:', e);
        }
      }

      deliveredLetters.push({
        id: letter._id.toString(),
        trackingCode: letter.trackingCode,
        recipient: recipient?.email,
      });
    }

    res.json({
      success: true,
      deliveredCount: deliveredLetters.length,
      processed: deliveredLetters,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// PAYMENTS & PAID FEATURES (Manual UPI, Strictly PENDING by default)
// ====================================================================
app.post(['/api/payments', '/api/payments/create'], requireAuth, async (req: AuthenticatedRequest, res) => {
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
    const paidFeaturesColl = db.collection('paidFeatures');
    const eventsColl = db.collection('deliveryEvents');

    const paymentId = new ObjectId();
    const now = new Date();
    // Strictly obtain userId from session
    const userId = req.user!.id;

    const paymentRecord: PaymentDoc = {
      _id: paymentId,
      userId,
      letterId: input.letterId || undefined,
      featureCode: input.featureCode,
      amount: input.amount,
      currency: 'INR',
      upiReference: input.upiReference,
      paymentScreenshotId: input.screenshotUrl || undefined,
      status: 'PENDING', // NEVER automatically approved!
      createdAt: now,
      updatedAt: now,
    };

    await paymentsColl.insertOne(paymentRecord);

    const paidFeatureId = new ObjectId();
    await paidFeaturesColl.insertOne({
      _id: paidFeatureId,
      userId,
      letterId: input.letterId || 'unassigned',
      featureCode: input.featureCode,
      paymentId: paymentId.toString(),
      status: 'PENDING',
      createdAt: now,
    });

    if (input.letterId) {
      try {
        await eventsColl.insertOne({
          _id: new ObjectId(),
          letterId: new ObjectId(input.letterId),
          eventType: 'PAYMENT_CREATED',
          metadata: { amount: input.amount, upiReference: input.upiReference },
          createdAt: now,
        });
      } catch {
        // letterId may not be standard ObjectId
      }
    }

    res.status(201).json({
      success: true,
      payment: {
        id: paymentId.toString(),
        userId,
        letterId: input.letterId,
        featureCode: input.featureCode,
        amount: input.amount,
        currency: 'INR',
        upiReference: input.upiReference,
        status: 'PENDING',
        createdAt: now.toISOString(),
      },
      message: 'UPI payment submitted. Awaiting administrative verification.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List User's Payments (Protected)
app.get('/api/payments', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection('payments');
    const userId = req.user!.id;

    const list = await (await paymentsColl.find({ userId })).sort({ createdAt: -1 }).toArray();
    res.json({
      success: true,
      payments: list.map((p: any) => ({
        id: p._id.toString(),
        featureCode: p.featureCode,
        amount: p.amount,
        status: p.status,
        upiReference: p.upiReference,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// ADMIN BUREAU DESK (Server-Side Authorization Required)
// ====================================================================

// 9. Admin: List Payments for Review
app.get('/api/admin/payments', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const paymentsColl = db.collection('payments');
    const list = await (await paymentsColl.find({})).sort({ createdAt: -1 }).toArray();

    res.json({
      success: true,
      payments: list.map((p: any) => ({
        id: p._id.toString(),
        userId: p.userId?.toString(),
        letterId: p.letterId?.toString(),
        featureCode: p.featureCode,
        amount: p.amount,
        currency: p.currency,
        upiReference: p.upiReference,
        paymentScreenshotPath: p.paymentScreenshotId,
        status: p.status,
        adminNote: p.adminNote,
        verifiedBy: p.verifiedBy,
        verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : p.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Admin: Verify Payment (Approve or Reject)
app.post(['/api/admin/payments/:id/verify', '/api/admin/payments/:id/approve', '/api/admin/payments/:id/reject'], requireAdmin, async (req: AuthenticatedRequest, res) => {
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
    const paidFeaturesColl = db.collection('paidFeatures');
    const auditColl = db.collection('auditLogs');
    const eventsColl = db.collection('deliveryEvents');

    let payment = null;
    try {
      payment = await paymentsColl.findOne({ _id: new ObjectId(paymentId) });
    } catch {
      payment = await paymentsColl.findOne({ upiReference: paymentId });
    }

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    const now = new Date();
    const adminIdentifier = req.user?.email || adminEmail;

    await paymentsColl.updateOne(
      { _id: payment._id },
      {
        $set: {
          status,
          adminNote: adminNote || null,
          verifiedBy: adminIdentifier,
          verifiedAt: now,
          updatedAt: now,
        },
      }
    );

    if (status === 'APPROVED') {
      await paidFeaturesColl.updateOne(
        { paymentId: payment._id.toString() },
        {
          $set: {
            status: 'UNLOCKED',
            unlockedAt: now,
          },
        }
      );

      await auditColl.insertOne({
        _id: new ObjectId(),
        action: 'PAYMENT_APPROVED',
        adminId: adminIdentifier,
        paymentId: payment._id.toString(),
        entityType: 'PAYMENT',
        entityId: payment._id.toString(),
        timestamp: now,
        metadata: {
          featureCode: payment.featureCode,
          amount: payment.amount,
          upiReference: payment.upiReference,
        },
      });

      if (payment.letterId) {
        try {
          await eventsColl.insertOne({
            _id: new ObjectId(),
            letterId: new ObjectId(payment.letterId),
            eventType: 'PAYMENT_APPROVED',
            metadata: { featureCode: payment.featureCode },
            createdAt: now,
          });
        } catch {
          // Non-ObjectId fallback
        }
      }
    } else if (status === 'REJECTED') {
      await paidFeaturesColl.updateOne(
        { paymentId: payment._id.toString() },
        {
          $set: {
            status: 'CANCELLED',
          },
        }
      );

      await auditColl.insertOne({
        _id: new ObjectId(),
        action: 'PAYMENT_REJECTED',
        adminId: adminIdentifier,
        paymentId: payment._id.toString(),
        entityType: 'PAYMENT',
        entityId: payment._id.toString(),
        timestamp: now,
        metadata: { adminNote },
      });
    }

    res.json({
      success: true,
      message: `Payment marked as ${status}.`,
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
  try {
    await setupDatabaseIndexes();
    await seedDatabase();
  } catch (seedErr) {
    console.warn('[OLD-LETTERS] Seeding notice:', seedErr);
  }

  if (!isProd) {
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
}

startServer();
