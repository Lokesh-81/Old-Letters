export type LetterCategory =
  | 'ROMANTIC'
  | 'PERSONAL'
  | 'EMOTIONAL'
  | 'CELEBRATION'
  | 'SPECIAL';

export type LetterType =
  // ROMANTIC
  | 'LOVE'
  | 'CONFESSION'
  | 'I MISS YOU'
  | 'ANNIVERSARY'
  | 'FIRST LOVE'
  // PERSONAL
  | 'JUST BECAUSE'
  | 'FRIENDSHIP'
  | 'THINKING OF YOU'
  | 'LONG DISTANCE'
  | 'MEMORIES'
  // EMOTIONAL
  | 'APOLOGY'
  | 'THANK YOU'
  | "I'M PROUD OF YOU"
  | 'ENCOURAGEMENT'
  | 'GOODBYE'
  // CELEBRATION
  | 'BIRTHDAY'
  | 'CONGRATULATIONS'
  | 'NEW BEGINNING'
  | 'ACHIEVEMENT'
  // SPECIAL
  | 'OPEN WHEN'
  | 'TIME CAPSULE'
  | 'FUTURE LETTER'
  | 'SECRET LETTER'
  | 'CUSTOM';

export type TemplateCategory =
  | 'ROMANTIC'
  | 'PERSONAL'
  | 'EMOTIONAL'
  | 'CELEBRATION'
  | 'SPECIAL'
  | 'CLASSIC'
  | 'VINTAGE'
  | 'ARCHIVAL';

export interface LetterTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  suitableCategories?: LetterCategory[];
  description: string;
  tagline: string;
  // Contrast-safe theme tokens
  paperBackground: string;
  paperForeground: string;
  paperMuted: string;
  paperAccent: string;
  paperBorder: string;
  // Legacy & convenience accessors
  paperColor: string;
  paperBg: string;
  inkColor: string;
  textColor: string;
  fontFamily: 'serif' | 'display' | 'editorial' | 'typewriter' | 'handwriting' | 'sans';
  borderStyle:
    | 'antique-double'
    | 'midnight-gold'
    | 'antique-vellum'
    | 'blush-rose'
    | 'crimson-filigree'
    | 'apology-minimal'
    | 'thankyou-foliage'
    | 'birthday-garland'
    | 'congratulations-laurel'
    | 'encouragement-botanical'
    | 'goodbye-deckled'
    | 'capsule-docket'
    | 'future-celestial'
    | 'secret-cipher'
    | 'custom-bespoke'
    | 'airmail-chevron'
    | 'typewriter-rule'
    | 'notebook-margin'
    | 'postcard-split'
    | 'photo-corners'
    | 'vellum-layered'
    | 'herbarium-grid'
    | string;
  borderColor?: string;
  backgroundTexture:
    | 'rag-paper'
    | 'linen'
    | 'aged-parchment'
    | 'blush-vellum'
    | 'night-sky'
    | 'ruled-blue'
    | 'vellum-frost'
    | 'kraft'
    | 'cotton-wove'
    | 'deckle-cream'
    | string;
  paperWeight?: string;
  textureDescription?: string;
  reverseSideDetails?: {
    title: string;
    description: string;
    markings?: string;
  };
  decorations: {
    cornerFlourish?: boolean;
    headerMark?: string;
    watermark?: string;
    liningDetail?: string;
    stampType?: string;
    botanicalAccent?: string;
  };
  envelopeStyle: {
    bgColor: string;
    flapColor: string;
    liningPattern?: string;
    borderAccent?: string;
  };
  waxSealStyle: {
    color: string;
    emblem: string;
    name: string;
  };
  sealColor?: string;
  sealEmblem?: string;
  accentBorder?: string;
  envelopeBg?: string;
  envelopeFlapBg?: string;
  postalMarks: {
    postmarkText?: string;
    cachetCity?: string;
    airMailBadge?: boolean;
    docketNumber?: string;
    stampName?: string;
    stampIllustration?: string;
    cancellationDate?: string;
  };
  sampleSalutation: string;
  sampleBody: string;
  sampleSignoff: string;
  sampleRecipient: string;
  sampleSender: string;
  sampleCity: string;
  sampleDate: string;
}

export interface LetterAttachment {
  id: string;
  type: 'photo';
  url: string;
  caption?: string;
  date?: string;
}

export interface RecipientMetadata {
  trackingCode: string;
  senderName: string;
  recipientName: string;
  recipientEmailMasked: string;
  verificationMethod: 'otp' | 'passphrase' | 'open';
  status: 'DRAFT' | 'SCHEDULED' | 'IN TRANSIT' | 'DELIVERED' | 'OPENED' | 'COMPLETED' | 'CANCELLED' | 'NOT_FOUND';
  isDelivered: boolean;
  isArrived: boolean;
  canUnseal: boolean;
  deliveryDate: string;
  scheduledDeliveryAt: string;
  waitingHours: number;
  remainingMs: number;
  remainingSeconds: number;
  remainingHours: number;
  templateId?: string;
  postmarkCity?: string;
}

export interface Letter {
  id: string;
  trackingCode: string;
  deliveryToken?: string;
  type: LetterType;
  templateId: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  recipientEmailMasked?: string;
  letterDate: string;
  greeting: string;
  content: string;
  signoff: string;
  attachments: LetterAttachment[];
  verificationMethod: 'otp' | 'passphrase' | 'open';
  passphrase?: string;
  postedAt: string;
  scheduledDeliveryAt: string;
  deliveredAt?: string;
  createdAt?: string;
  waitingHours: number;
  selectedTempoId?: '48h' | '7d' | '30d' | 'custom' | string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN TRANSIT' | 'DELIVERED' | 'OPENED' | 'COMPLETED' | 'CANCELLED';
  openedAt?: string;
  postmarkCity?: string;
  paymentStatus?: string;
  amountPaid?: number;
  currency?: string;
  upiReference?: string;
  timeline?: any[];
}
