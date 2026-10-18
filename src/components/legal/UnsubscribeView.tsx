import React, { useState, useEffect } from 'react';
import { unsubscribeFromNewsletter, subscribeToNewsletter } from '../../lib/api';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

interface UnsubscribeViewProps {
  initialEmail?: string;
  initialToken?: string;
  initialStatus?: string;
  initialMessage?: string;
  onBack: () => void;
}

export const UnsubscribeView: React.FC<UnsubscribeViewProps> = ({
  initialEmail = '',
  initialToken = '',
  initialStatus = '',
  initialMessage = '',
  onBack,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(initialStatus === 'success');
  const [errorNotice, setErrorNotice] = useState<string | null>(
    initialStatus === 'error' ? (initialMessage || 'Failed to process unsubscribe request.') : null
  );
  const [resubscribing, setResubscribing] = useState(false);
  const [resubscribed, setResubscribed] = useState(false);

  // If token and email were passed and not already completed, process unsubscribe
  useEffect(() => {
    if (initialToken && initialEmail && !unsubscribed && !errorNotice) {
      setLoading(true);
      unsubscribeFromNewsletter(initialEmail, initialToken)
        .then((res) => {
          if (res.success) {
            setUnsubscribed(true);
          } else {
            setErrorNotice(res.message || 'Unable to complete unsubscription.');
          }
        })
        .catch((err) => {
          setErrorNotice(err?.message || 'Unable to process unsubscribe request. Please verify your link.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [initialEmail, initialToken]);

  const handleManualUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !token.trim()) {
      setErrorNotice('Please provide both your email address and unsubscribe token.');
      return;
    }
    setLoading(true);
    setErrorNotice(null);
    try {
      const res = await unsubscribeFromNewsletter(email.trim(), token.trim());
      if (res.success) {
        setUnsubscribed(true);
      } else {
        setErrorNotice(res.message || 'Unable to complete unsubscription.');
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Invalid or expired unsubscribe link. Please verify your token.');
    } finally {
      setLoading(false);
    }
  };

  const handleResubscribe = async () => {
    if (!email.trim()) return;
    setResubscribing(true);
    setErrorNotice(null);
    try {
      const res = await subscribeToNewsletter(email.trim(), true);
      setResubscribed(true);
      setUnsubscribed(false);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Unable to resubscribe at this time.');
    } finally {
      setResubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#141618] font-serif py-12 px-6 sm:px-12">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Bureau Header */}
        <div className="border-b border-[#eae4da] pb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-stone-500 mb-1">
              CENTRAL CORRESPONDENCE BUREAU · DISPATCH REGISTRY
            </div>
            <h1 className="text-3xl sm:text-4xl text-teal-950 font-normal tracking-tight">
              Subscription Management
            </h1>
            <div className="text-xs font-mono text-stone-400 mt-1">
              Postal Dispatches &amp; Epistolary Gazette Preferences
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-xs font-sans uppercase tracking-wider text-teal-900 border border-teal-900/30 hover:border-teal-900 px-4 py-2 rounded-xs bg-white hover:bg-stone-50 transition-colors cursor-pointer"
          >
            ← Return to Home
          </button>
        </div>

        {/* State 1: Loading */}
        {loading && (
          <div className="p-8 bg-white border border-[#eae4da] shadow-xs text-center space-y-4">
            <Loader2 className="size-6 text-teal-900 animate-spin mx-auto" />
            <p className="text-sm font-sans text-stone-600">
              Updating your correspondence preferences in the Central Registry...
            </p>
          </div>
        )}

        {/* State 2: Successfully Unsubscribed */}
        {!loading && unsubscribed && (
          <div className="p-8 bg-white border border-[#eae4da] shadow-xs space-y-6">
            <div className="flex items-center gap-3 text-emerald-900 bg-emerald-50 border border-emerald-200 p-4 rounded-xs">
              <Check className="size-5 text-emerald-700 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold font-sans">You have been successfully unsubscribed</h2>
                <p className="text-xs font-sans text-emerald-800 mt-0.5">
                  {email ? (
                    <>Address <code className="font-mono bg-emerald-100/60 px-1 py-0.5">{email}</code> has been removed from all dispatch mailings.</>
                  ) : (
                    'Your email address has been removed from all dispatch mailings.'
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-stone-600 leading-relaxed font-sans">
              <p>
                <strong>What this means:</strong> You will no longer receive seasonal stationery updates, epistolary essays, or marketing dispatches.
              </p>
              <p className="text-xs text-stone-500">
                <em>Note:</em> Essential transactional communications regarding letters you personally write, schedule, or receive (such as arrival notifications or recipient verification PINs) will continue to function normally.
              </p>
            </div>

            <div className="pt-4 border-t border-stone-200 flex items-center justify-between flex-wrap gap-4">
              <button
                type="button"
                onClick={onBack}
                className="bg-teal-900 hover:bg-teal-800 text-white font-sans text-xs uppercase tracking-wider px-5 py-2.5 transition-colors cursor-pointer"
              >
                Return to OLD-LETTERS
              </button>

              <button
                type="button"
                onClick={handleResubscribe}
                disabled={resubscribing}
                className="text-stone-500 hover:text-stone-800 text-xs font-sans underline underline-offset-4 cursor-pointer disabled:opacity-50"
              >
                {resubscribing ? 'Restoring subscription...' : 'Unsubscribed by mistake? Click to re-subscribe'}
              </button>
            </div>
          </div>
        )}

        {/* State 3: Resubscribed confirmation */}
        {!loading && resubscribed && (
          <div className="p-8 bg-white border border-[#eae4da] shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-teal-900 bg-teal-50 border border-teal-200 p-4 rounded-xs">
              <Check className="size-5 text-teal-700 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold font-sans">Welcome Back</h2>
                <p className="text-xs font-sans text-teal-800 mt-0.5">
                  Your subscription to OLD-LETTERS dispatches has been restored.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="bg-teal-900 hover:bg-teal-800 text-white font-sans text-xs uppercase tracking-wider px-5 py-2.5 transition-colors cursor-pointer"
            >
              Return to OLD-LETTERS
            </button>
          </div>
        )}

        {/* State 4: Form (if opened without direct token or if error occurred) */}
        {!loading && !unsubscribed && !resubscribed && (
          <div className="p-8 bg-white border border-[#eae4da] shadow-xs space-y-6">
            <p className="text-sm text-stone-600 font-sans leading-relaxed">
              If you followed an unsubscribe link that could not be verified automatically, you may enter your email address and unsubscribe token below:
            </p>

            {errorNotice && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-sans rounded-xs"
              >
                <AlertCircle className="size-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{errorNotice}</span>
              </div>
            )}

            <form onSubmit={handleManualUnsubscribe} className="space-y-4">
              <div>
                <label htmlFor="unsub-email" className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Email Address
                </label>
                <input
                  id="unsub-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full border border-stone-300 p-2.5 text-sm font-sans focus:border-teal-900 focus:outline-none bg-stone-50"
                />
              </div>

              <div>
                <label htmlFor="unsub-token" className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Unsubscribe Security Token
                </label>
                <input
                  id="unsub-token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste security token from email link"
                  className="w-full border border-stone-300 p-2.5 text-sm font-mono focus:border-teal-900 focus:outline-none bg-stone-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-stone-800 hover:bg-stone-900 text-white font-sans text-xs uppercase tracking-wider px-6 py-2.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Confirm Unsubscribe
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  className="text-stone-500 hover:text-stone-800 text-xs font-sans"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Additional Privacy Note */}
        <div className="p-4 bg-[#f4efe6] border border-[#e3dacf] text-xs font-sans text-stone-600 leading-relaxed">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono text-teal-900 block mb-1">
            Privacy &amp; Data Protection Assurance
          </span>
          OLD-LETTERS respects your privacy. We never sell, rent, or distribute subscriber addresses to third parties or marketing brokers. You may review our full policy at any time.
        </div>
      </div>
    </div>
  );
};
