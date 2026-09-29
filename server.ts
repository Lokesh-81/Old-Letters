import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  CreateLetterSchema,
  SubmitPaymentSchema,
  AdminVerifyPaymentSchema,
  RecipientVerifySchema,
  PaymentRecord,
  PaidFeatureRecord,
} from './src/types/backend';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Ensure all /api responses default to application/json header
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Supabase server-side client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabase = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  !supabaseUrl.includes('your-project')
);

const supabase = hasSupabase
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Resend client
const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'post@old-letters.in';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Helpers
function hashSha256(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

// In-memory persistent fallback store for development & testing
interface StoredLetter {
  id: string;
  sender_id: string;
  tracking_code: string;
  type: string;
  template_id: string;
  sender_name: string;
  sender_email: string;
  recipient_name: string;
  recipient_email: string;
  salutation: string;
  body: string;
  signoff: string;
  status: string;
  verification_method: 'otp' | 'passphrase' | 'open';
  passphrase_hash?: string;
  delivery_date: string;
  waiting_hours: number;
  postmark_city: string;
  posted_at?: string;
  delivered_at?: string;
  opened_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  attachments: any[];
}

const memoryStore = {
  letters: new Map<string, StoredLetter>(),
  deliveryTokens: new Map<string, { letterId: string; tokenHash: string; expiresAt: string }>(),
  otpCodes: new Map<string, { letterId: string; email: string; otpHash: string; expiresAt: number; attempts: number; used: boolean }>(),
  payments: new Map<string, PaymentRecord>(),
  paidFeatures: new Map<string, PaidFeatureRecord>(),
  auditLogs: [] as any[],
  deliveryEvents: [] as any[],
};

// Seed initial memory archive letter
const initialLetterId = 'ol-init-001';
const initialToken = '48hourstowaitforloveceremony001';
memoryStore.letters.set(initialLetterId, {
  id: initialLetterId,
  sender_id: 'default-user',
  tracking_code: 'OL-1892-A',
  type: 'LOVE',
  template_id: 'ivory',
  sender_name: 'Lokesh',
  sender_email: 'lokesh@oldletters.in',
  recipient_name: 'Vasantha',
  recipient_email: 'vasantha@correspondence.in',
  salutation: 'Dearest Vasantha,',
  body: 'I am writing this on the quiet veranda as dusk descends. I chose the 48-hour post because some words deserve the quiet patience of waiting.',
  signoff: 'Yours in patience,',
  status: 'DELIVERED',
  verification_method: 'open',
  delivery_date: new Date(Date.now() - 3600 * 1000).toISOString(),
  waiting_hours: 48,
  postmark_city: 'Hyderabad Bureau',
  posted_at: new Date(Date.now() - 49 * 3600 * 1000).toISOString(),
  delivered_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  created_at: new Date(Date.now() - 49 * 3600 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
  attachments: [],
});

memoryStore.deliveryTokens.set(initialToken, {
  letterId: initialLetterId,
  tokenHash: hashSha256(initialToken),
  expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
});

// ====================================================================
// API ROUTES
// ====================================================================

// 1. Health & Config
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    backend: hasSupabase ? 'supabase-connected' : 'standalone-engine',
    resendConfigured: Boolean(resendApiKey),
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

// 2. Letters Archive: GET all letters for current sender
app.get('/api/letters', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('letters')
        .select(`
          *,
          letter_recipients(*),
          letter_media(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, letters: data || [] });
    }

    // Standalone fallback
    const list = Array.from(memoryStore.letters.values()).map((ltr) => ({
      id: ltr.id,
      trackingCode: ltr.tracking_code,
      type: ltr.type,
      templateId: ltr.template_id,
      senderName: ltr.sender_name,
      senderEmail: ltr.sender_email,
      recipientName: ltr.recipient_name,
      recipientEmail: ltr.recipient_email,
      letterDate: new Date(ltr.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      greeting: ltr.salutation,
      content: ltr.body,
      signoff: ltr.signoff,
      attachments: ltr.attachments || [],
      verificationMethod: ltr.verification_method,
      postedAt: ltr.posted_at || ltr.created_at,
      scheduledDeliveryAt: ltr.delivery_date,
      waitingHours: ltr.waiting_hours,
      status: ltr.status,
      postmarkCity: ltr.postmark_city,
    }));

    res.json({ success: true, letters: list });
  } catch (err: any) {
    console.error('Error fetching letters:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create Letter / Schedule Post (Enforces minimum 48 hours delivery constraint)
app.post('/api/letters', async (req, res) => {
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

    // Hash passphrase if provided
    const passphraseHash = input.passphrase ? hashSha256(input.passphrase.trim().toLowerCase()) : undefined;

    const letterId = `ol-${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (supabase) {
      // 1. Insert Letter
      const { data: insertedLetter, error: letterErr } = await supabase
        .from('letters')
        .insert({
          sender_id: req.body.senderId || '00000000-0000-0000-0000-000000000000',
          letter_type: input.type,
          template_id: input.templateId,
          salutation: input.greeting,
          body: input.content,
          signoff: input.signoff,
          status: input.status,
          delivery_date: input.scheduledDeliveryAt,
          tracking_code: trackingCode,
          recipient_verification_method: input.verificationMethod,
          secret_passphrase_hash: passphraseHash,
          postmark_city: input.postmarkCity,
          posted_at: nowIso,
        })
        .select()
        .single();

      if (letterErr) throw letterErr;

      // 2. Insert Recipient
      await supabase.from('letter_recipients').insert({
        letter_id: insertedLetter.id,
        email: input.recipientEmail,
        display_name: input.recipientName,
        verification_method: input.verificationMethod,
      });

      // 3. Insert Delivery Token (hashed)
      await supabase.from('delivery_tokens').insert({
        letter_id: insertedLetter.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      });

      // 4. Emit Delivery Event
      await supabase.from('delivery_events').insert({
        letter_id: insertedLetter.id,
        event_type: 'LETTER_POSTED',
        metadata: { scheduled_for: input.scheduledDeliveryAt },
      });

      return res.status(201).json({
        success: true,
        letter: insertedLetter,
        trackingCode,
        deliveryToken: rawDeliveryToken,
      });
    }

    // Standalone memory store
    const stored: StoredLetter = {
      id: letterId,
      sender_id: 'default-user',
      tracking_code: trackingCode,
      type: input.type,
      template_id: input.templateId,
      sender_name: input.senderName,
      sender_email: input.senderEmail,
      recipient_name: input.recipientName,
      recipient_email: input.recipientEmail,
      salutation: input.greeting,
      body: input.content,
      signoff: input.signoff,
      status: input.status,
      verification_method: input.verificationMethod,
      passphrase_hash: passphraseHash,
      delivery_date: input.scheduledDeliveryAt,
      waiting_hours: input.waitingHours,
      postmark_city: input.postmarkCity || 'Bureau of Correspondence',
      posted_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      attachments: req.body.attachments || [],
    };

    memoryStore.letters.set(letterId, stored);
    memoryStore.deliveryTokens.set(rawDeliveryToken, {
      letterId,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    });

    memoryStore.deliveryEvents.push({
      id: `evt-${Date.now()}`,
      letterId,
      eventType: 'LETTER_POSTED',
      createdAt: nowIso,
    });

    res.status(201).json({
      success: true,
      letter: {
        id: stored.id,
        trackingCode: stored.tracking_code,
        type: stored.type,
        templateId: stored.template_id,
        senderName: stored.sender_name,
        senderEmail: stored.sender_email,
        recipientName: stored.recipient_name,
        recipientEmail: stored.recipient_email,
        letterDate: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        greeting: stored.salutation,
        content: stored.body,
        signoff: stored.signoff,
        attachments: stored.attachments,
        verificationMethod: stored.verification_method,
        postedAt: stored.posted_at,
        scheduledDeliveryAt: stored.delivery_date,
        waitingHours: stored.waiting_hours,
        status: stored.status,
        postmarkCity: stored.postmark_city,
      },
      trackingCode,
      deliveryToken: rawDeliveryToken,
    });
  } catch (err: any) {
    console.error('Error posting letter:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Delivery Token: Retrieve public letter metadata (No secret content before verification)
app.get('/api/delivery/token/:token', async (req, res) => {
  try {
    const rawToken = req.params.token;
    const tokenHash = hashSha256(rawToken);

    let letter: any = null;

    if (supabase) {
      const { data: tokenRec } = await supabase
        .from('delivery_tokens')
        .select('*, letters(*, letter_recipients(*))')
        .eq('token_hash', tokenHash)
        .single();

      if (tokenRec) {
        letter = tokenRec.letters;
      }
    } else {
      const tokenRec = memoryStore.deliveryTokens.get(rawToken);
      if (tokenRec) {
        letter = memoryStore.letters.get(tokenRec.letterId);
      }
    }

    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter link not found or expired.' });
    }

    // Mask recipient email for privacy
    const recipientEmail = letter.recipient_email || letter.letter_recipients?.[0]?.email || '';
    const maskedEmail = recipientEmail.replace(/(?<=.).(?=.*@)/g, '*');

    res.json({
      success: true,
      metadata: {
        trackingCode: letter.tracking_code,
        senderName: letter.sender_name || 'A correspondent',
        recipientName: letter.recipient_name || letter.letter_recipients?.[0]?.display_name || 'Recipient',
        recipientEmailMasked: maskedEmail,
        verificationMethod: letter.verification_method || letter.recipient_verification_method || 'open',
        status: letter.status,
        isDelivered: letter.status === 'DELIVERED' || letter.status === 'OPENED' || letter.status === 'COMPLETED',
        deliveryDate: letter.delivery_date,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Recipient Verification: Request OTP
app.post('/api/delivery/request-otp', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Delivery token required' });
    }

    const tokenRec = memoryStore.deliveryTokens.get(token);
    let letter: any = null;

    if (tokenRec) {
      letter = memoryStore.letters.get(tokenRec.letterId);
    }

    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found' });
    }

    // Generate 6-digit OTP
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = hashSha256(otpCode);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    memoryStore.otpCodes.set(letter.id, {
      letterId: letter.id,
      email: letter.recipient_email,
      otpHash,
      expiresAt,
      attempts: 0,
      used: false,
    });

    // Send email via Resend if configured
    if (resend) {
      try {
        await resend.emails.send({
          from: `OLD-LETTERS <${resendFromEmail}>`,
          to: letter.recipient_email,
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
        console.error('Failed to send Resend email:', emailErr);
      }
    }

    res.json({
      success: true,
      message: 'Verification code dispatched to recipient email.',
      // In dev mode when Resend is not configured, supply hint for tester
      devOtpHint: resend ? undefined : otpCode,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Recipient Verification: Submit OTP or Passphrase
app.post('/api/delivery/verify', async (req, res) => {
  try {
    const parseResult = RecipientVerifySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues.map((e: any) => e.message).join(', '),
      });
    }

    const { token, verificationMethod, otp, passphrase } = parseResult.data;
    const tokenRec = memoryStore.deliveryTokens.get(token);
    let letter: any = null;

    if (tokenRec) {
      letter = memoryStore.letters.get(tokenRec.letterId);
    }

    if (!letter) {
      return res.status(404).json({ success: false, error: 'Letter not found' });
    }

    let isVerified = false;

    if (verificationMethod === 'open') {
      isVerified = true;
    } else if (verificationMethod === 'otp') {
      const activeOtp = memoryStore.otpCodes.get(letter.id);
      if (!activeOtp || activeOtp.used || activeOtp.expiresAt < Date.now()) {
        return res.status(400).json({ success: false, error: 'Verification code expired or invalid.' });
      }

      if (activeOtp.attempts >= 5) {
        return res.status(429).json({ success: false, error: 'Maximum attempts exceeded. Verification locked.' });
      }

      const inputHash = hashSha256(String(otp || '').trim());
      if (inputHash === activeOtp.otpHash) {
        activeOtp.used = true;
        isVerified = true;
      } else {
        activeOtp.attempts += 1;
        return res.status(401).json({ success: false, error: 'Incorrect verification code.' });
      }
    } else if (verificationMethod === 'passphrase') {
      const inputHash = hashSha256(String(passphrase || '').trim().toLowerCase());
      if (inputHash === letter.passphrase_hash) {
        isVerified = true;
      } else {
        return res.status(401).json({ success: false, error: 'Incorrect cipher passphrase.' });
      }
    }

    if (isVerified) {
      // Mark as OPENED
      letter.status = 'OPENED';
      letter.opened_at = new Date().toISOString();

      // Check paid features for this letter
      const paidList = Array.from(memoryStore.paidFeatures.values())
        .filter((pf) => pf.letterId === letter.id && pf.status === 'UNLOCKED')
        .map((pf) => pf.featureCode);

      return res.json({
        success: true,
        letter: {
          id: letter.id,
          trackingCode: letter.tracking_code,
          type: letter.type,
          templateId: letter.template_id,
          senderName: letter.sender_name,
          recipientName: letter.recipient_name,
          letterDate: new Date(letter.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          greeting: letter.salutation,
          content: letter.body,
          signoff: letter.signoff,
          attachments: letter.attachments || [],
          status: letter.status,
          paidFeatures: paidList,
        },
      });
    }

    res.status(403).json({ success: false, error: 'Verification failed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Delivery Scheduler Worker (Idempotent cron runner)
app.post('/api/scheduler/tick', async (req, res) => {
  try {
    const now = new Date();
    const deliveredLetters = [];

    for (const [id, letter] of memoryStore.letters.entries()) {
      if (letter.status === 'SCHEDULED' && new Date(letter.delivery_date) <= now) {
        // Transition to DELIVERED
        letter.status = 'DELIVERED';
        letter.delivered_at = now.toISOString();

        // Generate delivery token
        const rawToken = crypto.randomBytes(32).toString('hex');
        memoryStore.deliveryTokens.set(rawToken, {
          letterId: id,
          tokenHash: hashSha256(rawToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        });

        // Record delivery event
        memoryStore.deliveryEvents.push({
          id: `evt-${Date.now()}`,
          letterId: id,
          eventType: 'LETTER_DELIVERED',
          createdAt: now.toISOString(),
        });

        // Send recipient email via Resend
        if (resend && letter.recipient_email) {
          try {
            const deliveryUrl = `${process.env.APP_URL || 'http://localhost:3000'}/letter/${rawToken}`;
            await resend.emails.send({
              from: `OLD-LETTERS <${resendFromEmail}>`,
              to: letter.recipient_email,
              subject: 'Your letter has arrived — OLD-LETTERS',
              html: `
                <div style="background-color: #faf9f7; padding: 48px 24px; font-family: serif; color: #134e4a; text-align: center;">
                  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #eae4da; padding: 40px 32px; border-radius: 4px;">
                    <div style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #78716c; margin-bottom: 16px; font-family: monospace;">
                      DISPATCH REF: ${letter.tracking_code}
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
          } catch (e) {
            console.error('Scheduler email error:', e);
          }
        }

        deliveredLetters.push({ id, trackingCode: letter.tracking_code, recipient: letter.recipient_email });
      }
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

// 8. Payments: Submit Manual UPI Payment (Status begins strictly as PENDING)
app.post('/api/payments/create', async (req, res) => {
  try {
    const parseResult = SubmitPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues.map((e: any) => e.message).join(', '),
      });
    }

    const input = parseResult.data;
    const paymentId = `pay-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const paymentRecord: PaymentRecord = {
      id: paymentId,
      userId: req.body.userId || 'current-user',
      letterId: input.letterId,
      featureCode: input.featureCode,
      amount: input.amount,
      currency: input.currency || 'INR',
      upiReference: input.upiReference,
      paymentScreenshotPath: input.screenshotUrl,
      status: 'PENDING', // NEVER automatically approved
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    memoryStore.payments.set(paymentId, paymentRecord);

    // Also register pending feature
    const paidFeatureId = `pf-${Date.now()}`;
    memoryStore.paidFeatures.set(paidFeatureId, {
      id: paidFeatureId,
      letterId: input.letterId || 'unassigned',
      featureCode: input.featureCode,
      paymentId: paymentId,
      status: 'PENDING',
      createdAt: nowIso,
    });

    res.status(201).json({
      success: true,
      payment: paymentRecord,
      message: 'UPI payment submitted. Awaiting administrative verification.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Admin: List Payments for Review
app.get('/api/admin/payments', (req, res) => {
  const list = Array.from(memoryStore.payments.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, payments: list });
});

// 10. Admin: Verify Payment (Approve or Reject)
app.post('/api/admin/payments/:id/verify', (req, res) => {
  try {
    const paymentId = req.params.id;
    const payment = memoryStore.payments.get(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    const parseResult = AdminVerifyPaymentSchema.safeParse({
      paymentId,
      status: req.body.status,
      adminNote: req.body.adminNote,
    });

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: (parseResult.error as any).issues.map((e: any) => e.message).join(', '),
      });
    }

    const { status, adminNote } = parseResult.data;
    const nowIso = new Date().toISOString();

    payment.status = status;
    payment.adminNote = adminNote || null;
    payment.verifiedBy = 'admin@old-letters.in';
    payment.verifiedAt = nowIso;
    payment.updatedAt = nowIso;

    // If APPROVED, unlock the paid feature!
    if (status === 'APPROVED') {
      for (const pf of memoryStore.paidFeatures.values()) {
        if (pf.paymentId === paymentId) {
          pf.status = 'UNLOCKED';
        }
      }

      memoryStore.auditLogs.push({
        id: `audit-${Date.now()}`,
        action: 'PAYMENT_APPROVED',
        entityType: 'PAYMENT',
        entityId: paymentId,
        metadata: {
          featureCode: payment.featureCode,
          amount: payment.amount,
          upiReference: payment.upiReference,
        },
        createdAt: nowIso,
      });
    } else if (status === 'REJECTED') {
      for (const pf of memoryStore.paidFeatures.values()) {
        if (pf.paymentId === paymentId) {
          pf.status = 'CANCELLED';
        }
      }

      memoryStore.auditLogs.push({
        id: `audit-${Date.now()}`,
        action: 'PAYMENT_REJECTED',
        entityType: 'PAYMENT',
        entityId: paymentId,
        metadata: { adminNote },
        createdAt: nowIso,
      });
    }

    res.json({
      success: true,
      payment,
      message: `Payment marked as ${status}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Admin: View Audit Logs
app.get('/api/admin/audit-logs', (req, res) => {
  res.json({ success: true, auditLogs: memoryStore.auditLogs });
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
    console.log(`[OLD-LETTERS] Server active on port ${PORT}`);
  });
}

startServer();
