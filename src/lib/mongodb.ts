import { MongoClient, Db, ObjectId, GridFSBucket, Document } from 'mongodb';

export { ObjectId };

// Interface declarations for all Collections
export interface UserDoc extends Document {
  _id: ObjectId;
  email: string;
  fullName: string;
  avatarUrl?: string;
  passwordHash?: string;
  authProvider: 'EMAIL' | 'GOOGLE' | 'BOTH';
  googleId?: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  termsVersion: string;
  privacyVersion: string;
  legalConsentAt: Date;
  notificationPreferences?: {
    letterDispatched: boolean;
    deliveryUpdates: boolean;
    preArrival: boolean;
    arrival: boolean;
    paymentUpdates: boolean;
  };
  status?: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface LetterDoc extends Document {
  _id: ObjectId;
  senderId: ObjectId | string;
  letterType: string;
  templateId: string;
  salutation: string;
  body: string;
  signoff: string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'OPENED' | 'COMPLETED' | 'CANCELLED';
  deliveryDate: Date;
  trackingCode: string;
  recipientVerificationMethod: 'otp' | 'passphrase' | 'open';
  secretPassphraseHash?: string;
  postmarkCity?: string;
  waitingHours?: number;
  attachments?: any[];
  postedAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LetterRecipientDoc extends Document {
  _id: ObjectId;
  letterId: ObjectId | string;
  email: string;
  displayName: string;
  verificationMethod: 'otp' | 'passphrase' | 'open';
  verifiedAt?: Date;
  createdAt: Date;
}

export interface LetterTemplateDoc extends Document {
  _id: ObjectId;
  name: string;
  slug: string;
  category: string;
  description: string;
  previewImageUrl?: string;
  configuration: any;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryTokenDoc extends Document {
  _id: ObjectId;
  letterId: ObjectId | string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface OtpCodeDoc extends Document {
  _id: ObjectId;
  email: string;
  letterId?: ObjectId | string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface RateLimitDoc extends Document {
  _id: ObjectId;
  key: string;
  count: number;
  firstSeen: Date;
  expiresAt: Date;
}

export interface VerificationAttemptDoc extends Document {
  _id: ObjectId;
  identifier: string;
  type: 'otp' | 'passphrase' | 'auth';
  attempts: number;
  lockedUntil?: Date;
  lastAttemptAt: Date;
}

export interface LetterMediaDoc extends Document {
  _id: ObjectId;
  letterId: ObjectId | string;
  paymentId: ObjectId | string;
  userId: ObjectId | string;
  mediaType: 'VOICE' | 'VIDEO';
  mediaStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  storageKey: string;
  mimeType: string;
  fileSize: number;
  durationSeconds?: number;
  gridFsFileId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryEventDoc extends Document {
  _id: ObjectId;
  letterId: ObjectId | string;
  eventType: string;
  metadata?: any;
  createdAt: Date;
}

export interface PaymentDoc extends Document {
  _id: ObjectId;
  paymentId: string;
  letterId?: ObjectId | string;
  userId: ObjectId | string;
  userEmail: string;
  recipientEmail?: string;
  recipientName?: string;
  amount: number;
  currency: 'INR';
  paymentMethod: 'UPI';
  upiReference: string;
  mediaType?: 'VOICE' | 'VIDEO';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  mediaStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  mediaStorageKey?: string | null;
  hasMediaAttachment: boolean;
  paymentScreenshotId?: string;
  adminNote?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaidFeatureDoc extends Document {
  _id: ObjectId;
  userId?: ObjectId | string;
  letterId?: ObjectId | string;
  featureCode: string;
  paymentId: ObjectId | string;
  status: 'PENDING' | 'UNLOCKED' | 'CANCELLED';
  unlockedAt?: Date;
  createdAt: Date;
}

export interface LiveSessionDoc extends Document {
  _id: ObjectId;
  letterId?: ObjectId | string;
  hostId?: ObjectId | string;
  scheduledTime?: Date;
  status: string;
  createdAt: Date;
}

export interface NotificationDoc extends Document {
  _id: ObjectId;
  userId?: ObjectId | string;
  email?: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

export interface AdminUserDoc extends Document {
  _id: ObjectId;
  email: string;
  role: string;
  createdAt: Date;
}

export interface AuditLogDoc extends Document {
  _id: ObjectId;
  action: string;
  adminId?: string;
  paymentId?: string;
  entityType?: string;
  entityId?: string;
  timestamp: Date;
  metadata?: any;
}

// Global cached client connection across serverless warm invocations
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _mongoDiagnosticsLogged: boolean | undefined;
}

export function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV)
  );
}

/**
 * Sanitizes MongoDB connection string:
 * - Supports ONLY MONGODB_URI (no silent switching to random variables)
 * - Trims leading/trailing whitespace
 * - Strips accidental surrounding quotes (' or ")
 * - Removes internal carriage returns, newlines, or tabs
 * - Preserves actual hostname, username, password, cluster name, and query parameters untouched
 */
export function getSanitizedMongoUri(): string {
  const raw = process.env.MONGODB_URI || '';
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/[\r\n\t]/g, '');
}

/**
 * Extracts sanitized hostname for logging without exposing credentials or secrets
 */
export function getSanitizedHostname(uri: string): string {
  if (!uri) return 'none';
  try {
    const afterProtocol = uri.split('://')[1];
    if (!afterProtocol) return 'unknown';
    const afterAuth = afterProtocol.includes('@')
      ? afterProtocol.split('@')[1]
      : afterProtocol;
    const hostPortion = afterAuth.split('/')[0].split('?')[0];
    return hostPortion || 'empty-host';
  } catch {
    return 'unparseable-host';
  }
}

/**
 * Logs safe diagnostics at startup or first DB access.
 * NEVER logs passwords, credentials, or full connection strings.
 */
export function logMongoDiagnostics(uri: string): void {
  const exists = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
  const protocol = uri.startsWith('mongodb+srv://')
    ? 'mongodb+srv://'
    : uri.startsWith('mongodb://')
    ? 'mongodb://'
    : 'invalid/missing';
  const hostname = getSanitizedHostname(uri);

  console.log('[OLD-LETTERS MongoDB Diagnostics]', {
    mongoUriConfigured: exists,
    protocol,
    sanitizedHostname: hostname,
    environment: isProductionEnvironment() ? 'production' : 'development',
    serverlessPlatform: Boolean(process.env.VERCEL) ? 'Vercel Serverless' : 'Node Runtime',
  });
}

/**
 * Validates the MONGODB_URI strictly.
 * Throws explicit descriptive error if missing, malformed, or containing placeholders.
 */
export function validateMongoUri(uri: string, isProd: boolean): void {
  if (!uri || uri.trim().length === 0) {
    const errorMsg = 'MONGODB_URI is missing or invalid in the production environment.';
    console.error(`[OLD-LETTERS MongoDB] ${errorMsg} (MONGODB_URI environment variable is empty or undefined)`);
    throw new Error(errorMsg);
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    const errorMsg = 'MONGODB_URI is missing or invalid in the production environment.';
    console.error(`[OLD-LETTERS MongoDB] ${errorMsg} (URI must begin with mongodb:// or mongodb+srv://)`);
    throw new Error(errorMsg);
  }

  const hostname = getSanitizedHostname(uri);
  if (
    hostname.includes('xxxx') ||
    hostname.includes('<') ||
    hostname.includes('>') ||
    hostname === 'none' ||
    hostname === 'empty-host'
  ) {
    const errorMsg = 'MONGODB_URI is missing or invalid in the production environment.';
    console.error(`[OLD-LETTERS MongoDB] ${errorMsg} (Detected invalid placeholder hostname: ${hostname})`);
    throw new Error(errorMsg);
  }

  if (isProd && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    const errorMsg = 'MONGODB_URI is missing or invalid in the production environment.';
    console.error(`[OLD-LETTERS MongoDB] ${errorMsg} (Localhost URI detected in production deployment)`);
    throw new Error(errorMsg);
  }
}

// Proactively log safe diagnostics on module evaluation
try {
  logMongoDiagnostics(getSanitizedMongoUri());
} catch {}

export function isUsingAtlas(): boolean {
  return globalThis._mongoClient !== undefined;
}

/**
 * Connects to MongoDB Atlas using official MongoDB Node.js driver with
 * serverless connection pooling, promise caching, and auto-reset on error.
 */
export async function getMongoClient(): Promise<MongoClient> {
  const uri = getSanitizedMongoUri();
  const isProd = isProductionEnvironment();

  // Log safe diagnostics once at first DB access if not logged already
  if (!globalThis._mongoDiagnosticsLogged) {
    globalThis._mongoDiagnosticsLogged = true;
    logMongoDiagnostics(uri);
  }

  // Validate presence and validity of MONGODB_URI
  validateMongoUri(uri, isProd);

  // If already connected and cached, verify vitality with ping command
  if (globalThis._mongoClient) {
    try {
      await globalThis._mongoClient.db(process.env.MONGODB_DB_NAME || 'oldletters').command({ ping: 1 });
      return globalThis._mongoClient;
    } catch {
      console.warn('[OLD-LETTERS MongoDB] Stale connection detected, reconnecting...');
      globalThis._mongoClient = undefined;
      globalThis._mongoClientPromise = undefined;
    }
  }

  // Reuse existing in-flight connection promise or initiate a new one
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    });

    globalThis._mongoClientPromise = client
      .connect()
      .then((connectedClient) => {
        globalThis._mongoClient = connectedClient;
        return connectedClient;
      })
      .catch((err) => {
        // Clear cached rejected promise immediately so subsequent invocations can retry
        globalThis._mongoClientPromise = undefined;
        globalThis._mongoClient = undefined;
        throw err;
      });
  }

  try {
    const client = await globalThis._mongoClientPromise;
    return client;
  } catch (err: any) {
    // Clear rejected cached promise and client
    globalThis._mongoClientPromise = undefined;
    globalThis._mongoClient = undefined;

    const errMsg = err?.message || String(err);
    console.error('[OLD-LETTERS MongoDB] Atlas connection error:', errMsg);

    if (
      errMsg.includes('ENOTFOUND') ||
      errMsg.includes('querySrv') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('Server selection timed out')
    ) {
      throw new Error(
        `MongoDB Atlas connection unavailable: ${errMsg}. Please verify that MONGODB_URI contains a valid cluster hostname and MongoDB Atlas Network Access allowlist permits connections (0.0.0.0/0 for Vercel serverless).`
      );
    }
    throw err;
  }
}

/**
 * Returns active MongoDB database instance strictly connected to MongoDB Atlas.
 * No in-memory fallbacks or mock data permitted.
 */
export async function getDb(dbName?: string): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName || process.env.MONGODB_DB_NAME || 'oldletters');
}

// Typed collection getter
export async function getCollection<T extends Document = any>(name: string) {
  const db = await getDb();
  return db.collection<T>(name);
}

/**
 * Returns GridFSBucket strictly connected to MongoDB Atlas.
 */
export async function getGridFSBucket(bucketName: string = 'letterMedia'): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName });
}

export async function uploadGridFSBuffer(
  bucketName: string,
  filename: string,
  buffer: Buffer,
  metadata: any = {}
): Promise<{ fileId: ObjectId; filename: string }> {
  const bucket = await getGridFSBucket(bucketName);
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { metadata });
    const fileId = uploadStream.id as ObjectId;
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve({ fileId, filename }));
    uploadStream.end(buffer);
  });
}

export async function downloadGridFSBuffer(
  bucketName: string,
  fileId: ObjectId | string
): Promise<{ buffer: Buffer; filename?: string; contentType?: string } | null> {
  const bucket = await getGridFSBucket(bucketName);
  try {
    const id = ObjectId.isValid(fileId.toString()) ? new ObjectId(fileId.toString()) : (fileId as any);
    const downloadStream = bucket.openDownloadStream(id);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      downloadStream.on('data', (c) => chunks.push(Buffer.from(c)));
      downloadStream.on('end', () => resolve({ buffer: Buffer.concat(chunks) }));
      downloadStream.on('error', (err: any) => {
        if (err.message?.includes('FileNotFound') || err.code === 'ENOENT') {
          resolve(null);
        } else {
          reject(err);
        }
      });
    });
  } catch {
    return null;
  }
}

export async function deleteGridFSFile(
  bucketName: string,
  fileId: ObjectId | string
): Promise<boolean> {
  const bucket = await getGridFSBucket(bucketName);
  try {
    const id = ObjectId.isValid(fileId.toString()) ? new ObjectId(fileId.toString()) : (fileId as any);
    await bucket.delete(id);
    return true;
  } catch {
    return false;
  }
}

// Setup collection indexes for high performance and integrity
export async function setupDatabaseIndexes(): Promise<void> {
  try {
    const db = await getDb();

    // 1. letters indexes
    const letters = db.collection('letters');
    await letters.createIndex({ senderId: 1 });
    await letters.createIndex({ status: 1 });
    await letters.createIndex({ deliveryDate: 1 });
    await letters.createIndex({ trackingCode: 1 }, { unique: true, sparse: true });

    // 2. letterRecipients indexes
    const letterRecipients = db.collection('letterRecipients');
    await letterRecipients.createIndex({ letterId: 1 });
    await letterRecipients.createIndex({ email: 1 });

    // 3. deliveryTokens indexes
    const deliveryTokens = db.collection('deliveryTokens');
    await deliveryTokens.createIndex({ tokenHash: 1 }, { unique: true, sparse: true });
    await deliveryTokens.createIndex({ expiresAt: 1 });

    // 4. otpCodes indexes
    const otpCodes = db.collection('otpCodes');
    await otpCodes.createIndex({ email: 1 });
    await otpCodes.createIndex({ expiresAt: 1 });

    // 5. payments indexes
    const payments = db.collection('payments');
    await payments.createIndex({ status: 1 });
    await payments.createIndex({ userId: 1 });
    await payments.createIndex({ letterId: 1 });
    await payments.createIndex({ upiReference: 1 }, { unique: true, sparse: true });
    await payments.createIndex({ utr: 1 }, { unique: true, sparse: true });

    // 6. rateLimits indexes with TTL auto-expiration
    const rateLimits = db.collection('rateLimits');
    await rateLimits.createIndex({ key: 1 }, { unique: true });
    await rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // 7. deliveryEvents indexes
    const deliveryEvents = db.collection('deliveryEvents');
    await deliveryEvents.createIndex({ letterId: 1 });
    await deliveryEvents.createIndex({ letterId: 1, eventType: 1 }, { unique: true, sparse: true });

    // 7. users indexes
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ googleId: 1 }, { unique: true, sparse: true });

    // 8. adminUsers indexes
    const adminUsers = db.collection('adminUsers');
    await adminUsers.createIndex({ email: 1 }, { unique: true, sparse: true });

    // 9. letterTemplates indexes
    const letterTemplates = db.collection('letterTemplates');
    await letterTemplates.createIndex({ slug: 1 }, { unique: true, sparse: true });

    console.log('[OLD-LETTERS MongoDB] Collections & Indexes established.');
  } catch (err) {
    console.warn('[OLD-LETTERS MongoDB] Index setup notice:', err);
  }
}

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
}

// In-memory fallback if MongoDB connection is pending or offline in tests
const inMemoryRateLimits = new Map<string, { count: number; expiresAt: number; firstSeen: number }>();

export async function consumeDistributedRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitStatus> {
  const now = Date.now();
  const resetDate = new Date(now + windowMs);

  try {
    const db = await getDb();
    const rateLimitsColl = db.collection('rateLimits');

    // Atomic findOneAndUpdate with upsert
    const res = await rateLimitsColl.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          firstSeen: new Date(now),
          expiresAt: resetDate,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    const doc: any = res?.value || res;
    if (doc) {
      const count = doc.count || 1;
      const docExpiresAt = doc.expiresAt instanceof Date ? doc.expiresAt.getTime() : (now + windowMs);

      // If document expired before TTL purged it, reset bucket
      if (docExpiresAt < now) {
        await rateLimitsColl.updateOne(
          { key },
          { $set: { count: 1, expiresAt: resetDate, firstSeen: new Date(now) } }
        );
        return {
          allowed: true,
          limit,
          remaining: limit - 1,
          resetSeconds: Math.ceil(windowMs / 1000),
          retryAfterSeconds: 0,
        };
      }

      const remaining = Math.max(0, limit - count);
      const resetSeconds = Math.max(1, Math.ceil((docExpiresAt - now) / 1000));
      const allowed = count <= limit;

      return {
        allowed,
        limit,
        remaining,
        resetSeconds,
        retryAfterSeconds: allowed ? 0 : resetSeconds,
      };
    }
  } catch (err) {
    // Fall back to in-memory store
  }

  // Fallback in-memory rate limiting
  const rec = inMemoryRateLimits.get(key);
  if (!rec || rec.expiresAt < now) {
    inMemoryRateLimits.set(key, { count: 1, expiresAt: now + windowMs, firstSeen: now });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
      retryAfterSeconds: 0,
    };
  }

  rec.count += 1;
  const remaining = Math.max(0, limit - rec.count);
  const resetSeconds = Math.max(1, Math.ceil((rec.expiresAt - now) / 1000));
  const allowed = rec.count <= limit;

  return {
    allowed,
    limit,
    remaining,
    resetSeconds,
    retryAfterSeconds: allowed ? 0 : resetSeconds,
  };
}
