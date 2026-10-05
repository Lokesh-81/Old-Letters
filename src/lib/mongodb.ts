import { MongoClient, Db, ObjectId, GridFSBucket, Document } from 'mongodb';
import { PassThrough } from 'stream';

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

// In-memory fallback collection for offline/development environments when Atlas is not yet connected
class MemoryCollection<T extends { _id?: any }> {
  private docs: Map<string, T> = new Map();

  find(query: any = {}) {
    const list = Array.from(this.docs.values()).filter((doc: any) => this.matchQuery(doc, query));
    return {
      toArray: async () => list,
      sort: (sortObj: any) => ({
        toArray: async () => {
          const keys = Object.keys(sortObj);
          return [...list].sort((a: any, b: any) => {
            for (const key of keys) {
              const dir = sortObj[key] === 1 ? 1 : -1;
              const valA = a[key];
              const valB = b[key];
              if (valA < valB) return -1 * dir;
              if (valA > valB) return 1 * dir;
            }
            return 0;
          });
        },
      }),
    };
  }

  async findOne(query: any) {
    for (const doc of this.docs.values()) {
      if (this.matchQuery(doc, query)) {
        return doc;
      }
    }
    return null;
  }

  async insertOne(doc: any) {
    const newDoc = {
      ...doc,
      _id: doc._id || new ObjectId(),
    };
    this.docs.set(newDoc._id.toString(), newDoc);
    return { insertedId: newDoc._id, acknowledged: true };
  }

  async insertMany(docs: any[]) {
    const insertedIds: any = {};
    let idx = 0;
    for (const doc of docs) {
      const newDoc = {
        ...doc,
        _id: doc._id || new ObjectId(),
      };
      this.docs.set(newDoc._id.toString(), newDoc);
      insertedIds[idx++] = newDoc._id;
    }
    return { insertedIds, acknowledged: true };
  }

  async updateOne(filter: any, update: any) {
    const doc = await this.findOne(filter);
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        (doc as any)[k] = ((doc as any)[k] || 0) + (v as number);
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter: any, update: any) {
    let matchedCount = 0;
    let modifiedCount = 0;
    for (const doc of this.docs.values()) {
      if (this.matchQuery(doc, filter)) {
        matchedCount++;
        if (update.$set) {
          Object.assign(doc, update.$set);
          modifiedCount++;
        }
        if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc)) {
            (doc as any)[k] = ((doc as any)[k] || 0) + (v as number);
          }
          modifiedCount++;
        }
      }
    }
    return { matchedCount, modifiedCount };
  }

  async deleteOne(filter: any) {
    for (const [id, doc] of this.docs.entries()) {
      if (this.matchQuery(doc, filter)) {
        this.docs.delete(id);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: any) {
    let deletedCount = 0;
    for (const [id, doc] of Array.from(this.docs.entries())) {
      if (this.matchQuery(doc, filter)) {
        this.docs.delete(id);
        deletedCount++;
      }
    }
    return { deletedCount };
  }

  async findOneAndUpdate(filter: any, update: any) {
    const doc = await this.findOne(filter);
    if (!doc) return null;
    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    return doc;
  }

  async countDocuments(query: any = {}) {
    let count = 0;
    for (const doc of this.docs.values()) {
      if (this.matchQuery(doc, query)) count++;
    }
    return count;
  }

  async createIndex() {
    return 'index_created';
  }

  private matchQuery(doc: any, query: any): boolean {
    if (!query || Object.keys(query).length === 0) return true;

    if (query.$or && Array.isArray(query.$or)) {
      const matchAny = query.$or.some((subQuery: any) => this.matchQuery(doc, subQuery));
      if (!matchAny) return false;
    }

    if (query.$and && Array.isArray(query.$and)) {
      const matchAll = query.$and.every((subQuery: any) => this.matchQuery(doc, subQuery));
      if (!matchAll) return false;
    }

    for (const [k, v] of Object.entries(query)) {
      if (k === '$or' || k === '$and') continue;

      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof ObjectId)) {
        if ('$lte' in v && !(doc[k] <= (v as any).$lte)) return false;
        if ('$gte' in v && !(doc[k] >= (v as any).$gte)) return false;
        if ('$eq' in v && doc[k] !== (v as any).$eq) return false;
        if ('$ne' in v && doc[k] === (v as any).$ne) return false;
        if ('$in' in v && !(v as any).$in.includes(doc[k])) return false;
      } else if (k === '_id' || k === 'senderId' || k === 'letterId' || k === 'userId' || k === 'paymentId') {
        const idStr = v?.toString();
        const docIdStr = doc[k]?.toString();
        if (idStr !== docIdStr) return false;
      } else if (doc[k] !== v) {
        return false;
      }
    }
    return true;
  }
}

// In-Memory GridFS Bucket implementation for resilient operation
export class MemoryGridFSBucket {
  private files: Map<string, { id: ObjectId; filename: string; metadata: any; buffer: Buffer; uploadDate: Date }> = new Map();

  openUploadStream(filename: string, options?: any) {
    const fileId = new ObjectId();
    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    stream.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    stream.on('finish', () => {
      const buffer = Buffer.concat(chunks);
      this.files.set(fileId.toString(), {
        id: fileId,
        filename,
        metadata: options?.metadata || {},
        buffer,
        uploadDate: new Date(),
      });
    });

    (stream as any).id = fileId;
    return stream;
  }

  openDownloadStream(id: ObjectId | string) {
    const file = this.files.get(id.toString());
    if (!file) {
      const errStream = new PassThrough();
      process.nextTick(() => errStream.emit('error', new Error('FileNotFound: File not found in GridFS')));
      return errStream;
    }
    const stream = new PassThrough();
    process.nextTick(() => {
      stream.end(file.buffer);
    });
    return stream;
  }

  async delete(id: ObjectId | string): Promise<void> {
    this.files.delete(id.toString());
  }

  find(filter: any = {}) {
    const list = Array.from(this.files.values()).filter((f) => {
      if (filter._id && f.id.toString() !== filter._id.toString()) return false;
      if (filter.filename && f.filename !== filter.filename) return false;
      return true;
    });
    return {
      toArray: async () => list,
    };
  }

  getFile(id: ObjectId | string) {
    return this.files.get(id.toString()) || null;
  }
}

// Memory Database implementation for local fallback
class MemoryDb {
  private collections: Map<string, MemoryCollection<any>> = new Map();

  collection<T extends { _id?: any }>(name: string): any {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection<T>());
    }
    return this.collections.get(name)!;
  }
}

// Global cached client connection across serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _memoryDbInstance: MemoryDb | undefined;
  // eslint-disable-next-line no-var
  var _memoryGridFSBuckets: Map<string, MemoryGridFSBucket> | undefined;
}

const uri = process.env.MONGODB_URI || '';
let clientPromise: Promise<MongoClient> | null = null;
let isRealMongo = false;

if (uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))) {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = client.connect();
  }
  isRealMongo = true;
}

export function isUsingAtlas(): boolean {
  return isRealMongo;
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (clientPromise) {
    try {
      return await clientPromise;
    } catch (err) {
      console.warn('[OLD-LETTERS MongoDB] Atlas connection error, using resilient fallback:', err);
      return null;
    }
  }
  return null;
}

export async function getDb(dbName?: string): Promise<Db> {
  const client = await getMongoClient();
  if (client) {
    return client.db(dbName || process.env.MONGODB_DB_NAME || 'oldletters');
  }

  // Provide cached memory database fallback
  if (!global._memoryDbInstance) {
    global._memoryDbInstance = new MemoryDb();
  }
  return global._memoryDbInstance as unknown as Db;
}

// Typed collection getters
export async function getCollection<T extends Document = any>(name: string) {
  const db = await getDb();
  return (db as any).collection(name);
}

export async function getGridFSBucket(bucketName: string = 'letterMedia'): Promise<GridFSBucket | MemoryGridFSBucket> {
  const client = await getMongoClient();
  if (client) {
    const db = client.db(process.env.MONGODB_DB_NAME || 'oldletters');
    return new GridFSBucket(db, { bucketName });
  }

  if (!global._memoryGridFSBuckets) {
    global._memoryGridFSBuckets = new Map();
  }
  if (!global._memoryGridFSBuckets.has(bucketName)) {
    global._memoryGridFSBuckets.set(bucketName, new MemoryGridFSBucket());
  }
  return global._memoryGridFSBuckets.get(bucketName)!;
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
    const fileId = (uploadStream as any).id as ObjectId;
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

    // 6. deliveryEvents indexes
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
