import React, { useState, useEffect } from 'react';
import { Letter, RecipientMetadata } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';
import { EnvelopeObject } from '../common/EnvelopeObject';
import { PaperSheet } from '../common/PaperSheet';
import { requestOtp, verifyRecipientAccess } from '../../lib/api';
import { Clock, Lock, ShieldCheck, Mail, KeyRound } from 'lucide-react';

interface RecipientExperienceProps {
  letter?: Letter | null;
  metadata?: RecipientMetadata | null;
  deliveryToken?: string;
  onExit: () => void;
  onReply?: (recipientLetter: Letter) => void;
}

export const RecipientExperience: React.FC<RecipientExperienceProps> = ({
  letter: initialLetter,
  metadata,
  deliveryToken,
  onExit,
  onReply,
}) => {
  const [activeLetter, setActiveLetter] = useState<Letter | null>(initialLetter || null);

  // Determine delivery arrival state
  const isArrived = metadata ? metadata.isArrived : (activeLetter ? activeLetter.status !== 'SCHEDULED' : true);
  const isSealedInTransit = !isArrived;

  const [stage, setStage] = useState<'sealed' | 'unsealing' | 'reading' | 'reveal' | 'parlour'>(() => {
    if (initialLetter?.content && (metadata?.isArrived ?? true)) {
      return 'reading';
    }
    return 'sealed';
  });

  // Verification states
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [enteredPassphrase, setEnteredPassphrase] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Sync initial letter if changed
  useEffect(() => {
    if (initialLetter) {
      setActiveLetter(initialLetter);
      if (initialLetter.content && isArrived) {
        setStage('reading');
      }
    }
  }, [initialLetter, isArrived]);

  // Transition to reading view as soon as letter content arrives
  useEffect(() => {
    if (activeLetter?.content && isArrived && stage === 'sealed') {
      setStage('reading');
    }
  }, [activeLetter?.content, isArrived, stage]);

  // Live countdown timer for in-transit letters
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (metadata?.deliveryDate) {
      const diff = new Date(metadata.deliveryDate).getTime() - Date.now();
      return Math.max(0, Math.ceil(diff / 1000));
    }
    return metadata?.remainingSeconds || 0;
  });

  useEffect(() => {
    if (!isSealedInTransit || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto reload once wait completes so server transitions to arrived
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSealedInTransit, remainingSeconds]);

  const formatRemaining = (totalSecs: number): string => {
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const templateId = activeLetter?.templateId || metadata?.templateId || 'ivory';
  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];

  const senderDisplayName = activeLetter?.senderName || metadata?.senderName || 'A correspondent';
  const recipientDisplayName = activeLetter?.recipientName || metadata?.recipientName || 'Recipient';
  const trackingCode = activeLetter?.trackingCode || metadata?.trackingCode || 'OL-DISPATCH';
  const verificationMethod = metadata?.verificationMethod || activeLetter?.verificationMethod || 'open';
  const waitingHours = metadata?.waitingHours || activeLetter?.waitingHours || 48;
  const postmarkCity = metadata?.postmarkCity || activeLetter?.postmarkCity || 'Central Postal Archive';

  const scheduledArrivalDateString = metadata?.deliveryDate
    ? new Date(metadata.deliveryDate).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : (activeLetter?.scheduledDeliveryAt
        ? new Date(activeLetter.scheduledDeliveryAt).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'In 48 Hours');

  // Direct unseal handler (calls server to verify and fetch protected letter content)
  const handleDirectUnseal = async () => {
    try {
      setIsVerifying(true);
      setVerificationError(null);
      const token = deliveryToken || trackingCode;

      const verifiedLetter = await verifyRecipientAccess({
        token,
        verificationMethod: 'open',
      });

      setActiveLetter(verifiedLetter);
      setStage('unsealing');
      setTimeout(() => {
        setStage('reading');
      }, 850);
    } catch (err: any) {
      setVerificationError(err.message || 'Failed to unseal letter. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Automatically prompt for verification if delivered letter requires OTP or passphrase
  useEffect(() => {
    if (isArrived && (verificationMethod === 'otp' || verificationMethod === 'passphrase') && !activeLetter?.content) {
      setShowVerificationPrompt(true);
    }
  }, [isArrived, verificationMethod, activeLetter?.content]);

  // Automatically unseal if delivered and open verification but content not yet fetched
  useEffect(() => {
    if (isArrived && verificationMethod === 'open' && !activeLetter?.content && !isVerifying && !verificationError) {
      handleDirectUnseal();
    }
  }, [isArrived, verificationMethod, activeLetter?.content, isVerifying, verificationError]);

  const handleOpenEnvelope = () => {
    // If still in transit, opening is strictly forbidden
    if (isSealedInTransit) {
      return;
    }

    // If letter content is already loaded and authenticated
    if (activeLetter && activeLetter.content) {
      setStage('unsealing');
      setTimeout(() => {
        setStage('reading');
      }, 850);
      return;
    }

    // If protected by passphrase or OTP, show verification prompt
    if (verificationMethod === 'passphrase' || verificationMethod === 'otp') {
      setShowVerificationPrompt(true);
      return;
    }

    // Direct unseal
    handleDirectUnseal();
  };

  const handleRequestOtp = async () => {
    try {
      setIsRequestingOtp(true);
      setVerificationError(null);
      const token = deliveryToken || trackingCode;
      const res = await requestOtp(token);
      setOtpSentMessage(res.message);
      if (res.devOtpHint) {
        setOtpSentMessage(`Code sent! (Dev preview code: ${res.devOtpHint})`);
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);
    setIsVerifying(true);

    try {
      const token = deliveryToken || trackingCode;

      if (verificationMethod === 'otp') {
        if (!enteredOtp || enteredOtp.length !== 6) {
          throw new Error('Please enter the 6-digit verification code.');
        }

        const verifiedLetter = await verifyRecipientAccess({
          token,
          verificationMethod: 'otp',
          otp: enteredOtp.trim(),
        });

        setActiveLetter(verifiedLetter);
        setShowVerificationPrompt(false);
        setStage('unsealing');
        setTimeout(() => setStage('reading'), 850);
      } else if (verificationMethod === 'passphrase') {
        if (!enteredPassphrase.trim()) {
          throw new Error('Please enter the secret cipher passphrase.');
        }

        const verifiedLetter = await verifyRecipientAccess({
          token,
          verificationMethod: 'passphrase',
          passphrase: enteredPassphrase.trim(),
        });

        setActiveLetter(verifiedLetter);
        setShowVerificationPrompt(false);
        setStage('unsealing');
        setTimeout(() => setStage('reading'), 850);
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Verification rejected.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] text-teal-900 flex flex-col justify-between p-4 sm:p-8 select-none relative overflow-x-hidden">
      {/* Minimal Top Bar with Official Horizontal Logo */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#eae4da]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
            aria-label="OLD-LETTERS"
          >
            <img
              src="/logo.png"
              alt="OLD-LETTERS"
              width={2172}
              height={724}
              className="h-8 sm:h-9 w-auto max-w-[170px] sm:max-w-[210px] object-contain"
            />
          </button>
          <span className="text-stone-300">·</span>
          <span className="text-[11px] font-mono tracking-widest uppercase text-stone-500">
            {metadata?.status === 'NOT_FOUND' ? 'POSTAL REGISTRY' : (isSealedInTransit ? 'IN TRANSIT' : 'PRIVATE ARRIVAL')}
          </span>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="text-xs font-mono text-stone-500 hover:text-teal-900 transition-colors cursor-pointer flex items-center gap-2"
        >
          <span>✕</span>
          <span>Close</span>
        </button>
      </header>

      {/* ========================================================================= */}
      {/* CASE 0: NOT FOUND OR EXPIRED DELIVERY LINK                                */}
      {/* ========================================================================= */}
      {metadata?.status === 'NOT_FOUND' ? (
        <main className="max-w-md mx-auto my-auto py-16 text-center space-y-6 animate-fade-in w-full">
          <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 p-3.5 flex items-center justify-center border border-stone-200">
            <img src="/favicon.png" alt="OLD-LETTERS" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl text-teal-950 font-light">
              Correspondence Not Found
            </h1>
            <p className="font-serif italic text-stone-600 text-sm leading-relaxed">
              {(metadata as any).errorNotice || 'The requested correspondence could not be located in the postal registry. The delivery link may be expired, mistyped, or not yet dispatched.'}
            </p>
          </div>
          <div className="pt-4">
            <button
              type="button"
              onClick={onExit}
              className="px-6 py-2.5 bg-teal-900 hover:bg-teal-800 text-white font-sans text-xs uppercase tracking-wider rounded-xs cursor-pointer shadow-xs"
            >
              Return to Postal Bureau →
            </button>
          </div>
        </main>
      ) : isSealedInTransit ? (
        <main className="max-w-2xl mx-auto my-auto py-12 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in w-full">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 border border-stone-200 text-stone-600 rounded-full text-[11px] font-mono tracking-widest uppercase">
              <Clock className="w-3.5 h-3.5 text-teal-900" />
              <span>INTENTIONAL TRANSIT PROTOCOL</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl text-teal-900 font-light">
              Correspondence in Transit
            </h1>
            <p className="text-stone-600 font-serif italic text-lg sm:text-xl">
              Addressed to {recipientDisplayName} · From {senderDisplayName}
            </p>
          </div>

          {/* Intact Sealed Envelope Object */}
          <div className="w-80 h-56 sm:w-96 sm:h-64 relative flex items-center justify-center">
            <EnvelopeObject
              template={template}
              templateId={templateId}
              recipientName={recipientDisplayName}
              senderName={senderDisplayName}
              date={metadata?.deliveryDate ? new Date(metadata.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'In Transit'}
              sealColor={template.waxSealStyle?.color}
              sealEmblem={template.waxSealStyle?.emblem}
              isSealed={true}
              interactiveSeal={false}
            />
          </div>

          {/* Archival Vault Transit Status Card */}
          <div className="w-full max-w-md bg-white border border-[#eae4da] shadow-paper-md p-6 rounded-xs text-left space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 text-xs font-mono">
              <span className="text-stone-400">DISPATCH REF</span>
              <span className="text-stone-900 font-semibold">{trackingCode}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-stone-500 uppercase block">
                EXPECTED CEREMONIAL ARRIVAL
              </span>
              <div className="font-serif text-xl text-teal-900 font-medium">
                {scheduledArrivalDateString}
              </div>
            </div>

            {/* Live countdown */}
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-stone-500 uppercase block">
                  REMAINING WAITING TIME
                </span>
                <span className="font-mono text-lg font-bold text-teal-900 tracking-wider">
                  {formatRemaining(remainingSeconds)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-stone-400 uppercase block">
                  POSTAL TEMPO
                </span>
                <span className="font-mono text-xs text-stone-700">
                  {waitingHours} Hours Sealed
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-500 font-serif leading-relaxed italic border-t border-stone-100 pt-3">
              &ldquo;Some words deserve to be waited for. In accordance with the sender&rsquo;s chosen tempo, this letter remains sealed in the archival vault until the appointed hour.&rdquo;
            </div>
          </div>

          {/* Locked Badge */}
          <div className="flex items-center gap-2 text-stone-500 text-xs font-mono bg-stone-100 border border-stone-200 px-4 py-2 rounded-xs">
            <Lock className="w-3.5 h-3.5 text-stone-600" />
            <span>WAX SEAL UNBREAKABLE UNTIL ARRIVAL</span>
          </div>
        </main>
      ) : (
        /* ========================================================================= */
        /* CASE B: ARRIVAL ELIGIBLE (48h elapsed) OR VERIFIED READING               */
        /* ========================================================================= */
        <>
          {/* STAGE 1: SEALED ENVELOPE READY TO UNSEAL */}
          {stage === 'sealed' && (
            <main className="max-w-2xl mx-auto my-auto py-16 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in w-full perspective-1500">
              <div className="space-y-3">
                <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
                  DISPATCH REF: {trackingCode}
                </span>
                <h1 className="font-serif text-4xl sm:text-6xl text-teal-900 font-light">
                  A letter has arrived.
                </h1>
                <p className="text-stone-600 font-serif italic text-lg sm:text-xl">
                  From {senderDisplayName} · For {recipientDisplayName}
                </p>
              </div>

              {/* Verification prompt (OTP or Passphrase) */}
              {showVerificationPrompt ? (
                <form
                  onSubmit={handleVerify}
                  className="p-6 bg-white border border-stone-300 rounded-xs max-w-sm w-full space-y-4 shadow-paper-md text-left"
                >
                  <div className="text-xs font-mono text-stone-800 uppercase font-semibold text-center flex items-center justify-center gap-2">
                    {verificationMethod === 'otp' ? (
                      <>
                        <Mail className="w-4 h-4 text-teal-900" />
                        <span>RECIPIENT EMAIL VERIFICATION</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 text-teal-900" />
                        <span>ENTER SECRET CIPHER</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 font-serif text-center">
                    {verificationMethod === 'otp'
                      ? `A 6-digit code will be sent to ${metadata?.recipientEmailMasked || 'your email'} to verify recipient identity.`
                      : `${senderDisplayName} protected this correspondence with a private cipher.`}
                  </p>

                  {verificationError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs font-mono">
                      {verificationError}
                    </div>
                  )}

                  {otpSentMessage && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xs font-mono">
                      {otpSentMessage}
                    </div>
                  )}

                  {verificationMethod === 'otp' ? (
                    <div className="space-y-3">
                      {!otpSentMessage ? (
                        <button
                          type="button"
                          disabled={isRequestingOtp}
                          onClick={handleRequestOtp}
                          className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer border border-stone-300"
                        >
                          {isRequestingOtp ? 'Dispatching Code...' : 'Send Verification Code →'}
                        </button>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                            6-Digit Code
                          </label>
                          <input
                            type="text"
                            autoFocus
                            maxLength={6}
                            value={enteredOtp}
                            onChange={(e) => {
                              setEnteredOtp(e.target.value);
                              setVerificationError(null);
                            }}
                            placeholder="123456"
                            className="w-full bg-[#faf9f7] border border-stone-300 px-3 py-2 text-stone-900 font-mono text-center text-lg tracking-[0.3em] focus:outline-none focus:border-teal-900 rounded-xs"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1">
                        Cipher Passphrase
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={enteredPassphrase}
                        onChange={(e) => {
                          setEnteredPassphrase(e.target.value);
                          setVerificationError(null);
                        }}
                        placeholder="Enter cipher..."
                        className="w-full bg-[#faf9f7] border border-stone-300 px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-teal-900 rounded-xs"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isVerifying || (verificationMethod === 'otp' && !enteredOtp)}
                      className="flex-1 py-3 bg-teal-900 hover:bg-teal-800 disabled:bg-stone-300 text-white font-sans text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer shadow-xs"
                    >
                      {isVerifying ? 'Verifying...' : 'Break Wax Seal →'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVerificationPrompt(false)}
                      className="px-3 py-3 border border-stone-300 text-stone-500 hover:text-stone-800 text-xs rounded-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="w-80 h-56 sm:w-96 sm:h-64 relative flex items-center justify-center cursor-pointer group">
                  <EnvelopeObject
                    template={template}
                    templateId={templateId}
                    recipientName={recipientDisplayName}
                    senderName={senderDisplayName}
                    date={activeLetter?.letterDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    sealColor={template.waxSealStyle?.color}
                    sealEmblem={template.waxSealStyle?.emblem}
                    isSealed={true}
                    interactiveSeal={true}
                    onSealClick={handleOpenEnvelope}
                  />
                </div>
              )}

              {verificationError && !showVerificationPrompt && (
                <div className="max-w-md p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs font-mono">
                  {verificationError}
                </div>
              )}

              {!showVerificationPrompt && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleOpenEnvelope}
                    className="px-8 py-3.5 bg-teal-900 hover:bg-teal-800 text-white font-sans font-medium text-xs tracking-[0.2em] uppercase rounded-xs transition-colors cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                  >
                    {isVerifying ? 'UNSEALING...' : 'BREAK SEAL & UNVEIL LETTER →'}
                  </button>
                  <div className="text-[11px] font-mono text-stone-400">
                    CLICK ENVELOPE OR BUTTON TO COMMENCE UNSEALING
                  </div>
                </div>
              )}
            </main>
          )}

          {/* STAGE 2: UNSEALING ANIMATION */}
          {stage === 'unsealing' && (
            <main className="max-w-2xl mx-auto my-auto py-24 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in w-full">
              <div className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
                CEREMONY OF ARRIVAL
              </div>

              <div className="relative w-80 h-56 sm:w-96 sm:h-64 flex items-center justify-center">
                <EnvelopeObject
                  template={template}
                  templateId={templateId}
                  recipientName={recipientDisplayName}
                  senderName={senderDisplayName}
                  date={activeLetter?.letterDate || 'Today'}
                  sealColor={template.waxSealStyle?.color}
                  sealEmblem={template.waxSealStyle?.emblem}
                  isSealed={false}
                  isOpen={true}
                />
              </div>

              <div className="font-serif italic text-xl text-stone-700 animate-pulse">
                Breaking {template.waxSealStyle?.name || 'wax'} seal and drawing out {template.name} parchment...
              </div>
            </main>
          )}

          {/* STAGE 3: READING THE AUTHENTICATED PARCHMENT */}
          {stage === 'reading' && activeLetter && (
            <main className="max-w-3xl mx-auto w-full py-12 space-y-12 animate-fade-in">
              {/* Dispatch Metadata Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#eae4da] pb-4 text-xs font-mono text-stone-500 gap-2">
                <div className="flex items-center gap-3">
                  <span>DISPATCH REF: {activeLetter.trackingCode}</span>
                  <span>·</span>
                  <span className="text-teal-900 font-medium">{activeLetter.type}</span>
                  <span>·</span>
                  <span className="text-stone-500">{template.name}</span>
                </div>
                <div>
                  SEALED IN TRANSIT FOR {activeLetter.waitingHours || 48} HOURS
                </div>
              </div>

              {/* Archival Paper Sheet */}
              <div className="w-full flex justify-center shadow-paper-lg">
                <PaperSheet
                  template={template}
                  templateId={activeLetter.templateId}
                  date={activeLetter.letterDate}
                  greeting={activeLetter.greeting}
                  content={activeLetter.content}
                  signoff={activeLetter.signoff}
                  senderName={activeLetter.senderName}
                  recipientName={activeLetter.recipientName}
                  attachments={activeLetter.attachments}
                  isEditing={false}
                />
              </div>

              {/* Personal Audio / Video Message Enclosure if attached */}
              {(activeLetter as any).personalMessage && (
                <div className="max-w-2xl mx-auto w-full p-6 bg-white border border-[#eae4da] shadow-paper rounded-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <img src="/favicon.png" alt="Seal" className="w-4 h-4 object-contain" />
                      <span className="text-xs font-mono tracking-widest uppercase text-stone-700 font-semibold">
                        {(activeLetter as any).personalMessage.mediaType === 'VIDEO' ? 'PERSONAL VIDEO ENCLOSURE' : 'PERSONAL VOICE ENCLOSURE'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-teal-200 bg-teal-50 text-teal-900 uppercase font-semibold">
                      VERIFIED ENCLOSURE
                    </span>
                  </div>

                  <p className="text-xs font-serif italic text-stone-600">
                    {activeLetter.senderName} recorded a personal {(activeLetter as any).personalMessage.mediaType === 'VIDEO' ? 'video note' : 'voice message'} to accompany this correspondence.
                  </p>

                  {(activeLetter as any).personalMessage.mediaType === 'VIDEO' ? (
                    <video
                      src={(activeLetter as any).personalMessage.streamUrl || `/api/delivery/media/${deliveryToken || activeLetter.id}`}
                      controls
                      playsInline
                      className="w-full max-h-72 rounded-xs bg-black shadow-inner"
                    />
                  ) : (
                    <div className="p-4 bg-[#faf9f7] border border-stone-200 rounded-xs flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center p-2.5">
                        <img src="/favicon.png" alt="Enclosure" className="w-full h-full object-contain" />
                      </div>
                      <audio
                        src={(activeLetter as any).personalMessage.streamUrl || `/api/delivery/media/${deliveryToken || activeLetter.id}`}
                        controls
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Reveal Trigger */}
              <div className="text-center pt-8 border-t border-[#eae4da] space-y-4">
                <p className="font-serif italic text-stone-600 text-lg">
                  You have reached the end of the letter.
                </p>

                <button
                  type="button"
                  onClick={() => setStage('reveal')}
                  className="px-8 py-3.5 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 font-sans text-xs tracking-[0.2em] uppercase rounded-xs transition-colors cursor-pointer shadow-xs"
                >
                  CONTINUE →
                </button>
              </div>
            </main>
          )}

          {/* STAGE 4: "THERE IS ONE MORE THING." REVEAL */}
          {stage === 'reveal' && activeLetter && (
            <main className="max-w-xl mx-auto my-auto py-20 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
              <div className="text-[11px] font-mono tracking-[0.3em] uppercase text-stone-500">
                A FINAL NOTE
              </div>

              <h2 className="font-serif text-4xl sm:text-6xl text-teal-900 font-light">
                There is one more thing.
              </h2>

              <div className="font-serif italic text-2xl sm:text-3xl text-teal-900 leading-relaxed">
                &ldquo;Someone is waiting for you.&rdquo;
              </div>

              <p className="text-stone-600 font-sans text-sm max-w-md leading-relaxed">
                {activeLetter.senderName} requested to be notified the moment you broke the seal.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="button"
                  onClick={() => setStage('parlour')}
                  className="px-8 py-4 bg-teal-900 hover:bg-teal-800 text-white font-sans font-medium text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                >
                  MEET THEM →
                </button>

                {onReply && (
                  <button
                    type="button"
                    onClick={() => onReply(activeLetter)}
                    className="px-6 py-4 border border-stone-300 hover:border-teal-900 text-stone-800 hover:text-teal-900 font-sans text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
                  >
                    Write a Reply
                  </button>
                )}
              </div>
            </main>
          )}

          {/* STAGE 5: POST OFFICE PARLOUR */}
          {stage === 'parlour' && activeLetter && (
            <main className="max-w-lg mx-auto my-auto py-12 p-8 bg-white border border-[#eae4da] shadow-paper-md rounded-xs text-center space-y-6 animate-fade-in">
              <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
                THE PRIVATE PARLOUR
              </div>

              <h3 className="font-serif text-3xl text-teal-900 font-light">
                Rendezvous Room {activeLetter.trackingCode}
              </h3>

              <p className="text-sm font-serif italic text-stone-600 leading-relaxed">
                Connecting you and {activeLetter.senderName} in an encrypted face-to-face video parlour. Both participants require explicit camera and microphone permission.
              </p>

              <div className="p-4 bg-[#faf9f7] border border-stone-200 rounded-xs text-xs font-mono text-stone-600">
                ROOM ID: <code>{activeLetter.trackingCode}</code> · STATUS: WAITING FOR MUTUAL CONSENT
              </div>

              <div className="pt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setStage('reading')}
                  className="px-5 py-2.5 border border-stone-300 text-stone-700 hover:text-teal-900 text-xs font-sans rounded-xs transition-colors cursor-pointer"
                >
                  ← Back to Letter
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="px-6 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans font-medium rounded-xs cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                >
                  Return Home
                </button>
              </div>
            </main>
          )}
        </>
      )}

      {/* Bottom Minimal Footer */}
      <footer className="max-w-4xl mx-auto w-full flex items-center justify-between text-[10px] font-mono text-stone-400 py-3 border-t border-[#eae4da]">
        <span>OLD-LETTERS CORRESPONDENCE</span>
        <span>{isSealedInTransit ? 'SEAL ENTRUSTED TO VAULT' : 'SEAL VERIFIED'}</span>
      </footer>
    </div>
  );
};

export default RecipientExperience;
