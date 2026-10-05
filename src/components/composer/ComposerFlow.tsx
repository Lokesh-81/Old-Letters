import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Letter, LetterAttachment, LetterType, LetterCategory } from '../../types/letter';
import { LETTER_TYPES, LETTER_CATEGORIES, TEMPLATES } from '../../data/mockData';
import { PaperSheet } from '../common/PaperSheet';
import { EnvelopeObject } from '../common/EnvelopeObject';
import { StationeryGallery } from './StationeryGallery';
import { PostingCeremony } from './PostingCeremony';
import { postLetter, submitUpiPayment, fetchPaymentConfig } from '../../lib/api';
import { PaymentRecord } from '../../types/backend';
import { RecordingStudio } from './RecordingStudio';

interface ComposerFlowProps {
  initialType?: LetterType;
  initialStep?: ComposerStep;
  onLetterPosted: (letter: Letter) => void;
  onPreviewRecipient: (letter: Letter) => void;
  onViewArchive: () => void;
  onCancel: () => void;
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    role?: string;
  } | null;
  onRequestAuth?: (action: 'post' | 'write') => void;
}

export type ComposerStep = 'compose' | 'stationery' | 'dispatch' | 'delivery' | 'personal-message' | 'review';

const POSTAL_TEMPOS = [
  {
    id: '48h',
    hours: 48,
    tempo: '48 HOURS',
    title: 'STANDARD POST',
    transitPhrase: '48 hours in transit',
    description: 'The classic passage of patient correspondence',
  },
  {
    id: '7d',
    hours: 168,
    tempo: '7 DAYS',
    title: 'REFLECTIVE POST',
    transitPhrase: '7 days in transit',
    description: 'A quiet week for words to deepen and settle',
  },
  {
    id: '30d',
    hours: 720,
    tempo: '30 DAYS',
    title: 'MEMORIAL POST',
    transitPhrase: '30 days of waiting',
    description: 'A full month of intentional distance',
  },
  {
    id: 'custom',
    hours: -1,
    tempo: 'CUSTOM',
    title: 'CHOOSE YOUR DATE',
    transitPhrase: 'Appointed calendar date',
    description: 'Select an appointed future date (minimum 48 hours)',
  },
] as const;

export const ComposerFlow: React.FC<ComposerFlowProps> = ({
  initialType = 'LOVE',
  initialStep = 'compose',
  onLetterPosted,
  onPreviewRecipient,
  onViewArchive,
  onCancel,
  currentUser,
  onRequestAuth,
}) => {
  const [activeStep, setActiveStep] = useState<ComposerStep>(initialStep);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPosting, setIsPosting] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [generatedDeliveryToken, setGeneratedDeliveryToken] = useState<string | undefined>(undefined);
  const [mobileView, setMobileView] = useState<'desk' | 'paper'>('desk');
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'typing'>('saved');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [selectedTempoId, setSelectedTempoId] = useState<'48h' | '7d' | '30d' | 'custom'>('48h');
  const [customDateInput, setCustomDateInput] = useState('');
  const [activeLetterCategory, setActiveLetterCategory] = useState<LetterCategory>('ROMANTIC');

  // Personal Voice/Video Message & UPI payment state
  const [personalMessageChoice, setPersonalMessageChoice] = useState<'LETTER_ONLY' | 'VOICE' | 'VIDEO'>('LETTER_ONLY');
  const [upiReferenceInput, setUpiReferenceInput] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSubmitError, setPaymentSubmitError] = useState<string | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState<PaymentRecord | null>(null);
  const [isRecordingStudioOpen, setIsRecordingStudioOpen] = useState(false);
  const [personalMessageEnclosure, setPersonalMessageEnclosure] = useState<{
    type: 'LETTER_ONLY' | 'VOICE' | 'VIDEO';
    price: number;
    paymentId?: string;
    mediaStorageKey?: string;
    durationSeconds?: number;
    previewUrl?: string;
    mediaStatus?: string;
  } | null>(null);
  const [paymentConfig, setPaymentConfig] = useState({
    upiId: 'oldletters@okhdfcbank',
    upiDisplayName: 'OLD-LETTERS CORRESPONDENCE',
    paymentQrUrl: '',
  });
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    fetchPaymentConfig().then(setPaymentConfig).catch(() => {});
  }, []);

  const handleSubmitUpiPayment = async () => {
    const cleanUpi = upiReferenceInput.trim();
    if (!cleanUpi || cleanUpi.length < 6) {
      setPaymentSubmitError('A valid UPI reference / UTR number (at least 6 alphanumeric characters) is required.');
      return;
    }

    if (!currentUser) {
      if (onRequestAuth) {
        onRequestAuth('post');
      }
      setPaymentSubmitError('Please sign in or create an account to record personal enclosures.');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      setPaymentSubmitError(null);

      const price = personalMessageChoice === 'VIDEO' ? 149 : 99;
      const res = await submitUpiPayment({
        letterId: draft.id,
        recipientEmail: draft.recipientEmail,
        recipientName: draft.recipientName,
        senderName: currentUser.fullName || draft.senderName,
        featureCode: personalMessageChoice === 'VIDEO' ? 'VIDEO_NOTE' : 'VOICE_NOTE',
        featureType: personalMessageChoice === 'VIDEO' ? 'VIDEO_MESSAGE' : 'VOICE_MESSAGE',
        mediaType: personalMessageChoice === 'VIDEO' ? 'VIDEO' : 'VOICE',
        amount: price,
        currency: 'INR',
        upiReference: cleanUpi,
      });

      const p = res.payment;
      if (!p.paymentId && res.paymentId) {
        p.paymentId = res.paymentId;
      }
      setConfirmedPayment(p);
      // Immediately launch recording studio
      setIsRecordingStudioOpen(true);
    } catch (err: any) {
      setPaymentSubmitError(err.message || 'Failed to submit UPI payment reference.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // 3D Desk interactive tilt state
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const deskRef = useRef<HTMLDivElement>(null);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Minimum allowed 48 hours delivery constraint
  const minDeliveryMs = Date.now() + 48 * 3600 * 1000;
  const defaultDeliveryAt = new Date(minDeliveryMs).toISOString();

  // Working letter state with natural defaults & localStorage draft recovery
  const [draft, setDraft] = useState<Letter>(() => {
    try {
      const saved = localStorage.getItem('old_letters_working_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (currentUser) {
          parsed.senderName = currentUser.fullName || parsed.senderName;
          parsed.senderEmail = currentUser.email || parsed.senderEmail;
        }
        return parsed;
      }
    } catch {
      // Safe fallback
    }

    const defaultSender = currentUser?.fullName || 'Correspondent';
    const defaultEmail = currentUser?.email || 'correspondent@oldletters.in';

    return {
      id: `ol-${Date.now()}`,
      trackingCode: `OL-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      type: initialType,
      templateId: 'ivory',
      senderName: defaultSender,
      senderEmail: defaultEmail,
      recipientName: 'Vasantha',
      recipientEmail: 'vasantha@correspondence.in',
      letterDate: todayFormatted,
      greeting: 'Dear Vasantha,',
      content: `I am writing this on the balcony as the evening cools down over the city.

I wanted to tell you something I rarely say properly: how much I value your presence in my life. In a world where everyone is perpetually rushing to the next appointment, your calm presence is a gift.

I chose the 48-hour post because some words deserve to be waited for. Take your time with this.`,
      signoff: 'Yours in correspondence,',
      attachments: [],
      verificationMethod: 'open',
      postedAt: new Date().toISOString(),
      scheduledDeliveryAt: defaultDeliveryAt,
      waitingHours: 48,
      status: 'IN TRANSIT',
      postmarkCity: 'Hyderabad Bureau',
    };
  });

  // Sync draft sender info with currentUser if session is established
  useEffect(() => {
    if (currentUser) {
      setDraft((prev) => ({
        ...prev,
        senderName: currentUser.fullName || prev.senderName,
        senderEmail: currentUser.email || prev.senderEmail,
      }));
    }
  }, [currentUser]);

  // Persist working draft to localStorage so words are never lost
  useEffect(() => {
    setSaveIndicator('typing');
    try {
      localStorage.setItem('old_letters_working_draft', JSON.stringify(draft));
    } catch {}
    const timer = setTimeout(() => {
      setSaveIndicator('saved');
    }, 500);
    return () => clearTimeout(timer);
  }, [draft.content, draft.greeting, draft.signoff, draft.senderName, draft.recipientName, draft.scheduledDeliveryAt, draft.templateId, draft.type]);

  const updateDraft = (updates: Partial<Letter>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const activeTemplate =
    TEMPLATES.find((t) => t.id === draft.templateId) || TEMPLATES[0];

  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 160));

  // Navigate between steps with directional animation
  const goToStep = (step: ComposerStep) => {
    const order: ComposerStep[] = ['compose', 'stationery', 'dispatch', 'delivery', 'personal-message', 'review'];
    const curIdx = order.indexOf(activeStep);
    const targetIdx = order.indexOf(step);
    setDirection(targetIdx >= curIdx ? 1 : -1);
    setActiveStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 3D Mouse Move subtle tilt on physical desk
  const handleDeskMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!deskRef.current) return;
    const rect = deskRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateY = (x / rect.width) * 4;
    const rotateX = -(y / rect.height) * 4;
    setTilt({ rotateX, rotateY });
  };

  const handleDeskMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  // Photo upload enclosure
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) {
          const newAtt: LetterAttachment = {
            id: `photo-${Date.now()}`,
            type: 'photo',
            url,
            caption: photoCaption || 'Enclosed memory',
            date: draft.letterDate,
          };
          updateDraft({ attachments: [...draft.attachments, newAtt] });
          setShowPhotoModal(false);
          setPhotoCaption('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Postal tempo selection (Strictly 48h minimum)
  const handleSelectPostalTempo = (tempoId: '48h' | '7d' | '30d' | 'custom') => {
    setSelectedTempoId(tempoId);
    const now = Date.now();

    if (tempoId === '48h') {
      updateDraft({
        waitingHours: 48,
        scheduledDeliveryAt: new Date(now + 48 * 3600 * 1000).toISOString(),
      });
    } else if (tempoId === '7d') {
      updateDraft({
        waitingHours: 168,
        scheduledDeliveryAt: new Date(now + 168 * 3600 * 1000).toISOString(),
      });
    } else if (tempoId === '30d') {
      updateDraft({
        waitingHours: 720,
        scheduledDeliveryAt: new Date(now + 720 * 3600 * 1000).toISOString(),
      });
    }
  };

  // Custom date selection (Minimum 48 hours validation)
  const handleCustomDateChange = (val: string) => {
    setCustomDateInput(val);
    if (!val) return;
    const chosen = new Date(val).getTime();
    if (isNaN(chosen)) return;

    const diffHours = Math.max(48, Math.round((chosen - Date.now()) / (3600 * 1000)));
    const finalDate = new Date(Math.max(chosen, Date.now() + 48 * 3600 * 1000)).toISOString();

    updateDraft({
      waitingHours: diffHours,
      scheduledDeliveryAt: finalDate,
    });
  };

  // Formatting exact arrival date
  const arrivalDateObj = new Date(draft.scheduledDeliveryAt);
  const formattedArrivalDate = isNaN(arrivalDateObj.getTime())
    ? 'October 1, 2026'
    : arrivalDateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  // Human-readable, restrained transit language
  const getRestrainedTransitCopy = () => {
    if (selectedTempoId === '48h') return '48 hours in transit';
    if (selectedTempoId === '7d') return '7 days in transit';
    if (selectedTempoId === '30d') return '30 days of waiting';
    const days = Math.round(draft.waitingHours / 24);
    return `${days} days in transit`;
  };

  // Seal & Post execution with safe backend response handling
  const handleExecutePost = async () => {
    // IMPORTANT PRODUCT RULE: Must be authenticated to post a letter
    if (!currentUser) {
      try {
        localStorage.setItem('old_letters_working_draft', JSON.stringify(draft));
      } catch {}
      if (onRequestAuth) {
        onRequestAuth('post');
      }
      return;
    }

    try {
      setIsSubmittingPost(true);
      setPostError(null);

      const senderName = currentUser.fullName || draft.senderName || 'Correspondent';
      const senderEmail = currentUser.email || draft.senderEmail || 'correspondent@oldletters.in';

      const result = await postLetter({
        type: draft.type,
        templateId: draft.templateId,
        senderName,
        senderEmail,
        recipientName: draft.recipientName || 'Vasantha',
        recipientEmail: draft.recipientEmail || 'vasantha@correspondence.in',
        greeting: draft.greeting,
        content: draft.content,
        signoff: draft.signoff,
        verificationMethod: draft.verificationMethod,
        passphrase: draft.passphrase,
        scheduledDeliveryAt: draft.scheduledDeliveryAt,
        waitingHours: draft.waitingHours,
        postmarkCity: draft.postmarkCity || 'Hyderabad Bureau',
        status: 'SCHEDULED',
        paymentId: personalMessageEnclosure?.paymentId,
        hasMediaAttachment: Boolean(personalMessageEnclosure?.mediaStorageKey),
        mediaType: personalMessageEnclosure?.type === 'VIDEO' ? 'VIDEO' : personalMessageEnclosure?.type === 'VOICE' ? 'VOICE' : undefined,
        mediaStorageKey: personalMessageEnclosure?.mediaStorageKey,
        mediaStatus: personalMessageEnclosure?.mediaStatus || (personalMessageEnclosure?.mediaStorageKey ? 'PENDING' : undefined),
        personalMessage: personalMessageEnclosure || undefined,
      } as any);

      const finalized: Letter = {
        ...draft,
        id: result.letter.id,
        trackingCode: result.trackingCode,
        senderName,
        senderEmail,
        status: 'SCHEDULED',
        postedAt: new Date().toISOString(),
        paymentStatus: personalMessageEnclosure?.paymentId ? 'PENDING' : undefined,
      };

      try {
        localStorage.removeItem('old_letters_working_draft');
      } catch {}

      setGeneratedDeliveryToken(result.deliveryToken);
      onLetterPosted(finalized);
      setIsPosting(true);
    } catch (err: any) {
      const msg = err.message || 'Failed to seal and post letter.';
      setPostError(msg);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  if (isPosting) {
    return (
      <PostingCeremony
        letter={draft}
        deliveryToken={generatedDeliveryToken}
        onPreviewRecipient={onPreviewRecipient}
        onViewArchive={onViewArchive}
        onWriteAnother={() => {
          setIsPosting(false);
          goToStep('compose');
        }}
      />
    );
  }

  // Framer Motion slide variants
  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 32 : -32,
      opacity: 0,
      rotateY: dir > 0 ? 1.5 : -1.5,
    }),
    center: {
      x: 0,
      opacity: 1,
      rotateY: 0,
      transition: {
        duration: 0.36,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -32 : 32,
      opacity: 0,
      rotateY: dir > 0 ? -1.5 : 1.5,
      transition: {
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full bg-[#faf9f7] text-teal-900 select-none">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#eae4da] pb-4 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-stone-500">
            WRITING DESK
          </span>
          <span className="text-stone-300">/</span>
          <span
            className="text-lg text-teal-900 font-medium"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            {draft.type} Letter for {draft.recipientName || 'Recipient'}
          </span>
        </div>

        {/* Studio Status & Autosave */}
        <div className="flex items-center gap-6 text-[11px] font-mono text-stone-500">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                saveIndicator === 'saved' ? 'bg-teal-700' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span>{saveIndicator === 'saved' ? 'Inscribed' : 'Inscribing...'}</span>
          </div>
          <span>·</span>
          <span>{wordCount} words</span>
          <span>·</span>
          <span>~{readingTime} min</span>

          <button
            type="button"
            onClick={onCancel}
            className="text-stone-500 hover:text-teal-900 transition-colors cursor-pointer ml-2"
          >
            Cancel Draft
          </button>
        </div>
      </div>

      {/* Mobile Switcher */}
      <div className="lg:hidden flex mb-6 p-1 bg-[#ede7dc] border border-[#ded5c6] rounded-xs">
        <button
          type="button"
          onClick={() => setMobileView('desk')}
          className={`flex-1 py-2 text-xs font-sans font-medium rounded-xs transition-colors cursor-pointer ${
            mobileView === 'desk' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
          }`}
        >
          Writing Controls
        </button>
        <button
          type="button"
          onClick={() => setMobileView('paper')}
          className={`flex-1 py-2 text-xs font-sans font-medium rounded-xs transition-colors cursor-pointer ${
            mobileView === 'paper' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
          }`}
        >
          Inspect Parchment
        </button>
      </div>

      {/* Main Studio Desk Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN: Physical Paper Desk Surface (Warm Ivory, Floating Paper, Layered Envelope) */}
        <div
          className={`lg:col-span-6 lg:block ${
            mobileView === 'paper' ? 'block' : 'hidden'
          } lg:sticky lg:top-24 perspective-1200`}
        >
          <div
            ref={deskRef}
            onMouseMove={handleDeskMouseMove}
            onMouseLeave={handleDeskMouseLeave}
            className="relative p-6 sm:p-8 bg-[#f5f1e8] border border-[#e3dacf] rounded-xs shadow-[0_12px_36px_rgba(45,30,15,0.06),0_1px_3px_rgba(45,30,15,0.04)] overflow-hidden transition-transform duration-200 ease-out"
            style={{
              transform: `perspective(1200px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
            }}
          >
            {/* Subtle Wooden Desk Texture */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, #110 0px, #110 1px, transparent 1px, transparent 16px)',
              }}
            />

            {/* Subtle Postal Desk Watermark */}
            <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 border-b border-[#e5dcd1] pb-3 mb-6">
              <span>PHYSICAL WRITING SURFACE</span>
              <span className="font-semibold text-stone-700 tracking-wider">
                {activeTemplate.name.toUpperCase()} · HYDERABAD BUREAU
              </span>
            </div>

            {/* PHYSICAL PAPER STACK (Layered Stationery & Partially Visible Envelope) */}
            <div className="relative flex justify-center py-2">
              {/* Layer 1: Partially Visible Kraft Envelope tucked behind sheet */}
              <div
                className="absolute -top-4 right-2 sm:right-6 w-56 h-36 opacity-70 pointer-events-none transition-transform duration-500"
                style={{
                  transform: 'rotate(4deg) translateZ(-20px)',
                }}
              >
                <EnvelopeObject
                  recipientName={draft.recipientName}
                  senderName={draft.senderName}
                  date={draft.letterDate}
                  sealColor={activeTemplate.waxSealStyle?.color || (activeTemplate as any).sealColor}
                  sealEmblem={activeTemplate.waxSealStyle?.emblem || (activeTemplate as any).sealEmblem}
                  isSealed={true}
                  size="sm"
                />
              </div>

              {/* Layer 2: Stationery sheet underneath with slight offset */}
              <div
                className="absolute inset-0 max-w-2xl mx-auto bg-[#f1ece2] border border-[#dfd6c7] rounded-sm pointer-events-none"
                style={{
                  transform: 'rotate(-1.5deg) translate(-6px, 8px) translateZ(-10px)',
                  boxShadow: '0 4px 12px rgba(45,30,15,0.05)',
                }}
              />

              {/* Layer 3: Main Active Floating Parchment Sheet */}
              <div
                className="relative w-full z-10"
                style={{
                  transform: 'translateZ(10px)',
                }}
              >
                <PaperSheet
                  template={activeTemplate}
                  date={draft.letterDate}
                  greeting={draft.greeting}
                  content={draft.content}
                  signoff={draft.signoff}
                  senderName={draft.senderName}
                  recipientName={draft.recipientName}
                  attachments={draft.attachments}
                  isEditing={false}
                />
              </div>
            </div>

            {/* Desk Bottom Details */}
            <div className="pt-4 border-t border-[#e5dcd1] mt-6 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>TACTILE PARCHMENT ELEVATION</span>
              <span>RESTFUL EDITORIAL INK</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Writing Controls with Physical Sheet Transitions */}
        <div
          className={`lg:col-span-6 space-y-6 ${
            mobileView === 'desk' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Studio Steps Navigation Tabs */}
          <div className="flex items-center border-b border-[#eae4da] gap-4 sm:gap-6 text-xs font-mono uppercase tracking-wider overflow-x-auto pb-1">
            {[
              { id: 'compose', label: '1. Writing' },
              { id: 'stationery', label: '2. Stationery' },
              { id: 'dispatch', label: '3. Recipient' },
              { id: 'delivery', label: '4. Delivery' },
              { id: 'review', label: '5. Review' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => goToStep(tab.id as ComposerStep)}
                className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeStep === tab.id
                    ? 'border-teal-900 text-teal-900 font-semibold'
                    : 'border-transparent text-stone-400 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* PHYSICAL ANIMATED SHEET CONTAINER (Framer Motion) */}
          <AnimatePresence mode="wait" custom={direction}>
            {/* STEP 1: COMPOSITION */}
            {activeStep === 'compose' && (
              <motion.div
                key="step-compose"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {/* Occasion / Letter Type Selector Bar */}
                <div className="bg-[#f9f7f4] border border-[#eae4da] p-3.5 rounded-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-stone-500">
                      OCCASION & INTENTION · {draft.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep('stationery')}
                      className="text-[11px] font-sans text-teal-900 font-medium hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Paper: {activeTemplate.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-stone-300"
                        style={{ backgroundColor: activeTemplate.paperColor }}
                      />
                      <span>→</span>
                    </button>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {LETTER_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveLetterCategory(cat.id);
                          const firstType = cat.types[0];
                          updateDraft({ type: firstType });
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-sans whitespace-nowrap transition-colors cursor-pointer ${
                          activeLetterCategory === cat.id
                            ? 'bg-teal-900 text-white font-medium'
                            : 'bg-white border border-[#eae4da] text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Specific Intentions within selected Category */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {LETTER_TYPES.filter((lt) => lt.category === activeLetterCategory).map((lt) => {
                      const isSelected = draft.type === lt.type;
                      return (
                        <button
                          key={lt.type}
                          type="button"
                          onClick={() => {
                            updateDraft({ type: lt.type });
                          }}
                          className={`px-2.5 py-1 text-xs rounded-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-white border border-teal-900 font-medium text-teal-950 shadow-2xs'
                              : 'bg-white/80 border border-stone-200 text-stone-600 hover:bg-white'
                          }`}
                        >
                          {lt.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                    Salutation Greeting
                  </label>
                  <input
                    type="text"
                    value={draft.greeting}
                    onChange={(e) => updateDraft({ greeting: e.target.value })}
                    placeholder="Dear Vasantha,"
                    className="w-full bg-white border border-[#eae4da] focus:border-teal-900 px-4 py-3 text-teal-950 font-serif text-xl focus:outline-none rounded-xs transition-colors shadow-2xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                    Letter Body Content
                  </label>
                  <textarea
                    value={draft.content}
                    onChange={(e) => updateDraft({ content: e.target.value })}
                    placeholder="Write your letter without haste. Some things are worth taking the time to say..."
                    rows={12}
                    className="w-full bg-white border border-[#eae4da] focus:border-teal-900 p-5 text-stone-900 font-serif text-lg leading-relaxed focus:outline-none rounded-xs resize-y transition-colors shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                      Signoff
                    </label>
                    <input
                      type="text"
                      value={draft.signoff}
                      onChange={(e) => updateDraft({ signoff: e.target.value })}
                      placeholder="Yours in correspondence,"
                      className="w-full bg-white border border-[#eae4da] focus:border-teal-900 px-4 py-2.5 text-stone-900 font-serif text-base focus:outline-none rounded-xs shadow-2xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={draft.senderName}
                      onChange={(e) => updateDraft({ senderName: e.target.value })}
                      placeholder="Lokesh"
                      className="w-full bg-white border border-[#eae4da] focus:border-teal-900 px-4 py-2.5 text-stone-900 font-serif text-base focus:outline-none rounded-xs shadow-2xs"
                    />
                  </div>
                </div>

                {/* Enclosures Toolbar */}
                <div className="pt-2 border-t border-[#eae4da] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-xs font-sans text-stone-700 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>🖼</span>
                      <span>Enclose Photograph ({draft.attachments.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPersonalMessageChoice('VOICE');
                        goToStep('personal-message');
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-xs font-sans text-stone-700 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>🎙</span>
                      <span>Voice Note (₹99)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPersonalMessageChoice('VIDEO');
                        goToStep('personal-message');
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-xs font-sans text-stone-700 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>🎞</span>
                      <span>Video Note (₹149)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => goToStep('stationery')}
                    className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                  >
                    Stationery →
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: STATIONERY TEMPLATES GALLERY */}
            {activeStep === 'stationery' && (
              <motion.div
                key="step-stationery"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <StationeryGallery
                  selectedTemplateId={draft.templateId}
                  onSelectTemplate={(tpl) => updateDraft({ templateId: tpl.id })}
                  onConfirmStationery={(tpl) => {
                    updateDraft({ templateId: tpl.id });
                    goToStep('dispatch');
                  }}
                  onBackToCompose={() => goToStep('compose')}
                />
              </motion.div>
            )}

            {/* STEP 3: DISPATCH & RECIPIENT */}
            {activeStep === 'dispatch' && (
              <motion.div
                key="step-dispatch"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-1.5">
                      Recipient Full Name
                    </label>
                    <input
                      type="text"
                      value={draft.recipientName}
                      onChange={(e) => updateDraft({ recipientName: e.target.value })}
                      placeholder="e.g. Vasantha"
                      className="w-full bg-white border border-[#eae4da] focus:border-teal-900 px-4 py-3 text-stone-900 font-serif text-lg focus:outline-none rounded-xs shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-1.5">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      value={draft.recipientEmail}
                      onChange={(e) => updateDraft({ recipientEmail: e.target.value })}
                      placeholder="vasantha@correspondence.in"
                      className="w-full bg-white border border-[#eae4da] focus:border-teal-900 px-4 py-3 text-stone-900 text-sm focus:outline-none rounded-xs shadow-2xs"
                    />
                  </div>
                </div>

                {/* Arrival Protection Options */}
                <div className="pt-4 border-t border-[#eae4da] space-y-3">
                  <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                    Arrival Security Verification
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => updateDraft({ verificationMethod: 'open' })}
                      className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
                        draft.verificationMethod === 'open'
                          ? 'bg-white border-[#141618] text-stone-900 font-medium shadow-xs'
                          : 'bg-[#faf8f5] border-[#eae4da] text-stone-600'
                      }`}
                    >
                      <div className="font-serif text-sm">Direct Unseal</div>
                      <div className="text-[10px] text-stone-500">Immediate upon arrival</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateDraft({ verificationMethod: 'otp' })}
                      className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
                        draft.verificationMethod === 'otp'
                          ? 'bg-white border-[#141618] text-stone-900 font-medium shadow-xs'
                          : 'bg-[#faf8f5] border-[#eae4da] text-stone-600'
                      }`}
                    >
                      <div className="font-serif text-sm">Email OTP</div>
                      <div className="text-[10px] text-stone-500">6-digit verification code</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateDraft({ verificationMethod: 'passphrase' })}
                      className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
                        draft.verificationMethod === 'passphrase'
                          ? 'bg-white border-[#141618] text-stone-900 font-medium shadow-xs'
                          : 'bg-[#faf8f5] border-[#eae4da] text-stone-600'
                      }`}
                    >
                      <div className="font-serif text-sm">Secret Cipher</div>
                      <div className="text-[10px] text-stone-500">Private secret phrase</div>
                    </button>
                  </div>

                  {draft.verificationMethod === 'otp' && (
                    <div className="p-3 bg-[#faf9f7] border border-[#eae4da] rounded-xs text-xs font-mono text-stone-600">
                      Upon arrival, a 6-digit cryptographic verification code will be sent to {draft.recipientEmail || 'recipient'}.
                    </div>
                  )}

                  {draft.verificationMethod === 'passphrase' && (
                    <div className="pt-2">
                      <input
                        type="text"
                        value={draft.passphrase || ''}
                        onChange={(e) => updateDraft({ passphrase: e.target.value })}
                        placeholder="Enter secret cipher passphrase..."
                        className="w-full bg-white border border-[#eae4da] px-4 py-2.5 text-stone-900 text-sm focus:outline-none shadow-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#eae4da] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goToStep('stationery')}
                    className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                  >
                    ← Back to Stationery
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep('delivery')}
                    className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium uppercase tracking-wider rounded-xs cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                  >
                    Delivery Passage →
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: DELIVERY PASSAGE (Postal Choices, No Pricing Cards, Minimum 48 Hours) */}
            {activeStep === 'delivery' && (
              <motion.div
                key="step-delivery"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {/* Physical Dispatch Manifest Card */}
                <div className="p-6 bg-white border border-[#eae4da] shadow-[0_4px_16px_rgba(0,0,0,0.03)] rounded-xs space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span>DISPATCH MANIFEST</span>
                    <span>POSTAL TRANSIT TIMING</span>
                  </div>

                  <div className="grid grid-cols-2 gap-6 border-b border-stone-100 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-stone-400 uppercase block">
                        Posted Today
                      </span>
                      <span className="font-serif text-xl text-stone-800">{draft.letterDate}</span>
                      <span className="text-[10px] font-mono text-stone-500 block">Immediate wax seal</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-stone-400 uppercase block">
                        Appointed Arrival
                      </span>
                      <span className="font-serif text-xl text-teal-950 font-medium">
                        {formattedArrivalDate}
                      </span>
                      <span className="text-[10px] font-mono text-teal-800 block">
                        {getRestrainedTransitCopy()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-stone-600">
                    <span>Arrives {formattedArrivalDate}</span>
                    <span className="italic font-serif">{getRestrainedTransitCopy()}</span>
                  </div>
                </div>

                {/* Postal Options (Styled as postal choices, no prices) */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                    Select Postal Transit Tempo
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {POSTAL_TEMPOS.map((item) => {
                      const isSelected = selectedTempoId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectPostalTempo(item.id)}
                          className={`p-4 text-left border rounded-xs transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-white border-[#141618] text-stone-900 shadow-sm'
                              : 'bg-[#faf8f5] border-[#eae4da] text-stone-600 hover:bg-white'
                          }`}
                        >
                          <div>
                            <div className="text-[11px] font-mono tracking-widest uppercase text-stone-500 font-semibold mb-0.5">
                              {item.tempo}
                            </div>
                            <div className="font-serif text-lg text-teal-950 font-normal">
                              {item.title}
                            </div>
                          </div>
                          <div className="text-[11px] text-stone-500 font-sans mt-2 pt-2 border-t border-stone-100">
                            {item.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Date Input (Enforces minimum 48 hours) */}
                  {selectedTempoId === 'custom' && (
                    <div className="p-4 bg-white border border-[#eae4da] rounded-xs space-y-2 animate-fade-in">
                      <label className="block text-[11px] font-mono text-stone-600 uppercase">
                        Select Appointed Future Delivery Date (Minimum 48 Hours)
                      </label>
                      <input
                        type="date"
                        min={new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0]}
                        value={customDateInput}
                        onChange={(e) => handleCustomDateChange(e.target.value)}
                        className="w-full bg-[#faf9f7] border border-stone-300 p-2.5 text-xs font-mono text-stone-900 focus:outline-none focus:border-teal-900 rounded-xs"
                      />
                      <span className="text-[10px] font-mono text-stone-400 block">
                        Letters cannot be posted for past dates or less than 48 hours of anticipation.
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#eae4da] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goToStep('dispatch')}
                    className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                  >
                    ← Back to Recipient
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep('personal-message')}
                    className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium uppercase tracking-wider rounded-xs cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                  >
                    Personal Message Options →
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: PERSONAL MESSAGE SELECTION (LETTER ONLY, VOICE NOTE, VIDEO NOTE) */}
            {activeStep === 'personal-message' && (
              <motion.div
                key="step-personal-message"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {isRecordingStudioOpen && confirmedPayment ? (
                  /* Immediate Voice or Video Recording Studio */
                  <RecordingStudio
                    mediaType={personalMessageChoice === 'VIDEO' ? 'VIDEO' : 'VOICE'}
                    paymentId={confirmedPayment.paymentId || confirmedPayment.id}
                    recipientName={draft.recipientName}
                    onComplete={(result) => {
                      setPersonalMessageEnclosure({
                        type: result.mediaType,
                        price: result.mediaType === 'VIDEO' ? 149 : 99,
                        paymentId: confirmedPayment.paymentId || confirmedPayment.id,
                        mediaStorageKey: result.storageKey,
                        durationSeconds: result.durationSeconds,
                        previewUrl: result.previewUrl,
                        mediaStatus: 'PENDING',
                      });
                      setIsRecordingStudioOpen(false);
                      goToStep('review');
                    }}
                    onCancel={() => {
                      setIsRecordingStudioOpen(false);
                    }}
                  />
                ) : (
                  <>
                    <div className="border-b border-[#eae4da] pb-3">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-stone-500">
                        STEP 05 OF 06 · PERSONAL MESSAGE OPTION
                      </span>
                      <h3 className="font-serif text-2xl text-teal-950 font-normal">
                        Select Your Personal Message Enclosure
                      </h3>
                      <p className="text-xs text-stone-500 font-serif italic">
                        Enclose an intimate audio or cinematic video recording to be delivered alongside your written letter.
                      </p>
                    </div>

                    {/* The 3 Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* OPTION A: LETTER ONLY */}
                      <div
                        onClick={() => {
                          setPersonalMessageChoice('LETTER_ONLY');
                          setPersonalMessageEnclosure({ type: 'LETTER_ONLY', price: 0 });
                        }}
                        className={`p-5 rounded-xs border transition-all cursor-pointer flex flex-col justify-between ${
                          personalMessageChoice === 'LETTER_ONLY'
                            ? 'bg-white border-teal-900 shadow-md ring-1 ring-teal-900'
                            : 'bg-[#faf8f5] border-[#eae4da] hover:bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">✉️</span>
                            <span className="font-serif text-xl text-teal-950 font-medium">₹0</span>
                          </div>
                          <h4 className="font-serif text-lg text-teal-900 font-medium mb-1">LETTER ONLY</h4>
                          <p className="text-xs text-stone-600 font-serif leading-relaxed">
                            Traditional paper correspondence with zero digital enclosures. Delivered in 48 hours.
                          </p>
                        </div>
                        <div className="pt-4 border-t border-stone-100 mt-4 text-[11px] font-mono text-stone-400">
                          NO PAYMENT · PURE EPISTOLARY
                        </div>
                      </div>

                      {/* OPTION B: VOICE MESSAGE */}
                      <div
                        onClick={() => setPersonalMessageChoice('VOICE')}
                        className={`p-5 rounded-xs border transition-all cursor-pointer flex flex-col justify-between ${
                          personalMessageChoice === 'VOICE'
                            ? 'bg-white border-teal-900 shadow-md ring-1 ring-teal-900'
                            : 'bg-[#faf8f5] border-[#eae4da] hover:bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">🎙️</span>
                            <div className="text-right">
                              <span className="font-serif text-xl text-teal-950 font-medium">₹99</span>
                              <span className="text-[10px] font-mono text-stone-400 block">INR</span>
                            </div>
                          </div>
                          <h4 className="font-serif text-lg text-teal-900 font-medium mb-1">VOICE MESSAGE</h4>
                          <p className="text-xs text-stone-600 font-serif leading-relaxed">
                            Record up to 5 minutes of personal audio. Stored securely and unsealed with the letter.
                          </p>
                        </div>
                        <div className="pt-4 border-t border-stone-100 mt-4 text-[11px] font-mono text-amber-800 font-semibold">
                          UPI PAYMENT REQUIRED (₹99)
                        </div>
                      </div>

                      {/* OPTION C: VIDEO MESSAGE */}
                      <div
                        onClick={() => setPersonalMessageChoice('VIDEO')}
                        className={`p-5 rounded-xs border transition-all cursor-pointer flex flex-col justify-between ${
                          personalMessageChoice === 'VIDEO'
                            ? 'bg-white border-teal-900 shadow-md ring-1 ring-teal-900'
                            : 'bg-[#faf8f5] border-[#eae4da] hover:bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">🎥</span>
                            <div className="text-right">
                              <span className="font-serif text-xl text-teal-950 font-medium">₹149</span>
                              <span className="text-[10px] font-mono text-stone-400 block">INR</span>
                            </div>
                          </div>
                          <h4 className="font-serif text-lg text-teal-900 font-medium mb-1">VIDEO MESSAGE</h4>
                          <p className="text-xs text-stone-600 font-serif leading-relaxed">
                            Record up to 3 minutes of personal video note. Cinematic archival enclosure upon reading.
                          </p>
                        </div>
                        <div className="pt-4 border-t border-stone-100 mt-4 text-[11px] font-mono text-amber-800 font-semibold">
                          UPI PAYMENT REQUIRED (₹149)
                        </div>
                      </div>
                    </div>

                    {/* If Voice or Video is selected, show UPI Payment Box or Confirmed State */}
                    {personalMessageChoice !== 'LETTER_ONLY' && (
                      confirmedPayment ? (
                        <div className="p-6 bg-white border border-[#eae4da] rounded-xs shadow-paper space-y-5 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
                            <div>
                              <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-800 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                UPI PAYMENT REGISTERED · STATUS: {confirmedPayment.status || 'PENDING'}
                              </span>
                              <h4 className="font-serif text-xl text-teal-950 mt-1">
                                Recording Studio Unlocked ({confirmedPayment.paymentId})
                              </h4>
                            </div>
                            <div className="text-right font-mono text-xs text-stone-500">
                              UTR: <code className="text-teal-900 font-semibold">{confirmedPayment.upiReference}</code>
                            </div>
                          </div>

                          <div className="bg-[#faf9f7] border border-[#eae4da] p-4 rounded-xs text-xs font-mono space-y-2">
                            <div className="flex justify-between">
                              <span className="text-stone-500">PAYMENT REFERENCE:</span>
                              <span className="font-semibold text-teal-900">{confirmedPayment.paymentId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-500">ENCLOSURE TYPE:</span>
                              <span className="font-semibold uppercase">{personalMessageChoice} MESSAGE (₹{personalMessageChoice === 'VIDEO' ? '149' : '99'} INR)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-500">RECORDING ATTACHMENT:</span>
                              <span className={personalMessageEnclosure?.mediaStorageKey ? 'text-emerald-700 font-semibold' : 'text-amber-800'}>
                                {personalMessageEnclosure?.mediaStorageKey ? `Attached (${personalMessageEnclosure.durationSeconds || 0}s duration)` : 'Awaiting Recording Studio'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsRecordingStudioOpen(true)}
                              className="flex-1 py-3.5 bg-teal-900 hover:bg-teal-800 text-white font-sans text-xs tracking-wider uppercase font-semibold rounded-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <span>{personalMessageEnclosure?.mediaStorageKey ? 'OPEN STUDIO TO RE-RECORD →' : 'OPEN RECORDING STUDIO →'}</span>
                            </button>
                            {personalMessageEnclosure?.mediaStorageKey && (
                              <button
                                type="button"
                                onClick={() => goToStep('review')}
                                className="px-6 py-3.5 bg-white border border-teal-900 text-teal-900 hover:bg-stone-50 text-xs font-sans tracking-wider uppercase font-semibold rounded-xs cursor-pointer shadow-xs"
                              >
                                PROCEED TO REVIEW →
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-white border border-[#eae4da] rounded-xs shadow-paper space-y-5 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
                            <div>
                              <span className="text-[10px] font-mono tracking-widest uppercase text-stone-500">
                                MANUAL UPI PAYMENT · STRICTLY PENDING UNTIL VERIFIED
                              </span>
                              <h4 className="font-serif text-xl text-teal-950">
                                Scan & Transfer ₹{personalMessageChoice === 'VIDEO' ? '149' : '99'} to Unlock Recording Studio
                              </h4>
                            </div>
                            <div className="text-right font-mono text-xs text-stone-500">
                              FEE: <strong className="text-teal-900 text-lg">₹{personalMessageChoice === 'VIDEO' ? '149' : '99'}</strong> INR
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            {/* QR and UPI ID */}
                            <div className="flex flex-col items-center justify-center p-4 bg-[#faf9f7] border border-[#eae4da] rounded-xs space-y-3 text-center">
                              <div className="w-36 h-36 bg-white border border-stone-200 p-2 rounded-xs flex items-center justify-center shadow-2xs">
                                <svg className="w-full h-full text-stone-900" viewBox="0 0 100 100" fill="currentColor">
                                  <rect x="0" y="0" width="30" height="30" />
                                  <rect x="4" y="4" width="22" height="22" fill="#fff" />
                                  <rect x="8" y="8" width="14" height="14" />
                                  <rect x="70" y="0" width="30" height="30" />
                                  <rect x="74" y="4" width="22" height="22" fill="#fff" />
                                  <rect x="78" y="8" width="14" height="14" />
                                  <rect x="0" y="70" width="30" height="30" />
                                  <rect x="4" y="74" width="22" height="22" fill="#fff" />
                                  <rect x="8" y="78" width="14" height="14" />
                                  <rect x="36" y="8" width="6" height="18" />
                                  <rect x="46" y="4" width="16" height="6" />
                                  <rect x="52" y="16" width="10" height="10" />
                                  <rect x="36" y="36" width="12" height="12" />
                                  <rect x="56" y="36" width="14" height="6" />
                                  <rect x="36" y="56" width="8" height="18" />
                                  <rect x="52" y="52" width="18" height="12" />
                                </svg>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-stone-400 uppercase block">UPI VPA</span>
                                <div className="flex items-center gap-1.5 justify-center">
                                  <code className="font-mono text-xs text-stone-800 font-semibold">{paymentConfig.upiId}</code>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(paymentConfig.upiId);
                                      setCopiedUpi(true);
                                      setTimeout(() => setCopiedUpi(false), 2000);
                                    }}
                                    className="text-[10px] font-mono text-teal-800 hover:underline cursor-pointer"
                                  >
                                    {copiedUpi ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* UTR Input Form */}
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-600 mb-1.5">
                                  UPI Transaction ID / UTR Number (12 Digits)
                                </label>
                                <input
                                  type="text"
                                  value={upiReferenceInput}
                                  onChange={(e) => {
                                    setUpiReferenceInput(e.target.value);
                                    setPaymentSubmitError(null);
                                  }}
                                  placeholder="e.g. 427189034512"
                                  className="w-full bg-[#faf9f7] border border-stone-300 focus:border-teal-900 px-4 py-3 font-mono text-sm tracking-wider text-stone-900 rounded-xs focus:outline-none shadow-2xs"
                                />
                                <span className="text-[10px] font-mono text-stone-400 block mt-1">
                                  Found in your UPI app payment receipt (Google Pay, PhonePe, Paytm, etc.)
                                </span>
                              </div>

                              {paymentSubmitError && (
                                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono rounded-xs">
                                  {paymentSubmitError}
                                </div>
                              )}

                              <button
                                type="button"
                                disabled={isSubmittingPayment || !upiReferenceInput.trim()}
                                onClick={handleSubmitUpiPayment}
                                className="w-full py-3.5 bg-teal-900 hover:bg-teal-800 disabled:bg-stone-300 text-white font-sans text-xs tracking-wider uppercase font-semibold rounded-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                {isSubmittingPayment ? (
                                  <span>CREATING PAYMENT & OPENING STUDIO...</span>
                                ) : (
                                  <span>SUBMIT PAYMENT & OPEN RECORDING STUDIO →</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {/* Step Navigation Bar */}
                    <div className="pt-4 border-t border-[#eae4da] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => goToStep('delivery')}
                        className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                      >
                        ← Back to Delivery
                      </button>

                      {personalMessageChoice === 'LETTER_ONLY' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPersonalMessageEnclosure({ type: 'LETTER_ONLY', price: 0 });
                            goToStep('review');
                          }}
                          className="px-6 py-3 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium uppercase tracking-wider rounded-xs cursor-pointer shadow-md active:scale-[0.96]"
                        >
                          Continue to Review Letter →
                        </button>
                      ) : (
                        personalMessageEnclosure?.mediaStorageKey && (
                          <button
                            type="button"
                            onClick={() => goToStep('review')}
                            className="px-6 py-3 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium uppercase tracking-wider rounded-xs cursor-pointer shadow-md active:scale-[0.96]"
                          >
                            Continue to Review Letter →
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 6: REVIEW STEP (Physical Sheet Inspection & Sealing) */}
            {activeStep === 'review' && (
              <motion.div
                key="step-review"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {/* Physical Inspection Card */}
                <div className="p-6 bg-white border border-[#eae4da] shadow-[0_4px_16px_rgba(0,0,0,0.03)] rounded-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-stone-500">
                      INSPECTION BEFORE SEALING
                    </span>
                    <span className="text-xs font-mono text-teal-900 font-semibold">
                      REF: {draft.trackingCode}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-500">ADDRESSED TO:</span>
                      <span className="text-stone-900 font-semibold">{draft.recipientName} ({draft.recipientEmail})</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-500">TRANSIT PASSAGE:</span>
                      <span className="text-stone-900">{getRestrainedTransitCopy()}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-500">APPOINTED ARRIVAL:</span>
                      <span className="text-teal-900 font-semibold">{formattedArrivalDate}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-500">SECURITY METHOD:</span>
                      <span className="text-stone-900 uppercase">
                        {draft.verificationMethod === 'otp'
                          ? 'GMAIL ONE-TIME PASSCODE'
                          : draft.verificationMethod === 'passphrase'
                          ? 'SECRET CIPHER PHRASE'
                          : 'DIRECT ARRIVAL UNSEAL'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-500">ENCLOSURES:</span>
                      <span className="text-stone-900">{draft.attachments.length} photograph(s)</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                      <span className="text-stone-500">PERSONAL ENCLOSURE:</span>
                      <span className="text-stone-900 font-semibold">
                        {personalMessageEnclosure && personalMessageEnclosure.type !== 'LETTER_ONLY'
                          ? `Personal ${personalMessageEnclosure.type === 'VIDEO' ? 'Video' : 'Voice'} Note (₹${personalMessageEnclosure.price} · Recorded · PENDING VERIFICATION)`
                          : 'Letter Only (Pure Epistolary · ₹0)'}
                      </span>
                    </div>

                    {/* Media Preview Player if user recorded voice/video */}
                    {personalMessageEnclosure && personalMessageEnclosure.previewUrl && (
                      <div className="p-3 bg-[#faf9f7] border border-stone-200 rounded-xs space-y-2">
                        <span className="text-[10px] font-mono text-stone-500 uppercase block">
                          Recorded Enclosure Preview
                        </span>
                        {personalMessageEnclosure.type === 'VIDEO' ? (
                          <video
                            src={personalMessageEnclosure.previewUrl}
                            controls
                            className="w-full max-h-48 rounded-xs object-cover"
                          />
                        ) : (
                          <audio
                            src={personalMessageEnclosure.previewUrl}
                            controls
                            className="w-full"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {postError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs font-mono">
                    {postError}
                  </div>
                )}

                {/* Final Sealing CTA */}
                <div className="pt-4 border-t border-[#eae4da] space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => goToStep('personal-message')}
                      className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                    >
                      ← Back to Personal Enclosure
                    </button>
                    <button
                      type="button"
                      disabled={!draft.content.trim() || isSubmittingPost}
                      onClick={handleExecutePost}
                      className={`px-8 py-4 font-sans font-medium text-xs tracking-[0.2em] uppercase rounded-xs transition-all duration-300 shadow-md cursor-pointer ${
                        draft.content.trim() && !isSubmittingPost
                          ? 'bg-teal-900 hover:bg-teal-800 text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]'
                          : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {isSubmittingPost ? 'SEALING LETTER IN VAULT...' : 'SEAL & POST LETTER →'}
                    </button>
                  </div>

                  <div className="text-center text-[10px] font-mono text-stone-400">
                    DIGITAL CORRESPONDENCE · HELD IN TRANSIT UNTIL THE APPOINTED HOUR
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Photo Enclosure Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-stone-200 p-6 rounded-xs space-y-4 shadow-paper-lg">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="font-serif text-lg text-stone-900">Enclose a Photograph</span>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="text-stone-400 hover:text-stone-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-mono text-stone-500 uppercase">
                Photo Caption
              </label>
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="e.g. Evening by Hussain Sagar, September 2026"
                className="w-full bg-stone-50 border border-stone-200 p-2.5 text-stone-900 text-sm focus:outline-none focus:border-stone-900"
              />

              <label className="block text-[11px] font-mono text-stone-500 uppercase pt-2">
                Choose Image File
              </label>
              <label className="flex flex-col items-center justify-center border border-dashed border-stone-300 p-6 rounded-xs cursor-pointer hover:border-stone-500 bg-stone-50">
                <span className="text-xl mb-1">🖼</span>
                <span className="text-xs text-stone-700">Upload from your device</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
