import dotenv from 'dotenv';
import { getDb, setupDatabaseIndexes, ObjectId } from '../src/lib/mongodb';
import { TEMPLATES } from '../src/data/mockData';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

dotenv.config();

function hashSha256(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

export async function seedDatabase() {
  console.log('[OLD-LETTERS Seed] Initializing MongoDB database collections...');
  const db = await getDb();

  await setupDatabaseIndexes();

  // 1. Seed Letter Templates
  const templatesColl = db.collection('letterTemplates');
  for (const t of TEMPLATES) {
    const existing = await templatesColl.findOne({ slug: t.id });
    if (!existing) {
      await templatesColl.insertOne({
        name: t.name,
        slug: t.id,
        category: t.category,
        description: t.description,
        previewImageUrl: undefined,
        configuration: {
          paperBg: t.paperBg,
          paperColor: t.paperColor,
          textColor: t.textColor,
          fontFamily: t.fontFamily,
          accentBorder: t.borderColor || t.borderStyle,
          sealColor: t.waxSealStyle?.color || '#5c1d24',
          sealEmblem: t.waxSealStyle?.emblem || '✒',
          envelopeBg: t.envelopeStyle?.bgColor || '#ece5d8',
          envelopeFlapBg: t.envelopeStyle?.flapColor || '#ded4c3',
          tagline: t.tagline,
        },
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  console.log(`[OLD-LETTERS Seed] Seeded ${TEMPLATES.length} stationery templates.`);

  // 2. Seed Admin Users
  const adminUsersColl = db.collection('adminUsers');
  const admins = [
    { email: process.env.ADMIN_EMAIL || 'admin@old-letters.in', role: 'SUPER_ADMIN' },
    { email: 'lokesh@oldletters.in', role: 'POSTMASTER' },
  ];
  for (const admin of admins) {
    const existing = await adminUsersColl.findOne({ email: admin.email });
    if (!existing) {
      await adminUsersColl.insertOne({
        email: admin.email,
        role: admin.role,
        createdAt: new Date(),
      });
    }
  }

  // 3. Seed Sample Indian Users
  const usersColl = db.collection('users');
  const sampleUsers = [
    { fullName: 'Lokesh', email: 'lokesh@oldletters.in', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120' },
    { fullName: 'Vasantha', email: 'vasantha@correspondence.in', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120' },
    { fullName: 'Vijay', email: 'vijay.k@techpark.in', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120' },
    { fullName: 'Satya', email: 'satya.dev@craft.org', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120' },
    { fullName: 'Sravani', email: 'sravani.rao@letterpost.in', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120' },
    { fullName: 'Harshitha', email: 'harshitha.v@hyderabad.in', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120' },
    { fullName: 'Sathwik', email: 'sathwik.b@bengaluru.in', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120' },
    { fullName: 'Karthik', email: 'karthik.m@chennai.in', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120' },
  ];

  const defaultPasswordHash = await bcrypt.hash('letters1892', 10);
  const userMap = new Map<string, any>();

  for (const u of sampleUsers) {
    let existing = await usersColl.findOne({ email: u.email });
    if (!existing) {
      const res = await usersColl.insertOne({
        fullName: u.fullName,
        email: u.email,
        passwordHash: defaultPasswordHash,
        avatarUrl: u.avatarUrl,
        authProvider: 'EMAIL',
        role: u.email === 'lokesh@oldletters.in' ? 'ADMIN' : 'USER',
        emailVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: '2026-10-01',
        privacyVersion: '2026-10-01',
        legalConsentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      existing = { _id: res.insertedId, ...u };
    }
    userMap.set(u.email, existing);
  }

  // 4. Seed Letters and Recipient records
  const lettersColl = db.collection('letters');
  const recipientsColl = db.collection('letterRecipients');
  const deliveryTokensColl = db.collection('deliveryTokens');
  const deliveryEventsColl = db.collection('deliveryEvents');

  const lokeshUser = userMap.get('lokesh@oldletters.in');
  const lokeshId = lokeshUser ? lokeshUser._id : new ObjectId();

  const count = await lettersColl.countDocuments();
  if (count === 0) {
    const rawToken = '48hourstowaitforloveceremony001';
    const tokenHash = hashSha256(rawToken);

    const letterId = new ObjectId();
    const now = new Date();
    const past49Hours = new Date(now.getTime() - 49 * 3600 * 1000);
    const past1Hour = new Date(now.getTime() - 1 * 3600 * 1000);

    await lettersColl.insertOne({
      _id: letterId,
      senderId: lokeshId,
      letterType: 'LOVE',
      templateId: 'ivory',
      salutation: 'Dearest Vasantha,',
      body: 'I am writing this on the quiet veranda in Hyderabad as dusk descends. I chose the 48-hour post because some words deserve the quiet patience of waiting.',
      signoff: 'Yours in patience,',
      status: 'DELIVERED',
      deliveryDate: past1Hour,
      trackingCode: 'OL-1892-A',
      recipientVerificationMethod: 'open',
      postmarkCity: 'Hyderabad Bureau',
      waitingHours: 48,
      attachments: [],
      postedAt: past49Hours,
      deliveredAt: past1Hour,
      createdAt: past49Hours,
      updatedAt: past1Hour,
    });

    await recipientsColl.insertOne({
      letterId: letterId,
      email: 'vasantha@correspondence.in',
      displayName: 'Vasantha',
      verificationMethod: 'open',
      verifiedAt: past1Hour,
      createdAt: past49Hours,
    });

    await deliveryTokensColl.insertOne({
      letterId: letterId,
      tokenHash: tokenHash,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
      createdAt: past49Hours,
    });

    await deliveryEventsColl.insertOne({
      letterId: letterId,
      eventType: 'LETTER_POSTED',
      metadata: { city: 'Hyderabad Bureau' },
      createdAt: past49Hours,
    });

    await deliveryEventsColl.insertOne({
      letterId: letterId,
      eventType: 'LETTER_DELIVERED',
      metadata: { recipient: 'vasantha@correspondence.in' },
      createdAt: past1Hour,
    });

    console.log('[OLD-LETTERS Seed] Sample correspondence seeded successfully.');
  }

  console.log('[OLD-LETTERS Seed] Seeding completed.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('[OLD-LETTERS Seed] Ready.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[OLD-LETTERS Seed] Error:', err);
      process.exit(1);
    });
}
