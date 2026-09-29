import React, { useState, useEffect } from 'react';
import { Letter } from '../../types/letter';
import { EnvelopeObject } from '../common/EnvelopeObject';

interface PostingCeremonyProps {
  letter: Letter;
  deliveryToken?: string;
  onPreviewRecipient: (letter: Letter) => void;
  onViewArchive: () => void;
  onWriteAnother: () => void;
}

export const PostingCeremony: React.FC<PostingCeremonyProps> = ({
  letter,
  deliveryToken,
  onPreviewRecipient,
  onViewArchive,
  onWriteAnother,
}) => {
  const [phase, setPhase] = useState<'folding' | 'enveloping' | 'sealing' | 'departing' | 'complete'>('folding');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('enveloping'), 900);
    const t2 = setTimeout(() => setPhase('sealing'), 2000);
    const t3 = setTimeout(() => setPhase('departing'), 3400);
    const t4 = setTimeout(() => setPhase('complete'), 4600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const arrivalDateString = letter.scheduledDeliveryAt
    ? new Date(letter.scheduledDeliveryAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'October 1, 2026';

  const linkToken = deliveryToken || letter.trackingCode;
  const deliveryLink = `${window.location.origin}/letter/${linkToken}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(deliveryLink).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-16 px-6 max-w-4xl mx-auto w-full bg-[#faf9f7] text-teal-900">
      {phase !== 'complete' ? (
        <div className="w-full flex flex-col items-center justify-center space-y-12">
          {/* Subtle Stage Subtitle */}
          <div className="text-center space-y-2">
            <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
              CEREMONY OF POSTING
            </span>
            <div className="font-serif text-3xl text-teal-900">
              {phase === 'folding' && 'Folding parchment into thirds...'}
              {phase === 'enveloping' && 'Placing letter into envelope...'}
              {phase === 'sealing' && 'Impressing ceremonial wax seal...'}
              {phase === 'departing' && 'Entering the transit vault...'}
            </div>
          </div>

          {/* Envelope & Letter Physical 3D Stage */}
          <div className="relative w-80 h-56 sm:w-96 sm:h-64 flex items-center justify-center perspective-1000">
            {/* The folded paper sliding in */}
            {(phase === 'folding' || phase === 'enveloping') && (
              <div
                className={`absolute w-72 h-44 bg-white border border-[#ded5c6] p-5 shadow-paper-lg rounded-xs transition-all duration-700 ease-in-out z-10 ${
                  phase === 'folding'
                    ? 'scale-100 rotate-[-2deg] -translate-y-8'
                    : 'scale-75 translate-y-8 opacity-0'
                }`}
              >
                <div className="text-[9px] font-mono uppercase text-stone-400 mb-1">
                  CORRESPONDENCE · {letter.letterDate}
                </div>
                <div className="font-serif text-sm font-semibold text-stone-900">
                  {letter.greeting}
                </div>
                <div className="w-full h-1 bg-stone-100 my-2 rounded-full" />
                <div className="w-2/3 h-1 bg-stone-100 my-1 rounded-full" />
                <div className="text-right font-serif italic text-xs text-stone-600 mt-4">
                  {letter.signoff} {letter.senderName}
                </div>
              </div>
            )}

            {/* The Envelope Object with 3D elevation */}
            <div
              className={`transform transition-all duration-1000 ease-out ${
                phase === 'folding'
                  ? 'translate-y-8 scale-90 opacity-90'
                  : phase === 'enveloping'
                  ? 'translate-y-0 scale-95 opacity-100'
                  : phase === 'sealing'
                  ? 'scale-100 rotate-0 shadow-paper-3d'
                  : 'translate-y-[-140px] scale-75 opacity-0'
              }`}
            >
              <EnvelopeObject
                templateId={letter.templateId}
                recipientName={letter.recipientName}
                senderName={letter.senderName}
                date={letter.letterDate}
                isOpen={phase === 'folding' || phase === 'enveloping'}
                isSealed={phase === 'sealing' || phase === 'departing'}
                size="md"
              />
            </div>
          </div>

          {/* Minimalist dot indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${phase === 'folding' ? 'bg-teal-900' : 'bg-stone-300'}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${phase === 'enveloping' ? 'bg-teal-900' : 'bg-stone-300'}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${phase === 'sealing' ? 'bg-teal-900' : 'bg-stone-300'}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${phase === 'departing' ? 'bg-teal-900' : 'bg-stone-300'}`} />
          </div>
        </div>
      ) : (
        /* Final Clean Arrival Confirmation */
        <div className="w-full max-w-xl text-center space-y-8 animate-fade-in">
          <div className="space-y-3">
            <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
              DISPATCH CONFIRMED
            </span>
            <h2 className="font-serif text-5xl sm:text-6xl text-teal-900 font-light">
              Your letter is on its way.
            </h2>
            <p className="text-stone-600 font-serif text-lg">
              Addressed to {letter.recipientName} · Sealed until the appointed hour.
            </p>
          </div>

          <div className="p-8 bg-white border border-[#eae4da] shadow-paper-md rounded-xs space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 text-xs font-mono">
              <span className="text-stone-400">DISPATCH REF</span>
              <span className="text-stone-900 font-semibold">{letter.trackingCode}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-stone-500 uppercase block">
                EXPECTED ARRIVAL
              </span>
              <div className="font-serif text-2xl text-teal-900">{arrivalDateString}</div>
              <div className="text-xs text-stone-500 font-mono">
                {letter.waitingHours} hours of intentional waiting
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <div className="text-[10px] font-mono text-stone-500 uppercase mb-1">
                PRIVATE RECIPIENT ACCESS
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3 bg-stone-50 border border-stone-200 hover:border-stone-400 text-xs font-mono text-stone-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="truncate">{deliveryLink}</span>
                <span className="text-teal-900 font-medium shrink-0 ml-3">
                  {copiedLink ? 'Copied ✓' : 'Copy'}
                </span>
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onPreviewRecipient(letter)}
              className="w-full sm:w-auto px-7 py-3.5 bg-teal-900 hover:bg-teal-800 text-white font-sans font-medium text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
            >
              Preview Recipient Arrival →
            </button>
            <button
              type="button"
              onClick={onViewArchive}
              className="w-full sm:w-auto px-6 py-3.5 border border-stone-300 hover:border-teal-900 text-stone-700 hover:text-teal-900 font-sans text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
            >
              Correspondence Archive
            </button>
            <button
              type="button"
              onClick={onWriteAnother}
              className="w-full sm:w-auto px-5 py-3.5 text-stone-500 hover:text-teal-900 font-sans text-xs tracking-wider transition-colors cursor-pointer"
            >
              Write Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
