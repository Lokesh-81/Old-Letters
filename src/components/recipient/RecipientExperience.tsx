import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Letter, RecipientMetadata } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';
import { EnvelopeObject } from '../common/EnvelopeObject';
import { PaperSheet } from '../common/PaperSheet';
import { getDeliveryMeta, requestOtp, verifyRecipientAccess } from '../../lib/api';
import { Clock, Lock, ShieldCheck, Mail, KeyRound } from 'lucide-react';

interface RecipientExperienceProps {
  letter?: Letter | null;
  metadata?: RecipientMetadata | null;
  deliveryToken?: string;
  isLoading?: boolean;
  onExit: () => void;
  onReply?: (recipientLetter: Letter) => void;
}

// UTC timestamp parser supporting ISO string, numeric timestamps (sec or ms), and Date objects
function parseToMs(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? null : t;
  }
  if (typeof val === 'number' && !isNaN(val)) {
    return val < 1e11 ? val * 1000 : val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return num < 1e11 ? num * 1000 : num;
    }
    const parsed = Date.parse(trimmed);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export const RecipientExperience: React.FC<RecipientExperienceProps> = ({
  letter: initialLetter,
  metadata,
  deliveryToken,
  isLoading = false,
  onExit,
  onReply,
}) => {
  const [activeLetter, setActiveLetter] = useState<Letter | null>(initialLetter || null);
  const [localMetadata, setLocalMetadata] = useState<RecipientMetadata | null>(metadata || null);

  // Sync incoming props
  useEffect(() => {
    if (initialLetter) {
      setActiveLetter(initialLetter);
    }
  }, [initialLetter]);

  useEffect(() => {
    if (metadata) {
      setLocalMetadata(metadata);
    }
  }, [metadata]);

  const effectiveMeta = localMetadata || metadata;
  const currentLetter = activeLetter || initialLetter;

  // Authoritative arrival state derived directly from server API response:
  const isArrived = Boolean(
    effectiveMeta?.isArrived ||
    (effectiveMeta?.status && ['DELIVERED', 'OPENED', 'COMPLETED'].includes(effectiveMeta.status)) ||
    (currentLetter?.status && ['DELIVERED', 'OPENED', 'COMPLETED'].includes(currentLetter.status))
  );
  const isSealedInTransit = !isArrived;

  // Server-authoritative time skew calculation:
  // Calculates server-client clock offset so client clock manipulation cannot unlock early
  const serverOffsetRef = useRef<number>(0);
  useEffect(() => {
    if (effectiveMeta?.serverTimeMs && typeof effectiveMeta.serverTimeMs === 'number') {
      serverOffsetRef.current = effectiveMeta.serverTimeMs - Date.now();
    }
  }, [effectiveMeta?.serverTimeMs]);

  // Target delivery time in exact Unix milliseconds resolved canonically:
  // letter.deliveryDate || letter.scheduledDeliveryAt || letter.createdAt
  const targetDeliveryMs = useMemo<number>(() => {
    if (effectiveMeta?.deliveryDateMs && effectiveMeta.deliveryDateMs > 0) {
      return effectiveMeta.deliveryDateMs;
    }
    const candidateMs =
      parseToMs(effectiveMeta?.deliveryDate) ??
      parseToMs(effectiveMeta?.scheduledDeliveryAt) ??
      parseToMs(currentLetter?.deliveryDate) ??
      parseToMs(currentLetter?.scheduledDeliveryAt) ??
      parseToMs((currentLetter as any)?.createdAt) ??
      parseToMs((effectiveMeta as any)?.createdAt) ??
      0;
    return candidateMs;
  }, [effectiveMeta, currentLetter]);

  const computeRemainingSeconds = useCallback((): number => {
    if (isArrived) return 0;
    if (!targetDeliveryMs || targetDeliveryMs <= 0) {
      return effectiveMeta?.remainingSeconds && effectiveMeta.remainingSeconds > 0
        ? effectiveMeta.remainingSeconds
        : 1;
    }
    const currentServerTime = Date.now() + serverOffsetRef.current;
    const diffMs = targetDeliveryMs - currentServerTime;
    if (diffMs <= 0) {
      return 0;
    }
    return Math.max(1, Math.ceil(diffMs / 1000));
  }, [isArrived, targetDeliveryMs, effectiveMeta?.remainingSeconds]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => computeRemainingSeconds());

  useEffect(() => {
    setRemainingSeconds(computeRemainingSeconds());
  }, [computeRemainingSeconds]);

  // Initial stage derived from actual letter & arrival state
  const [stage, setStage] = useState<'sealed' | 'unsealing' | 'reading' | 'reveal' | 'parlour'>(() => {
    if ((initialLetter?.content || activeLetter?.content) && isArrived) {
      return 'reading';
    }
    return 'sealed';
  });

  // Verification states
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(() => {
    const vm = effectiveMeta?.verificationMethod || currentLetter?.verificationMethod || 'open';
    return isArrived && (vm === 'otp' || vm === 'passphrase') && !(currentLetter?.content);
  });
  const [enteredPassphrase, setEnteredPassphrase] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Transition to reading view as soon as letter content arrives
  useEffect(() => {
    if ((activeLetter?.content || initialLetter?.content) && isArrived) {
      setStage('reading');
    }
  }, [activeLetter?.content, initialLetter?.content, isArrived]);

  const templateId = currentLetter?.templateId || effectiveMeta?.templateId || 'ivory';
  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];

  const senderDisplayName = currentLetter?.senderName || effectiveMeta?.senderName || 'A correspondent';
  const recipientDisplayName = currentLetter?.recipientName || effectiveMeta?.recipientName || 'Recipient';
  const trackingCode = currentLetter?.trackingCode || effectiveMeta?.trackingCode || 'OL-DISPATCH';
  const verificationMethod = effectiveMeta?.verificationMethod || currentLetter?.verificationMethod || 'open';
  const postmarkCity = effectiveMeta?.postmarkCity || currentLetter?.postmarkCity || 'Central Postal Archive';

  // Configured duration resolved from waitingHours or delivery and creation timestamps
  const configuredWaitingHours = useMemo(() => {
    if (effectiveMeta?.waitingHours && effectiveMeta.waitingHours > 0) {
      return effectiveMeta.waitingHours;
    }
    if (currentLetter?.waitingHours && currentLetter.waitingHours > 0) {
      return currentLetter.waitingHours;
    }
    const createdMs = parseToMs((currentLetter as any)?.createdAt || (effectiveMeta as any)?.createdAt);
    if (targetDeliveryMs > 0 && createdMs && targetDeliveryMs > createdMs) {
      const diffHours = Math.round((targetDeliveryMs - createdMs) / (3600 * 1000));
      if (diffHours > 0) return diffHours;
    }
    return 48;
  }, [effectiveMeta, currentLetter, targetDeliveryMs]);

  const scheduledArrivalDateString = useMemo(() => {
    if (targetDeliveryMs > 0) {
      return new Date(targetDeliveryMs).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return 'In 48 Hours';
  }, [targetDeliveryMs]);

  // Direct unseal handler (calls server to verify and fetch protected letter content)
  const handleDirectUnseal = useCallback(async () => {
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
  }, [deliveryToken, trackingCode]);

  // Live countdown timer for in-transit letters with authoritative server verification upon expiry
  const isPollingArrivalRef = useRef<boolean>(false);
  useEffect(() => {
    if (!isSealedInTransit) return;

    const interval = setInterval(() => {
      const secs = computeRemainingSeconds();
      setRemainingSeconds(secs);

      if (secs <= 0 && !isPollingArrivalRef.current) {
        isPollingArrivalRef.current = true;
        const token = deliveryToken || trackingCode;
        if (token) {
          getDeliveryMeta(token)
            .then((res) => {
              if (res.metadata) {
                setLocalMetadata(res.metadata);
              }
              if (res.letter) {
                setActiveLetter(res.letter);
              }
              if (res.isArrived) {
                clearInterval(interval);
                if (res.letter?.content) {
                  setStage('reading');
                } else if (res.metadata.verificationMethod === 'open') {
                  handleDirectUnseal();
                } else {
                  setShowVerificationPrompt(true);
                }
              }
            })
            .catch(() => {
              // Retry on next tick
            })
            .finally(() => {
              isPollingArrivalRef.current = false;
            });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSealedInTransit, computeRemainingSeconds, deliveryToken, trackingCode, handleDirectUnseal]);

  // Format remaining time accurately without premature 0m 0s
  const formatRemaining = (totalSecs: number): string => {
    if (totalSecs <= 0) {
      return 'Arriving now';
    }
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
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Postal tempo label formatting reflecting actual configured delivery duration
  const postalTempoLabel = useMemo(() => {
    const h = configuredWaitingHours;
    if (h === 1) return '1 Hour Sealed';
    if (h < 24) return `${h} Hours Sealed`;
    if (h === 24) return '1 Day Sealed';
    if (h === 48) return '48 Hours Sealed';
    if (h === 168) return '7 Days Sealed';
    if (h === 720) return '30 Days Sealed';
    if (h % 24 === 0) return `${h / 24} Days Sealed`;
    return `${h} Hours Sealed`;
  }, [configuredWaitingHours]);

  // Automatically prompt for verification if delivered letter requires OTP or passphrase
  useEffect(() => {
    if (isArrived && (verificationMethod === 'otp' || verificationMethod === 'passphrase') && !activeLetter?.content) {
      setShowVerificationPrompt(true);
    }
  }, [isArrived, verificationMethod, activeLetter?.content]);

  // Automatically unseal if delivered and open verification but content not yet loaded
  const unsealTriggeredRef = useRef(false);
  useEffect(() => {
    if (isArrived && verificationMethod === 'open' && !activeLetter?.content && !unsealTriggeredRef.current && !isVerifying && !verificationError) {
      unsealTriggeredRef.current = true;
      handleDirectUnseal();
    }
  }, [isArrived, verificationMethod, activeLetter?.content, isVerifying, verificationError, handleDirectUnseal]);

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

  if (isLoading || (!effectiveMeta && !activeLetter)) {
    return (
      <div className="min-h-screen bg-[#faf9f7] text-teal-900 flex flex-col justify-between p-4 sm:p-8 select-none">
        <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#eae4da]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0"
              aria-label="OLD-LETTERS"
            >
              <img
                src="/logo.png"
                alt="OLD-LETTERS"
                className="brand-logo-recipient h-8 sm:h-9 w-auto max-w-[170px] sm:max-w-[210px] object-contain block shrink-0"
              />
            </button>
            <span className="text-stone-300">·</span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-stone-500">
              POSTAL REGISTRY
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

        <main className="max-w-md mx-auto my-auto py-16 text-center space-y-6 animate-fade-in w-full">
          <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 p-3.5 flex items-center justify-center border border-stone-200 animate-pulse">
            <img src="/favicon.png" alt="OLD-LETTERS" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-stone-500 block">
              CENTRAL POSTAL BUREAU
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-teal-950 font-light">
              Examining Postal Registry...
            </h1>
            <p className="font-serif italic text-stone-600 text-sm leading-relaxed max-w-sm mx-auto">
              Locating dispatch records and verifying wax seal integrity.
            </p>
          </div>
        </main>

        <footer className="max-w-4xl mx-auto w-full py-4 text-center text-xs font-mono text-stone-400 border-t border-[#eae4da]">
          OLD-LETTERS ARCHIVAL REGISTRY
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-teal-900 flex flex-col justify-between p-4 sm:p-8 select-none relative overflow-x-hidden">
      {/* Minimal Top Bar with Official Horizontal Logo */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#eae4da]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-90 bg-transparent border-0 p-0 focus:outline-none"
            aria-label="OLD-LETTERS"
          >
            <img
              src="/logo.png"
              alt="OLD-LETTERS"
              width={210}
              height={70}
              style={{
                maxHeight: '36px',
                maxWidth: '210px',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
              className="brand-logo-recipient h-8 sm:h-9 w-auto max-w-[170px] sm:max-w-[210px] object-contain block shrink-0"
            />
          </button>
          <span className="text-stone-300">·</span>
          <span className="text-[11px] font-mono tracking-widest uppercase text-stone-500">
            {effectiveMeta?.status === 'NOT_FOUND' ? 'POSTAL REGISTRY' : (isSealedInTransit ? 'IN TRANSIT' : 'PRIVATE ARRIVAL')}
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
      {effectiveMeta?.status === 'NOT_FOUND' ? (
        <main className="max-w-md mx-auto my-auto py-16 text-center space-y-6 animate-fade-in w-full">
          <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 p-3.5 flex items-center justify-center border border-stone-200">
            <img src="/favicon.png" alt="OLD-LETTERS" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl text-teal-950 font-light">
              Correspondence Not Found
            </h1>
            <p className="font-serif italic text-stone-600 text-sm leading-relaxed">
              {(effectiveMeta as any).errorNotice || 'The requested correspondence could not be located in the postal registry. The delivery link may be expired, mistyped, or not yet dispatched.'}
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
              date={effectiveMeta?.deliveryDate ? new Date(effectiveMeta.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'In Transit'}
              sealColor={template.waxSealStyle?.color}
              sealEmblem={template.waxSealStyle?.emblem}
              isSealed={true}
              interactiveSeal={false}
              waitingHours={configuredWaitingHours}
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
                  {postalTempoLabel}
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
                    waitingHours={configuredWaitingHours}
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
                  waitingHours={configuredWaitingHours}
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
