import React, { useState } from 'react';
import { Letter } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';
import { EnvelopeObject } from '../common/EnvelopeObject';
import { PaperSheet } from '../common/PaperSheet';

interface RecipientExperienceProps {
  letter: Letter;
  onExit: () => void;
  onReply?: (recipientLetter: Letter) => void;
}

export const RecipientExperience: React.FC<RecipientExperienceProps> = ({
  letter,
  onExit,
  onReply,
}) => {
  const [stage, setStage] = useState<'sealed' | 'unsealing' | 'reading' | 'reveal' | 'parlour'>('sealed');
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [enteredPassphrase, setEnteredPassphrase] = useState('');
  const [passphraseError, setPassphraseError] = useState(false);

  const template = TEMPLATES.find((t) => t.id === letter.templateId) || TEMPLATES[0];

  const handleOpenEnvelope = () => {
    if (letter.verificationMethod === 'passphrase' && letter.passphrase && !showPassphraseInput) {
      setShowPassphraseInput(true);
      return;
    }

    setStage('unsealing');
    setTimeout(() => {
      setStage('reading');
    }, 850);
  };

  const handleVerifyPassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPassphrase.trim().toLowerCase() === letter.passphrase?.trim().toLowerCase()) {
      setShowPassphraseInput(false);
      setStage('unsealing');
      setTimeout(() => {
        setStage('reading');
      }, 850);
    } else {
      setPassphraseError(true);
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
              DISPATCH REF: {letter.trackingCode}
            </span>
            <h1 className="font-serif text-4xl sm:text-6xl text-teal-900 font-light">
              A letter has arrived.
            </h1>
            <p className="text-stone-600 font-serif italic text-lg sm:text-xl">
              From {letter.senderName} · For {letter.recipientName}
            </p>
          </div>

          {/* Passphrase prompt */}
          {showPassphraseInput ? (
            <form
              onSubmit={handleVerifyPassphrase}
              className="p-6 bg-white border border-stone-300 rounded-xs max-w-sm w-full space-y-4 shadow-paper-md"
            >
              <div className="text-xs font-mono text-stone-800 uppercase font-semibold">
                ENTER SECRET CIPHER
              </div>
              <p className="text-xs text-stone-600 font-serif">
                {letter.senderName} protected this letter with a private cipher.
              </p>
              <input
                type="text"
                autoFocus
                value={enteredPassphrase}
                onChange={(e) => {
                  setEnteredPassphrase(e.target.value);
                  setPassphraseError(false);
                }}
                placeholder="Passphrase"
                className="w-full bg-stone-50 border border-stone-300 px-3 py-2 text-stone-900 text-sm focus:outline-none focus:border-teal-900"
              />
              {passphraseError && (
                <div className="text-xs text-rose-600 font-mono">
                  Incorrect cipher. (Hint: {letter.passphrase})
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-900 text-white text-xs font-mono uppercase font-semibold cursor-pointer hover:bg-teal-800 active:scale-95"
                >
                  Unseal
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassphraseInput(false)}
                  className="px-3 py-2 border border-stone-300 text-stone-600 text-xs font-mono cursor-pointer"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 preserve-3d">
              <div
                className="cursor-pointer transform hover:scale-[1.02] transition-transform duration-500 shadow-paper-3d rounded-xs"
                style={{ transform: 'rotateY(-3deg) rotateX(2deg)' }}
                onClick={handleOpenEnvelope}
              >
                <EnvelopeObject
                  templateId={letter.templateId}
                  recipientName={letter.recipientName}
                  senderName={letter.senderName}
                  date={letter.letterDate}
                  isOpen={false}
                  isSealed={true}
                  interactiveSeal={true}
                  onSealClick={handleOpenEnvelope}
                  size="md"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleOpenEnvelope}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-teal-900 hover:bg-teal-800 text-white font-sans font-medium text-xs tracking-[0.16em] uppercase rounded-xs transition-colors cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
                >
                  <span>BREAK WAX SEAL & OPEN</span>
                  <span>❦</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-[11px] font-mono text-stone-400">
            {letter.waitingHours} HOURS OF TRANSIT · UNBROKEN PROTECTION
          </div>
        </main>
      )}

      {/* STAGE 2: UNSEALING */}
      {stage === 'unsealing' && (
        <main className="max-w-xl mx-auto my-auto py-20 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="font-serif text-2xl text-stone-800 italic animate-pulse">
            Breaking the seal and unfolding parchment...
          </div>
        </main>
      )}

      {/* STAGE 3: READING */}
      {stage === 'reading' && (
        <main className="max-w-3xl mx-auto my-auto py-10 w-full animate-fade-in space-y-12">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500 border-b border-[#eae4da] pb-3">
            <span>FROM: {letter.senderName.toUpperCase()}</span>
            <span>DATE: {letter.letterDate.toUpperCase()}</span>
          </div>

          {/* Full Screen Letter Paper Sheet with Realistic Depth */}
          <div className="w-full flex justify-center shadow-paper-lg">
            <PaperSheet
              templateId={letter.templateId}
              date={letter.letterDate}
              greeting={letter.greeting}
              content={letter.content}
              signoff={letter.signoff}
              senderName={letter.senderName}
              recipientName={letter.recipientName}
              attachments={letter.attachments}
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
            {letter.senderName} requested to be notified the moment you broke the seal.
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
                onClick={() => onReply(letter)}
                className="px-6 py-4 border border-stone-300 hover:border-teal-900 text-stone-800 hover:text-teal-900 font-sans text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
              >
                Write a Reply
              </button>
            )}
          </div>
        </main>
      )}

      {/* STAGE 5: POST OFFICE PARLOUR PLACEHOLDER */}
      {stage === 'parlour' && (
        <main className="max-w-lg mx-auto my-auto py-12 p-8 bg-white border border-[#eae4da] shadow-paper-md rounded-xs text-center space-y-6 animate-fade-in">
          <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
            THE PRIVATE PARLOUR
          </div>

          <h3 className="font-serif text-3xl text-teal-900 font-light">
            The Post Office opens soon.
          </h3>

          <p className="text-sm font-serif italic text-stone-600 leading-relaxed">
            In Phase 2, clicking "Meet Them" connects you and {letter.senderName} in an encrypted face-to-face video parlour the moment the letter is opened.
          </p>

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
