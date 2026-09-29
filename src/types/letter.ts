export type LetterType =
  | 'LOVE'
  | 'APOLOGY'
  | 'BIRTHDAY'
  | 'THANK YOU'
  | 'I MISS YOU'
  | 'FRIENDSHIP'
  | 'CONFESSION'
  | 'CONGRATULATIONS'
  | 'ENCOURAGEMENT'
  | 'JUST BECAUSE'
  | 'CUSTOM';

export type TemplateCategory =
  | 'CLASSIC'
  | 'ROMANTIC'
  | 'PERSONAL'
  | 'CELEBRATION'
  | 'MINIMAL';

export interface LetterTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  paperBg: string;
  paperColor: string;
  textColor: string;
  fontFamily: 'serif' | 'display' | 'editorial' | 'typewriter' | 'sans';
  accentBorder?: string;
  sealColor: string;
  sealEmblem: string;
  envelopeBg: string;
  envelopeFlapBg: string;
  tagline: string;
}

export interface LetterAttachment {
  id: string;
  type: 'photo';
  url: string;
  caption?: string;
  date?: string;
}

export interface Letter {
  id: string;
  trackingCode: string;
  type: LetterType;
  templateId: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  letterDate: string;
  greeting: string;
  content: string;
  signoff: string;
  attachments: LetterAttachment[];
  verificationMethod: 'otp' | 'passphrase' | 'open';
  passphrase?: string;
  postedAt: string;
  scheduledDeliveryAt: string;
  waitingHours: number;
  status: 'DRAFT' | 'SCHEDULED' | 'IN TRANSIT' | 'DELIVERED' | 'OPENED' | 'COMPLETED';
  openedAt?: string;
  postmarkCity?: string;
}
