import React, { useState, useEffect } from 'react';
import { fetchPaymentConfig, submitUpiPayment } from '../../lib/api';
import { PaymentRecord } from '../../types/backend';

interface UpiPaymentModalProps {
  isOpen: boolean;
  featureCode: 'VOICE_NOTE' | 'VIDEO_NOTE' | 'LIVE_MEETING';
  letterId?: string;
  onClose: () => void;
  onPaymentSubmitted: (payment: PaymentRecord) => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  featureCode,
  letterId,
  onClose,
  onPaymentSubmitted,
}) => {
  const [config, setConfig] = useState<{ upiId: string; upiDisplayName: string; paymentQrUrl: string }>({
    upiId: 'oldletters@okhdfcbank',
    upiDisplayName: 'OLD-LETTERS CORRESPONDENCE',
    paymentQrUrl: '',
  });

  const [upiReference, setUpiReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedPayment, setSubmittedPayment] = useState<PaymentRecord | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    fetchPaymentConfig()
      .then(setConfig)
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const featureDetails = {
    VOICE_NOTE: { title: 'Voice Note Enclosure', price: 99, desc: 'Record or upload private archival audio to accompany your letter upon unsealing.' },
    VIDEO_NOTE: { title: 'Video Note Enclosure', price: 149, desc: 'Enclose a cinematic video note that unlocks for the recipient after reading.' },
    LIVE_MEETING: { title: 'The Post Office Parlour', price: 299, desc: 'Encrypted face-to-face rendezvous room triggered when the letter is opened.' },
  }[featureCode];

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(config.upiId).catch(() => {});
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiReference.trim()) {
      setErrorMessage('Please enter the 12-digit UPI transaction reference / UTR.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await submitUpiPayment({
        letterId,
        featureCode,
        amount: featureDetails.price,
        currency: 'INR',
        upiReference: upiReference.trim(),
      });

      setSubmittedPayment(res.payment);
      onPaymentSubmitted(res.payment);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white border border-[#eae4da] shadow-paper-lg rounded-xs overflow-hidden animate-fade-in">
        {/* Top Header */}
        <div className="bg-[#faf9f7] px-6 py-4 border-b border-[#eae4da] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-teal-900 font-serif text-lg">❦</span>
            <span className="text-xs font-mono tracking-widest uppercase text-stone-600">
              UPI DIGITAL ENCLOSURE
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-800 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {submittedPayment ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto text-xl font-serif">
                ⏳
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-widest uppercase text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-200 rounded-xs">
                  STATUS: PENDING VERIFICATION
                </span>
                <h3 className="font-serif text-2xl text-teal-900">Payment Submitted</h3>
                <p className="text-xs text-stone-600 font-sans leading-relaxed max-w-sm mx-auto">
                  Your UPI transaction reference (<strong>{submittedPayment.upiReference}</strong>) has been queued for review. Our correspondence officer will verify and unlock your {featureDetails.title}.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-teal-900 hover:bg-teal-800 text-white font-sans text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
                >
                  Return to Letter
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Product and Price */}
              <div className="flex items-center justify-between border-b border-[#eae4da] pb-4">
                <div>
                  <h3 className="font-serif text-xl text-teal-900">{featureDetails.title}</h3>
                  <p className="text-xs text-stone-500 font-serif italic">{featureDetails.desc}</p>
                </div>
                <div className="text-right">
                  <span className="font-serif text-2xl text-teal-900 font-light">₹{featureDetails.price}</span>
                  <span className="text-[10px] font-mono text-stone-400 block">INR</span>
                </div>
              </div>

              {/* UPI QR Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#faf9f7] border border-[#eae4da] rounded-xs space-y-3">
                <div className="w-44 h-44 bg-white border border-stone-200 p-2 rounded-xs flex items-center justify-center shadow-xs">
                  {/* Dynamic Scalable SVG QR Representation */}
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
                    <rect x="76" y="44" width="18" height="8" />
                    <rect x="44" y="76" width="20" height="18" />
                    <rect x="70" y="70" width="12" height="12" />
                    <rect x="88" y="86" width="10" height="10" />
                  </svg>
                </div>

                <div className="text-center space-y-1 w-full">
                  <div className="text-[10px] font-mono text-stone-500 uppercase">
                    Scan via PhonePe · Google Pay · Paytm · BHIM
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <code className="text-xs font-mono text-teal-950 font-semibold bg-white px-2 py-1 border border-stone-200 rounded-xs">
                      {config.upiId}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="text-[11px] font-mono text-teal-900 hover:text-teal-700 underline cursor-pointer"
                    >
                      {copiedUpi ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Ref Input Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-stone-600 uppercase">
                    UPI Transaction Ref / UTR No.
                  </label>
                  <input
                    type="text"
                    required
                    value={upiReference}
                    onChange={(e) => setUpiReference(e.target.value)}
                    placeholder="e.g. 427819034821 or TXN-9842"
                    className="w-full bg-[#faf9f7] border border-[#eae4da] focus:border-teal-900 focus:bg-white p-2.5 text-xs font-mono text-stone-900 outline-none rounded-xs transition-colors"
                  />
                  <span className="text-[10px] text-stone-400 block font-mono">
                    Shown in your UPI app payment receipt after transfer.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-teal-900 hover:bg-teal-800 disabled:bg-stone-300 text-white font-sans text-xs font-medium tracking-[0.15em] uppercase rounded-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Recording Reference...' : 'Submit Payment for Verification →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpiPaymentModal;
