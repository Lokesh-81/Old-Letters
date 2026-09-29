import React, { useState, useEffect } from 'react';
import { Letter, LetterAttachment, LetterType } from '../../types/letter';
import { LETTER_TYPES, TEMPLATES } from '../../data/mockData';
import { PaperSheet } from '../common/PaperSheet';
import { PostingCeremony } from './PostingCeremony';
import { postLetter } from '../../lib/api';
import { UpiPaymentModal } from '../payment/UpiPaymentModal';

interface ComposerFlowProps {
  initialType?: LetterType;
  onLetterPosted: (letter: Letter) => void;
  onPreviewRecipient: (letter: Letter) => void;
  onViewArchive: () => void;
  onCancel: () => void;
}

export const ComposerFlow: React.FC<ComposerFlowProps> = ({
  initialType = 'LOVE',
  onLetterPosted,
  onPreviewRecipient,
  onViewArchive,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'stationery' | 'dispatch' | 'delivery'>('compose');
  const [isPosting, setIsPosting] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [generatedDeliveryToken, setGeneratedDeliveryToken] = useState<string | undefined>(undefined);
  const [activePaymentFeature, setActivePaymentFeature] = useState<'VOICE_NOTE' | 'VIDEO_NOTE' | 'LIVE_MEETING' | null>(null);
  const [mobileView, setMobileView] = useState<'write' | 'preview'>('write');
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'typing'>('saved');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [phase2Notice, setPhase2Notice] = useState<string | null>(null);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const defaultDeliveryAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  // Working letter state with Indian mock defaults
  const [draft, setDraft] = useState<Letter>({
    id: `ol-${Date.now()}`,
    trackingCode: `OL-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    type: initialType,
    templateId: 'ivory',
    senderName: 'Lokesh',
    senderEmail: 'lokesh@oldletters.in',
    recipientName: 'Vasantha',
    recipientEmail: 'vasantha@correspondence.in',
    letterDate: todayFormatted,
    greeting: 'Dear Vasantha,',
    content: `I am writing this on the balcony as the evening cools down over the city.

I wanted to tell you something I rarely say properly: how much I value your presence in my life. In a world where everyone is perpetually rushing to the next appointment, your calm presence is a gift.

I chose the 48-hour post because some words deserve to be waited for. Take your time with this.`,
    signoff: 'Yours,',
    attachments: [],
    verificationMethod: 'open',
    postedAt: new Date().toISOString(),
    scheduledDeliveryAt: defaultDeliveryAt,
    waitingHours: 48,
    status: 'IN TRANSIT',
    postmarkCity: 'Hyderabad Bureau',
  });

  useEffect(() => {
    setSaveIndicator('typing');
    const timer = setTimeout(() => {
      setSaveIndicator('saved');
    }, 500);
    return () => clearTimeout(timer);
  }, [draft.content, draft.greeting, draft.signoff, draft.senderName, draft.recipientName]);

  const updateDraft = (updates: Partial<Letter>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const activeTemplate =
    TEMPLATES.find((t) => t.id === draft.templateId) || TEMPLATES[0];

  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 160));

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

  const handleExecutePost = async () => {
    try {
      setIsSubmittingPost(true);
      setPostError(null);

      const result = await postLetter({
        type: draft.type,
        templateId: draft.templateId,
        senderName: draft.senderName || 'Anonymous',
        senderEmail: draft.senderEmail || 'sender@old-letters.in',
        recipientName: draft.recipientName || 'Recipient',
        recipientEmail: draft.recipientEmail || 'recipient@old-letters.in',
        greeting: draft.greeting,
        content: draft.content,
        signoff: draft.signoff,
        verificationMethod: draft.verificationMethod,
        passphrase: draft.passphrase,
        scheduledDeliveryAt: draft.scheduledDeliveryAt,
        waitingHours: draft.waitingHours,
        postmarkCity: draft.postmarkCity || 'Bureau of Correspondence',
        status: 'SCHEDULED',
      });

      const finalized: Letter = {
        ...draft,
        id: result.letter.id,
        trackingCode: result.trackingCode,
        status: 'SCHEDULED',
        postedAt: new Date().toISOString(),
      };

      setGeneratedDeliveryToken(result.deliveryToken);
      onLetterPosted(finalized);
      setIsPosting(true);
    } catch (err: any) {
      setPostError(err.message || 'Failed to seal and post letter.');
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
          setActiveTab('compose');
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full bg-[#faf9f7] text-teal-900">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#eae4da] pb-4 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-stone-500">
            WRITING STUDIO
          </span>
          <span className="text-stone-300">/</span>
          <span className="text-lg text-teal-900 font-medium" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
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
            <span>{saveIndicator === 'saved' ? 'Saved' : 'Inscribing...'}</span>
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
          onClick={() => setMobileView('write')}
          className={`flex-1 py-2 text-xs font-sans font-medium rounded-xs transition-colors cursor-pointer ${
            mobileView === 'write' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
          }`}
        >
          Writing Desk
        </button>
        <button
          type="button"
          onClick={() => setMobileView('preview')}
          className={`flex-1 py-2 text-xs font-sans font-medium rounded-xs transition-colors cursor-pointer ${
            mobileView === 'preview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
          }`}
        >
          Letter Preview
        </button>
      </div>

      {/* Studio Workspace: Left (3D Physical Letter Preview) + Right (Clean Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN: Large Live Letter Preview with 3D Depth Elevation */}
        <div
          className={`lg:col-span-6 lg:block ${
            mobileView === 'preview' ? 'block' : 'hidden'
          } lg:sticky lg:top-24 perspective-1500`}
        >
          <div
            className="p-6 sm:p-8 bg-[#f5f0e8] border border-[#e4dcd0] rounded-xs shadow-paper-lg space-y-4 preserve-3d"
            style={{ transform: 'rotateY(-2deg)' }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 border-b border-[#e4dcd0] pb-3">
              <span>PHYSICAL PAPER PREVIEW</span>
              <span className="font-semibold text-stone-800">{activeTemplate.name.toUpperCase()}</span>
            </div>

            {/* Raised Paper Sheet with Physical Shadow */}
            <div
              className="overflow-hidden flex justify-center py-2 shadow-paper-md rounded-xs bg-white"
              style={{ transform: 'translateZ(20px)' }}
            >
              <div className="w-full">
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
          </div>
        </div>

        {/* RIGHT COLUMN: Clean Modern Controls & Tabs */}
        <div
          className={`lg:col-span-6 space-y-6 ${
            mobileView === 'write' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Studio Navigation Tabs */}
          <div className="flex items-center border-b border-[#eae4da] gap-6 text-xs font-mono uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'compose'
                  ? 'border-teal-900 text-teal-900 font-semibold'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              1. Composition
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stationery')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'stationery'
                  ? 'border-teal-900 text-teal-900 font-semibold'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              2. Stationery
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'dispatch'
                  ? 'border-teal-900 text-teal-900 font-semibold'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              3. Recipient
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'delivery'
                  ? 'border-teal-900 text-teal-900 font-semibold'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              4. Delivery
            </button>
          </div>

          {/* TAB 1: COMPOSE */}
          {activeTab === 'compose' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                  Salutation
                </label>
                <input
                  type="text"
                  value={draft.greeting}
                  onChange={(e) => updateDraft({ greeting: e.target.value })}
                  placeholder="Dear Vasantha,"
                  className="w-full bg-white border border-[#eae4da] focus:border-teal-900 px-4 py-3 text-teal-900 font-serif text-xl focus:outline-none rounded-xs transition-colors shadow-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                  Prose Body
                </label>
                <textarea
                  value={draft.content}
                  onChange={(e) => updateDraft({ content: e.target.value })}
                  placeholder="Write your letter without haste..."
                  rows={13}
                  className="w-full bg-white border border-[#eae4da] focus:border-teal-900 p-5 text-stone-900 font-serif text-lg leading-relaxed focus:outline-none rounded-xs resize-y transition-colors shadow-xs"
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
                    placeholder="Yours,"
                    className="w-full bg-white border border-[#eae4da] focus:border-teal-900 px-4 py-2.5 text-stone-900 font-serif text-base focus:outline-none rounded-xs shadow-xs"
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
                    className="w-full bg-white border border-[#eae4da] focus:border-teal-900 px-4 py-2.5 text-stone-900 font-serif text-base focus:outline-none rounded-xs shadow-xs"
                  />
                </div>
              </div>

              {/* Enclosures Toolbar */}
              <div className="pt-2 border-t border-[#eae4da] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPhotoModal(true)}
                    className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-xs font-sans text-stone-700 rounded-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <span>🖼</span>
                    <span>Enclose Photo ({draft.attachments.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePaymentFeature('VOICE_NOTE')}
                    className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-xs font-sans text-stone-700 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>🎙</span>
                    <span>Voice Note (₹99)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePaymentFeature('VIDEO_NOTE')}
                    className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-xs font-sans text-stone-700 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>🎞</span>
                    <span>Video Note (₹149)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('stationery')}
                  className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                >
                  Stationery →
                </button>
              </div>

              {phase2Notice && (
                <div className="p-4 bg-[#fbf6f0] border border-[#e4d3bc] rounded-xs text-xs text-stone-700 flex items-center justify-between gap-4">
                  <span>{phase2Notice}</span>
                  <button
                    type="button"
                    onClick={() => setPhase2Notice(null)}
                    className="text-stone-400 hover:text-stone-900 cursor-pointer font-mono"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STATIONERY */}
          {activeTab === 'stationery' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-3">
                  Letter Type & Tone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LETTER_TYPES.map((lt) => {
                    const isSelected = draft.type === lt.type;
                    return (
                      <button
                        key={lt.type}
                        type="button"
                        onClick={() => updateDraft({ type: lt.type })}
                        className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#141618] shadow-xs text-stone-950 font-medium'
                            : 'bg-[#faf8f5] border-[#eae4da] text-stone-600 hover:bg-white'
                        }`}
                      >
                        <div className="font-serif text-base">{lt.type}</div>
                        <div className="text-[10px] text-stone-500 truncate">{lt.tagline}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#eae4da]">
                <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-3">
                  Stationery Template
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((tpl) => {
                    const isSelected = draft.templateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => updateDraft({ templateId: tpl.id })}
                        className={`p-4 text-left border rounded-xs transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-white border-[#141618] shadow-xs text-stone-900 font-medium'
                            : 'bg-[#faf8f5] border-[#eae4da] text-stone-600 hover:bg-white'
                        }`}
                      >
                        <div>
                          <div className="font-serif text-lg text-stone-900">{tpl.name}</div>
                          <div className="text-[11px] text-stone-500">{tpl.tagline}</div>
                        </div>
                        <span
                          className="w-4 h-4 rounded-full border border-stone-300 shadow-xs shrink-0"
                          style={{ backgroundColor: tpl.paperColor }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#eae4da] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  ← Back to Composition
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dispatch')}
                  className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium uppercase tracking-wider rounded-xs cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                >
                  Recipient →
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH & RECIPIENT */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-1.5">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={draft.recipientName}
                    onChange={(e) => updateDraft({ recipientName: e.target.value })}
                    placeholder="e.g. Vasantha or Satya"
                    className="w-full bg-white border border-[#eae4da] focus:border-[#141618] px-4 py-3 text-stone-900 font-serif text-lg focus:outline-none rounded-xs shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-1.5">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={draft.recipientEmail}
                    onChange={(e) => updateDraft({ recipientEmail: e.target.value })}
                    placeholder="vasantha@correspondence.in"
                    className="w-full bg-white border border-[#eae4da] focus:border-[#141618] px-4 py-3 text-stone-900 text-sm focus:outline-none rounded-xs shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#eae4da] space-y-3">
                <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                  Arrival Protection
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
                    <div className="font-serif text-sm">Gmail OTP</div>
                    <div className="text-[10px] text-stone-500">6-digit code via Resend</div>
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
                    <div className="text-[10px] text-stone-500">Shared secret passphrase</div>
                  </button>
                </div>

                {draft.verificationMethod === 'otp' && (
                  <div className="p-3 bg-[#faf9f7] border border-[#eae4da] rounded-xs text-xs font-mono text-stone-600">
                    A cryptographic 6-digit OTP will be dispatched to {draft.recipientEmail || 'recipient'} upon delivery.
                  </div>
                )}

                {draft.verificationMethod === 'passphrase' && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={draft.passphrase || ''}
                      onChange={(e) => updateDraft({ passphrase: e.target.value })}
                      placeholder="Enter secret passphrase"
                      className="w-full bg-white border border-[#eae4da] px-4 py-2.5 text-stone-900 text-sm focus:outline-none shadow-xs"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#eae4da] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('stationery')}
                  className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  ← Back to Stationery
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('delivery')}
                  className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium uppercase tracking-wider rounded-xs cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                >
                  Delivery Passage →
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DELIVERY PASSAGE & POST */}
          {activeTab === 'delivery' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 bg-white border border-[#eae4da] shadow-paper-sm rounded-xs space-y-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                  <span>DISPATCH MANIFEST</span>
                  <span>STANDARD TRANSIT</span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-[10px] font-mono text-stone-400 uppercase block">
                      Posted Today
                    </span>
                    <span className="font-serif text-xl text-stone-800">{draft.letterDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#5c1d24] uppercase block">
                      Expected Arrival
                    </span>
                    <span className="font-serif text-xl text-[#5c1d24] font-medium">
                      {new Date(draft.scheduledDeliveryAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-mono text-stone-500 pt-2 border-t border-stone-100">
                  Passage Duration: {draft.waitingHours} Hours of Anticipation
                </div>
              </div>

              {/* Transit Preset Buttons (Minimum 48 hours enforced) */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                  Select Transit Tempo (Min. 48 Hours)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '48 Hours', hours: 48, note: 'Standard Post' },
                    { label: '7 Days', hours: 168, note: 'Reflective' },
                    { label: '30 Days', hours: 720, note: 'Memorial' },
                  ].map((preset) => {
                    const isSelected = draft.waitingHours === preset.hours;
                    return (
                      <button
                        key={preset.hours}
                        type="button"
                        onClick={() => {
                          const arrival = new Date(Date.now() + preset.hours * 3600 * 1000);
                          updateDraft({
                            waitingHours: preset.hours,
                            scheduledDeliveryAt: arrival.toISOString(),
                          });
                        }}
                        className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#141618] text-stone-900 font-medium shadow-xs'
                            : 'bg-[#faf8f5] border-[#eae4da] text-stone-600'
                        }`}
                      >
                        <div className="font-serif text-base">{preset.label}</div>
                        <div className="text-[10px] text-stone-500">{preset.note}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {postError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs font-mono">
                  {postError}
                </div>
              )}

              {/* Post Letter Action */}
              <div className="pt-6 border-t border-[#eae4da] space-y-4">
                <button
                  type="button"
                  onClick={handleExecutePost}
                  disabled={!draft.content.trim() || isSubmittingPost}
                  className={`w-full py-4 font-sans font-medium text-xs tracking-[0.2em] uppercase rounded-xs transition-all duration-300 shadow-md cursor-pointer ${
                    draft.content.trim() && !isSubmittingPost
                      ? 'bg-teal-900 hover:bg-teal-800 text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]'
                      : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmittingPost ? 'SEALING LETTER IN VAULT...' : 'SEAL & POST LETTER →'}
                </button>

                <div className="text-center text-[11px] font-mono text-stone-500">
                  FREE DIGITAL CORRESPONDENCE · SEALED IN TRANSIT
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual UPI Payment Modal */}
      {activePaymentFeature && (
        <UpiPaymentModal
          isOpen={true}
          featureCode={activePaymentFeature}
          letterId={draft.id}
          onClose={() => setActivePaymentFeature(null)}
          onPaymentSubmitted={() => {
            // Modal internally shows pending message
          }}
        />
      )}

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
                placeholder="e.g. Evening by the lake, September 2026"
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
