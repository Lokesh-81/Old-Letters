import { z } from 'zod';
import { LetterType } from './letter';

// Minimum waiting hours: strictly 48 hours
export const MIN_DELIVERY_HOURS = 48;

// Canonical Policy Versions
export const CURRENT_TERMS_VERSION = '2026-10-01';
export const CURRENT_PRIVACY_VERSION = '2026-10-01';

// Legal Consent Schema
export const LegalConsentSchema = z.object({
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  termsVersion: z.string().default(CURRENT_TERMS_VERSION),
  privacyVersion: z.string().default(CURRENT_PRIVACY_VERSION),
});

export type LegalConsentInput = z.infer<typeof LegalConsentSchema>;

// Letter creation Zod schema
export const CreateLetterSchema = z.object({
  type: z.string().min(1) as z.ZodType<LetterType>,
  templateId: z.string().default('ivory'),
  senderName: z.string().min(1, 'Sender name is required').max(100),
  senderEmail: z.string().email('Valid sender email required'),
  recipientName: z.string().min(1, 'Recipient name is required').max(100),
  recipientEmail: z.string().email('Valid recipient email required'),
  greeting: z.string().min(1, 'Salutation greeting is required'),
  content: z.string().min(1, 'Letter body content is required'),
  signoff: z.string().min(1, 'Signoff is required'),
  verificationMethod: z.enum(['otp', 'passphrase', 'open']).default('open'),
  passphrase: z.string().optional(),
  scheduledDeliveryAt: z.string().refine((val) => {
    const deliveryDate = new Date(val).getTime();
    const minTime = Date.now() + (MIN_DELIVERY_HOURS - 1) * 3600 * 1000; // 1-hour tolerance for client clock skew
    return !isNaN(deliveryDate) && deliveryDate >= minTime;
  }, {
    message: `Delivery date must be at least ${MIN_DELIVERY_HOURS} hours in the future`,
  }),
  waitingHours: z.number().min(48, 'Minimum 48 hours required').default(48),
  postmarkCity: z.string().optional().default('Hyderabad Bureau'),
  status: z.enum(['DRAFT', 'SCHEDULED']).default('SCHEDULED'),
});

export type CreateLetterInput = z.infer<typeof CreateLetterSchema>;

// Manual UPI Payment Submission Schema
export const SubmitPaymentSchema = z.object({
  letterId: z.string().optional().nullable(),
  featureCode: z.enum(['VOICE_NOTE', 'VIDEO_NOTE', 'LIVE_MEETING']),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  upiReference: z.string().min(6, 'Valid UPI reference / UTR number required').max(50),
  screenshotUrl: z.string().optional().nullable(),
});

export type SubmitPaymentInput = z.infer<typeof SubmitPaymentSchema>;

// Admin Payment Verification Schema
export const AdminVerifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED']),
  adminNote: z.string().max(500).optional(),
});

export type AdminVerifyPaymentInput = z.infer<typeof AdminVerifyPaymentSchema>;

// Recipient Verification Request Schema
export const RecipientVerifySchema = z.object({
  token: z.string().min(16),
  verificationMethod: z.enum(['otp', 'passphrase', 'open']).optional(),
  otp: z.string().length(6).optional(),
  passphrase: z.string().optional(),
});

export type RecipientVerifyInput = z.infer<typeof RecipientVerifySchema>;

// Payment Record Type
export interface PaymentRecord {
  id: string;
  userId: string;
  letterId?: string | null;
  featureCode: 'VOICE_NOTE' | 'VIDEO_NOTE' | 'LIVE_MEETING';
  amount: number;
  currency: string;
  upiReference: string;
  paymentScreenshotPath?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  adminNote?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Paid Feature Record
export interface PaidFeatureRecord {
  id: string;
  letterId: string;
  featureCode: 'VOICE_NOTE' | 'VIDEO_NOTE' | 'LIVE_MEETING';
  paymentId: string;
  status: 'PENDING' | 'UNLOCKED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}

// User Notification Preferences
export interface NotificationPreferences {
  letterDispatched: boolean;
  deliveryUpdates: boolean;
  preArrival: boolean;
  arrival: boolean;
  paymentUpdates: boolean;
}

// Bureau Summary Statistics
export interface BureauStats {
  sentCount: number;
  receivedCount: number;
  inTransitCount: number;
  deliveredCount: number;
  totalSpent: number;
}

// Received Letter Summary for Recipient Archive
export interface ReceivedLetterSummary {
  id: string;
  trackingCode: string;
  senderName: string;
  letterType: string;
  templateId: string;
  letterDate: string;
  postedAt?: string;
  scheduledDeliveryAt?: string;
  deliveredAt?: string;
  status: string;
  isSealed: boolean;
  canOpen: boolean;
  deliveryToken?: string;
  sealedMessage?: string;
  postmarkCity?: string;
  verificationMethod?: string;
}

// Bureau Payment Item for User History
export interface BureauPaymentItem {
  id: string;
  paymentId: string;
  letterId?: string | null;
  trackingCode?: string | null;
  recipientName?: string | null;
  featureCode: string;
  description: string;
  amount: number;
  currency: string;
  upiReference: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  refundStatus?: 'NONE' | 'REQUESTED' | 'REFUNDED';
  adminNote?: string | null;
  createdAt: string;
}
