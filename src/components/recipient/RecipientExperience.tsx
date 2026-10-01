import React, { useState } from 'react';
import { Letter } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';
import { EnvelopeObject } from '../common/EnvelopeObject';
import { PaperSheet } from '../common/PaperSheet';
import { requestOtp, verifyRecipientAccess } from '../../lib/api';

interface RecipientExperienceProps {
  letter: Letter;
  deliveryToken?: string;
  onExit: () => void;
  onReply?: (recipientLetter: Letter) => void;
}

export const RecipientExperience: React.FC<RecipientExperienceProps> = ({
  letter: initialLetter,
  deliveryToken,
  onExit,
  onReply,
}) => {
  const [activeLetter, setActiveLetter] = useState<Letter>(initialLetter);
  const [stage, setStage] = useState<'sealed' | 'unsealing' | 'reading' | 'reveal' | 'parlour'>('sealed');

  // Verification states
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [enteredPassphrase, setEnteredPassphrase] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const template = TEMPLATES.find((t) => t.id === activeLetter.templateId) || TEMPLATES[0];

  const handleOpenEnvelope = () => {
    // If protected by passphrase or OTP, require verification first
    if (activeLetter.verificationMethod === 'passphrase' || activeLetter.verificationMethod === 'otp') {
      setShowVerificationPrompt(true);
      return;
    }

    // Direct unseal
    setStage('unsealing');
    setTimeout(() => {
      setStage('reading');
    }, 850);
  };

  const handleRequestOtp = async () => {
    try {
      setIsRequestingOtp(true);
      setVerificationError(null);
      const token = deliveryToken || activeLetter.trackingCode;
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
      const token = deliveryToken || activeLetter.trackingCode;

      if (activeLetter.verificationMethod === 'otp') {
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
      } else if (activeLetter.verificationMethod === 'passphrase') {
        if (!enteredPassphrase.trim()) {
          throw new Error('Please enter the secret cipher.');
        }

        // Try server verification or fallback match
        try {
          const verifiedLetter = await verifyRecipientAccess({
            token,
            verificationMethod: 'passphrase',
            passphrase: enteredPassphrase.trim(),
          });
          setActiveLetter(verifiedLetter);
        } catch {
          // Check local passphrase if already present
          if (
            activeLetter.passphrase &&
            enteredPassphrase.trim().toLowerCase() === activeLetter.passphrase.trim().toLowerCase()
          ) {
            // Match confirmed
          } else {
            throw new Error('Incorrect cipher passphrase.');
          }
        }

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
      {/* Minimal Top Bar (Light theme) */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#eae4da]">
        <div className="flex items-center gap-3">
          <span className="text-lg tracking-[0.14em] text-teal-900" style={{ fontFamily: 'sans-serif' }}>OLD-LETTERS</span>
          <span className="text-stone-300">·</span>
          <span className="text-[11px] font-mono tracking-widest uppercase text-stone-500">
            PRIVATE ARRIVAL
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

      {/* STAGE 1: SEALED ENVELOPE IN 3D PERSPECTIVE */}
      {stage === 'sealed' && (
        <main className="max-w-2xl mx-auto my-auto py-16 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in w-full perspective-1500">
          <div className="space-y-3">
            <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
              DISPATCH REF: {activeLetter.trackingCode}
            </span>
            <h1 className="font-serif text-4xl sm:text-6xl text-teal-900 font-light">
              A letter has arrived.
            </h1>
            <p className="text-stone-600 font-serif italic text-lg sm:text-xl">
              From {activeLetter.senderName} · For {activeLetter.recipientName}
            </p>
          </div>

          {/* Verification prompt (OTP or Passphrase) */}
          {showVerificationPrompt ? (
            <form
              onSubmit={handleVerify}
              className="p-6 bg-white border border-stone-300 rounded-xs max-w-sm w-full space-y-4 shadow-paper-md text-left"
            >
              <div className="text-xs font-mono text-stone-800 uppercase font-semibold text-center">
                {activeLetter.verificationMethod === 'otp' ? 'GMAIL OTP VERIFICATION' : 'ENTER SECRET CIPHER'}
              </div>

              <p className="text-xs text-stone-600 font-serif text-center">
                {activeLetter.verificationMethod === 'otp'
                  ? `A 6-digit code will be sent to ${activeLetter.recipientEmail || 'your email'} to verify your identity.`
                  : `${activeLetter.senderName} protected this letter with a private cipher.`}
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

              {activeLetter.verificationMethod === 'otp' ? (
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
                  disabled={isVerifying || (activeLetter.verificationMethod === 'otp' && !enteredOtp)}
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
                templateId={activeLetter.templateId}
                recipientName={activeLetter.recipientName}
                senderName={activeLetter.senderName}
                date={activeLetter.letterDate}
                sealColor={template.waxSealStyle?.color}
                sealEmblem={template.waxSealStyle?.emblem}
                isSealed={true}
                interactiveSeal={true}
                onSealClick={handleOpenEnvelope}
              />
            </div>
          )}

          {!showVerificationPrompt && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenEnvelope}
                className="px-8 py-3.5 bg-teal-900 hover:bg-teal-800 text-white font-sans font-medium text-xs tracking-[0.2em] uppercase rounded-xs transition-colors cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
              >
                BREAK SEAL & UNVEIL LETTER →
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
              templateId={activeLetter.templateId}
              recipientName={activeLetter.recipientName}
              senderName={activeLetter.senderName}
              date={activeLetter.letterDate}
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

      {/* STAGE 3: READING THE PARCHMENT */}
      {stage === 'reading' && (
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
      {stage === 'reveal' && (
        <main className="max-w-xl mx-auto my-auto py-20 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
          <div className="text-[11px] font-mono tracking-[0.3em] uppercase text-stone-500">
            A FINAL NOTE
          </div>

          <h2 className="font-serif text-4xl sm:text-6xl text-teal-900 font-light">
            There is one more thing.
          </h2>

          <div className="font-serif italic text-2xl sm:text-3xl text-teal-900 leading-relaxed">
            "Someone is waiting for you."
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
      {stage === 'parlour' && (
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

      {/* Bottom Minimal Footer */}
      <footer className="max-w-4xl mx-auto w-full flex items-center justify-between text-[10px] font-mono text-stone-400 py-3 border-t border-[#eae4da]">
        <span>OLD-LETTERS CORRESPONDENCE</span>
        <span>SEAL VERIFIED</span>
      </footer>
    </div>
  );
};

export default RecipientExperience;
