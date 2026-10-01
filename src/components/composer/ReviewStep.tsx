import React from 'react';
import { Letter } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';
import { EnvelopeObject } from '../common/EnvelopeObject';

interface ReviewStepProps {
  draft: Letter;
  onPostLetter: () => void;
  onEditSection: (step: 'type' | 'template' | 'write' | 'recipient' | 'delivery') => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  draft,
  onPostLetter,
  onEditSection,
}) => {
  const template = TEMPLATES.find((t) => t.id === draft.templateId) || TEMPLATES[0];

  const arrivalDate = draft.scheduledDeliveryAt
    ? new Date(draft.scheduledDeliveryAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'October 1, 2026';

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-mono text-[#dec183] mb-1">
            STEP 06 OF 06 · FINAL REVIEW
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-stone-100 font-light">
            Review Your Correspondence
          </h2>
        </div>
        <div className="text-xs font-mono text-stone-500">
          READY FOR THE POSTAL SEAL
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Correspondence Dispatch Ledger (Editorial metadata list) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 bg-stone-900/40 border border-stone-800 rounded-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="text-xs font-mono text-[#c5a059] uppercase tracking-wider">
                CORRESPONDENCE MANIFEST
              </span>
              <span className="text-xs font-mono text-stone-500">REF: {draft.trackingCode}</span>
            </div>

            {/* From */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono text-stone-500 uppercase block">FROM</span>
                <span className="font-serif text-lg text-stone-200">{draft.senderName}</span>
                <span className="text-xs text-stone-400 block">{draft.senderEmail}</span>
              </div>
              <button
                type="button"
                onClick={() => onEditSection('recipient')}
                className="text-xs text-[#dec183] hover:underline cursor-pointer font-mono"
              >
                Edit
              </button>
            </div>

            {/* To */}
            <div className="flex items-start justify-between border-t border-stone-800/60 pt-4">
              <div>
                <span className="text-[11px] font-mono text-stone-500 uppercase block">TO</span>
                <span className="font-serif text-lg text-stone-200">{draft.recipientName}</span>
                <span className="text-xs text-stone-400 block">{draft.recipientEmail}</span>
              </div>
              <button
                type="button"
                onClick={() => onEditSection('recipient')}
                className="text-xs text-[#dec183] hover:underline cursor-pointer font-mono"
              >
                Edit
              </button>
            </div>

            {/* Type & Template */}
            <div className="flex items-start justify-between border-t border-stone-800/60 pt-4">
              <div>
                <span className="text-[11px] font-mono text-stone-500 uppercase block">
                  LETTER TYPE & TEMPLATE
                </span>
                <span className="font-serif text-base text-stone-200">
                  {draft.type} Letter · {template.name}
                </span>
                <span className="text-xs text-stone-400 block">{template.tagline}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEditSection('type')}
                  className="text-xs text-[#dec183] hover:underline cursor-pointer font-mono"
                >
                  Type
                </button>
                <span className="text-stone-600">·</span>
                <button
                  type="button"
                  onClick={() => onEditSection('template')}
                  className="text-xs text-[#dec183] hover:underline cursor-pointer font-mono"
                >
                  Paper
                </button>
              </div>
            </div>

            {/* Arrival */}
            <div className="flex items-start justify-between border-t border-stone-800/60 pt-4">
              <div>
                <span className="text-[11px] font-mono text-stone-500 uppercase block">
                  SCHEDULED ARRIVAL
                </span>
                <span className="font-serif text-lg text-[#dec183]">{arrivalDate}</span>
                <span className="text-xs text-stone-400 block font-mono">
                  {draft.waitingHours} hours of intentional waiting
                </span>
              </div>
              <button
                type="button"
                onClick={() => onEditSection('delivery')}
                className="text-xs text-[#dec183] hover:underline cursor-pointer font-mono"
              >
                Edit
              </button>
            </div>

            {/* Attachments */}
            <div className="flex items-start justify-between border-t border-stone-800/60 pt-4">
              <div>
                <span className="text-[11px] font-mono text-stone-500 uppercase block">
                  ATTACHMENTS
                </span>
                <span className="text-xs text-stone-300">
                  {draft.attachments.length > 0
                    ? `${draft.attachments.length} Archival Photograph(s) enclosed`
                    : 'None enclosed (Prose only)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onEditSection('write')}
                className="text-xs text-[#dec183] hover:underline cursor-pointer font-mono"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xs text-xs font-mono text-stone-400 space-y-1">
            <div className="flex items-center gap-2 text-[#dec183]">
              <span>✦</span>
              <span className="uppercase">CEREMONY NOTICE</span>
            </div>
            <p className="font-serif italic text-stone-300">
              Upon posting, your words will be inscribed onto parchment, folded into thirds, and sealed in wax. The envelope will travel to our postal vault until the appointed arrival day.
            </p>
          </div>
        </div>

        {/* Right Column: Folded Envelope Preview & Post CTA */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-8 bg-[#121618] border border-stone-800 rounded-xs flex flex-col items-center justify-center space-y-6">
            <div className="w-full text-center">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-widest">
                SEALED ENVELOPE SPECIMEN
              </span>
            </div>

            <div className="transform scale-95 sm:scale-100 transition-transform">
              <EnvelopeObject
                templateId={draft.templateId}
                recipientName={draft.recipientName}
                senderName={draft.senderName}
                date={draft.letterDate}
                isSealed={true}
                isOpen={false}
                size="md"
              />
            </div>

            <div className="text-center font-serif italic text-stone-400 text-sm">
              Ready to be impressed with the {template.name} wax seal ({template.waxSealStyle?.emblem || '✒'}).
            </div>
          </div>

          {/* Primary Action Button: POST LETTER */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={onPostLetter}
              className="w-full py-4 bg-[#c5a059] hover:bg-[#dec183] text-stone-950 font-sans font-medium text-sm tracking-[0.15em] uppercase rounded-sm transition-all duration-300 shadow-xl cursor-pointer text-center group"
            >
              POST LETTER →
            </button>
            <div className="text-center text-xs font-mono text-stone-500">
              FREE COMPLIMENTARY EXPEDITION · NO PAYMENT REQUIRED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
