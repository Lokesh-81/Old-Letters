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
  templateId: z
    .string()
    .trim()
    .min(1, 'Please choose your stationery before sealing the letter.'),
  senderName: z.string().trim().min(1, 'Sender name is required').max(100),
  senderEmail: z.string().trim().email('Valid sender email required'),
  recipientName: z.string().trim().min(1, 'Recipient name is required').max(100),
  recipientEmail: z.string().trim().email('Valid recipient email required'),
  greeting: z.string().trim().min(1, 'Salutation greeting is required'),
  content: z.string().trim().min(5, 'Letter body content must be meaningful (at least 5 characters)'),
  signoff: z.string().trim().min(1, 'Signoff is required'),
  verificationMethod: z.enum(['otp', 'passphrase', 'open']).default('open'),
  passphrase: z.string().optional(),
  scheduledDeliveryAt: z.string().optional().nullable(),
  selectedTempoId: z.string().optional(),
  waitingHours: z.number().min(48, 'Minimum 48 hours required').default(48),
  postmarkCity: z.string().optional().default('Central Postal Archive'),
  status: z.enum(['DRAFT', 'SCHEDULED']).default('SCHEDULED'),
  paymentId: z.string().optional().nullable(),
  hasMediaAttachment: z.boolean().optional(),
  mediaType: z.enum(['VOICE', 'VIDEO']).optional().nullable(),
  mediaStorageKey: z.string().optional().nullable(),
  mediaStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'DELETED']).optional(),
  personalMessage: z.any().optional(),
});

export type CreateLetterInput = z.infer<typeof CreateLetterSchema>;

// Manual UPI Payment Submission Schema
export const SubmitPaymentSchema = z.object({
  letterId: z.string().optional().nullable(),
  recipientEmail: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  mediaType: z.enum(['VOICE', 'VIDEO', 'VOICE_NOTE', 'VIDEO_NOTE']).optional(),
  featureCode: z.enum(['VOICE_NOTE', 'VIDEO_NOTE', 'LIVE_MEETING', 'VOICE', 'VIDEO']).optional(),
  featureType: z.enum(['VOICE_MESSAGE', 'VIDEO_MESSAGE', 'VOICE_NOTE', 'VIDEO_NOTE']).optional(),
  amount: z.number().positive(),
  currency: z.string().optional().default('INR'),
  upiReference: z
    .string()
    .trim()
    .min(6, 'Please enter a valid UPI transaction reference / UTR number (at least 6 characters).')
    .max(35, 'UPI transaction reference cannot exceed 35 characters.'),
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
  token: z.string().min(1),
  verificationMethod: z.enum(['otp', 'passphrase', 'open']).optional(),
  otp: z.string().length(6).optional(),
  passphrase: z.string().optional(),
});

export type RecipientVerifyInput = z.infer<typeof RecipientVerifySchema>;

// Payment Record Type
export interface PaymentRecord {
  id: string;
  paymentId: string;
  userId: string;
  userEmail?: string;
  senderName?: string;
  senderEmail?: string;
  recipientEmail?: string;
  recipientName?: string;
  letterId?: string | null;
  trackingCode?: string | null;
  mediaType?: 'VOICE' | 'VIDEO';
  featureCode?: 'VOICE_NOTE' | 'VIDEO_NOTE' | 'LIVE_MEETING' | 'VOICE' | 'VIDEO';
  featureType?: 'VOICE_MESSAGE' | 'VIDEO_MESSAGE' | string;
  description?: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  upiReference: string;
  mediaStatus?: 'AWAITING_RECORDING' | 'PENDING_REVIEW' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED' | string;
  mediaStorageKey?: string | null;
  hasMediaAttachment?: boolean;
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
  featureCode: 'VOICE_NOTE' | 'VIDEO_NOTE' | 'LIVE_MEETING' | 'VOICE' | 'VIDEO';
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
  recipientEmail?: string | null;
  mediaType?: 'VOICE' | 'VIDEO';
  featureCode?: string;
  description: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  upiReference: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  mediaStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  mediaStorageKey?: string | null;
  hasMediaAttachment?: boolean;
  refundStatus?: 'NONE' | 'REQUESTED' | 'REFUNDED';
  adminNote?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}
