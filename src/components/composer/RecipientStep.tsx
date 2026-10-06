import React from 'react';

interface RecipientStepProps {
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  verificationMethod: 'open' | 'passphrase' | 'otp';
  passphrase?: string;
  onChange: (fields: {
    recipientName?: string;
    recipientEmail?: string;
    senderName?: string;
    senderEmail?: string;
    verificationMethod?: 'open' | 'passphrase' | 'otp';
    passphrase?: string;
  }) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const RecipientStep: React.FC<RecipientStepProps> = ({
  recipientName,
  recipientEmail,
  senderName,
  senderEmail,
  verificationMethod,
  passphrase = '',
  onChange,
  onContinue,
  onBack,
}) => {
  const isValid =
    recipientName.trim().length > 0 &&
    recipientEmail.trim().length > 0 &&
    senderName.trim().length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-mono text-[#dec183] mb-1">
            STEP 04 OF 06 · ADDRESSING
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-stone-100 font-light">
            Recipient & Security
          </h2>
        </div>
        <div className="text-xs font-mono text-stone-500">
          CONFIDENTIAL CORRESPONDENCE PROTOCOL
        </div>
      </div>

      <div className="space-y-8">
        {/* Recipient Details Block */}
        <div className="p-6 bg-stone-900/40 border border-stone-800 rounded-xs space-y-5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#c5a059] uppercase tracking-wider">
            <span>TO · RECIPIENT DISPATCH ADDRESS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-stone-400 mb-1.5 uppercase">
                Recipient Full Name *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => onChange({ recipientName: e.target.value })}
                placeholder="Recipient Name"
                className="w-full bg-stone-950 border border-stone-700 focus:border-[#c5a059] px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-stone-400 mb-1.5 uppercase">
                Recipient Email Address *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => onChange({ recipientEmail: e.target.value })}
                placeholder="Recipient Email"
                className="w-full bg-stone-950 border border-stone-700 focus:border-[#c5a059] px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none transition-colors"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                The notification will be delivered when the waiting period completes.
              </span>
            </div>
          </div>
        </div>

        {/* Sender Return Line Block */}
        <div className="p-6 bg-stone-900/40 border border-stone-800 rounded-xs space-y-5">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400 uppercase tracking-wider">
            <span>FROM · SENDER RETURN LINE</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-stone-400 mb-1.5 uppercase">
                Your Name *
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => onChange({ senderName: e.target.value })}
                placeholder="Your Name"
                className="w-full bg-stone-950 border border-stone-700 focus:border-[#c5a059] px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-stone-400 mb-1.5 uppercase">
                Your Email Address
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => onChange({ senderEmail: e.target.value })}
                placeholder="Your Email"
                className="w-full bg-stone-950 border border-stone-700 focus:border-[#c5a059] px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Verification Method Section (Explicit Phase 1 state placeholder) */}
        <div className="p-6 bg-stone-900/40 border border-stone-800 rounded-xs space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#dec183] uppercase tracking-wider">
              VERIFICATION UPON ARRIVAL
            </span>
            <span className="text-[11px] font-mono text-stone-500">
              PHASE 1 STATE PROTOCOL
            </span>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed font-serif italic">
            Choose how your recipient confirms identity before the digital seal breaks.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Direct Open */}
            <button
              type="button"
              onClick={() => onChange({ verificationMethod: 'open' })}
              className={`p-4 text-left border rounded-xs transition-colors cursor-pointer ${
                verificationMethod === 'open'
                  ? 'bg-stone-900 border-[#c5a059] text-stone-100'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="text-xs font-mono mb-1 text-[#dec183]">DIRECT OPEN</div>
              <div className="font-serif text-sm text-stone-200">Seal Only</div>
              <div className="text-[11px] text-stone-400 mt-1">
                Recipient unseals directly via their private delivery link.
              </div>
            </button>

            {/* Secret Passphrase */}
            <button
              type="button"
              onClick={() => onChange({ verificationMethod: 'passphrase' })}
              className={`p-4 text-left border rounded-xs transition-colors cursor-pointer ${
                verificationMethod === 'passphrase'
                  ? 'bg-stone-900 border-[#c5a059] text-stone-100'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="text-xs font-mono mb-1 text-[#dec183]">SECRET CIPHER</div>
              <div className="font-serif text-sm text-stone-200">Passphrase</div>
              <div className="text-[11px] text-stone-400 mt-1">
                A shared private phrase known only to you two.
              </div>
            </button>

            {/* Gmail OTP (Prepared for Phase 2 backend) */}
            <button
              type="button"
              onClick={() => onChange({ verificationMethod: 'otp' })}
              className={`p-4 text-left border rounded-xs transition-colors cursor-pointer relative ${
                verificationMethod === 'otp'
                  ? 'bg-stone-900 border-[#c5a059] text-stone-100'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <span className="absolute top-2 right-2 text-[9px] font-mono text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded-xs">
                PHASE 2 READY
              </span>
              <div className="text-xs font-mono mb-1 text-[#dec183]">GMAIL OTP</div>
              <div className="font-serif text-sm text-stone-200">One-Time Code</div>
              <div className="text-[11px] text-stone-400 mt-1">
                6-digit code dispatched to recipient's inbox.
              </div>
            </button>
          </div>

          {/* Conditional Passphrase Input */}
          {verificationMethod === 'passphrase' && (
            <div className="pt-2">
              <label className="block text-xs font-mono text-stone-400 mb-1.5 uppercase">
                Set Secret Passphrase
              </label>
              <input
                type="text"
                value={passphrase}
                onChange={(e) => onChange({ passphrase: e.target.value })}
                placeholder="e.g. Florence1984 or RiverSteps"
                className="w-full bg-stone-950 border border-stone-700 focus:border-[#c5a059] px-3.5 py-2.5 text-stone-100 text-sm focus:outline-none"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                The recipient must whisper this passphrase to open the envelope.
              </span>
            </div>
          )}

          {verificationMethod === 'otp' && (
            <div className="p-3 bg-stone-950/80 border border-stone-800 text-xs text-stone-400 rounded-xs flex items-center gap-2">
              <span className="text-amber-400 font-mono">ℹ</span>
              <span>
                Gmail OTP verification interface configured. In Phase 2, Google OAuth & live mail delivery will issue the active token.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-stone-800">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 border border-stone-700 text-stone-300 hover:text-stone-100 text-xs font-sans rounded-sm transition-colors cursor-pointer"
        >
          ← Back to Letter
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={!isValid}
          className={`px-7 py-3 font-sans font-medium text-xs tracking-wider rounded-sm transition-all duration-200 cursor-pointer shadow-md ${
            isValid
              ? 'bg-[#c5a059] hover:bg-[#dec183] text-stone-950'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          Choose Delivery Date →
        </button>
      </div>
    </div>
  );
};
