export type ViewState =
  | 'LANDING'
  | 'CATEGORIES'
  | 'STATIONERY'
  | 'WRITE'
  | 'DELIVERY'
  | 'RECEIPT'
  | 'RECIPIENT'
  | 'MEETING'
  | 'ARCHIVE'
  | 'HOW_IT_WORKS';

export interface LetterCategory {
  id: string;
  name: string;
  tagline: string;
  prompt: string;
  iconName: string;
  postalCode: string;
}

export type TemplateCollection =
  | 'CLASSIC CORRESPONDENCE'
  | 'ROMANTIC'
  | 'PERSONAL'
  | 'CELEBRATION';

export interface StationeryTemplate {
  id: string;
  name: string;
  collection: TemplateCollection;
  description: string;
  paperBg: string; // Tailwind background or hex
  paperTextureClass: string;
  inkColor: string;
  fontFamily: 'serif' | 'script' | 'mono';
  borderStyle: 'none' | 'airmail' | 'deckle' | 'double-rule' | 'botanical' | 'typewriter-rule';
  watermarkText?: string;
  sealColor: string; // e.g. '#5A2528'
  stampStyle: 'classic' | 'botanical' | 'airmail' | 'crown';
}

export interface AttachmentPhoto {
  url: string;
  caption: string;
  date: string;
  rotation?: number;
}

export interface VoiceNoteMeta {
  duration: string;
  title: string;
  recordedDate: string;
  isIncluded: boolean;
}

export interface VideoNoteMeta {
  duration: string;
  title: string;
  isIncluded: boolean;
  previewUrl: string;
}

export interface LetterData {
  id: string;
  trackingCode: string;
  categoryId: string;
  templateId: string;
  stampId?: string;
  toName: string;
  toAddress: string;
  fromName: string;
  fromLocation: string;
  letterBody: string;
  signature: string;
  postedDate: string;
  arrivalDate: string;
  deliveryOption: 'standard' | 'week' | 'solstice' | 'year' | 'custom';
  customDate?: string;
  customTime?: string;
  status: 'DRAFT' | 'POSTED' | 'IN_TRANSIT' | 'DELIVERED' | 'OPENED';
  photoAttachment?: AttachmentPhoto;
  voiceNote?: VoiceNoteMeta;
  videoNote?: VideoNoteMeta;
  hasMeetingInvite?: boolean;
  passphraseHint?: string;
  passphraseAnswer?: string;
  recipientEmail?: string;
}

export interface ArchivedLetterSummary {
  id: string;
  trackingCode: string;
  recipient: string;
  sender: string;
  category: string;
  templateName: string;
  postedDate: string;
  arrivalDate: string;
  status: 'DRAFT' | 'POSTED' | 'IN_TRANSIT' | 'DELIVERED' | 'OPENED';
  excerpt: string;
  tab: 'sent' | 'received' | 'drafts' | 'memories';
}
