/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CookieConsentPreferences,
  getStoredConsent,
  saveConsent,
  acceptAllCookies,
  rejectOptionalCookies,
} from '../../lib/cookieConsent';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPolicy?: () => void;
  onSave?: (prefs: CookieConsentPreferences) => void;
}

export const CookiePreferencesModal: React.FC<CookiePreferencesModalProps> = ({
  isOpen,
  onClose,
  onViewPolicy,
  onSave,
}) => {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getStoredConsent();
      if (current) {
        setAnalytics(Boolean(current.analytics));
        setMarketing(Boolean(current.marketing));
      } else {
        setAnalytics(false);
        setMarketing(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const prefs = saveConsent({ analytics, marketing });
    onSave?.(prefs);
    onClose();
  };

  const handleAcceptAll = () => {
    const prefs = acceptAllCookies();
    setAnalytics(true);
    setMarketing(false);
    onSave?.(prefs);
    onClose();
  };

  const handleRejectOptional = () => {
    const prefs = rejectOptionalCookies();
    setAnalytics(false);
    setMarketing(false);
    onSave?.(prefs);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-[#faf9f7] rounded-sm sm:rounded-md shadow-2xl border border-[#eae4da] overflow-hidden font-serif text-[#141618]"
          role="dialog"
          aria-labelledby="cookie-preferences-title"
        >
          {/* Header */}
          <div className="px-6 py-5 sm:px-8 border-b border-[#eae4da] bg-[#fbfaf8] flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-stone-500 mb-1">
                CENTRAL POSTAL DESK · PRIVACY CONTROLS
              </div>
              <h2
                id="cookie-preferences-title"
                className="text-2xl sm:text-3xl text-teal-950 font-normal tracking-tight"
              >
                Cookie Preferences
              </h2>
              <p className="text-xs font-sans text-stone-600 mt-1 font-light">
                Tailor how cookies and session storage are utilized during your correspondence visits.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs uppercase tracking-widest font-sans text-stone-400 hover:text-stone-800 transition-colors p-1 cursor-pointer"
              aria-label="Close preferences modal"
            >
              Close [✕]
            </button>
          </div>

          {/* Preferences Body */}
          <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto font-sans text-sm">
            {/* Category 1: Essential Cookies */}
            <div className="p-4 sm:p-5 rounded-xs border border-[#eae4da] bg-white space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base text-teal-950 font-medium">
                    Essential Cookies
                  </h3>
                  <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-2xs font-semibold">
                    Always Active
                  </span>
                </div>
                <div className="text-xs font-mono text-stone-400 select-none">
                  Cannot be disabled
                </div>
              </div>

              <p className="text-xs font-sans text-stone-600 font-light leading-relaxed">
                Strictly required for OLD-LETTERS to function. The cryptographically signed{' '}
                <code className="bg-stone-100 text-stone-800 px-1 py-0.5 rounded font-mono text-[11px]">
                  oldletters_session
                </code>{' '}
                HTTP-only cookie is required for account authentication, maintaining your correspondence
                archive, protecting sealed letters, and securely submitting dispatches. It cannot be disabled.
              </p>
            </div>

            {/* Category 2: Analytics Cookies */}
            <div className="p-4 sm:p-5 rounded-xs border border-[#eae4da] bg-white space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base text-teal-950 font-medium">
                    Analytics Cookies
                  </h3>
                  <span className="text-[10px] font-mono uppercase bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-2xs">
                    Optional · Default Off
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-900"></div>
                </label>
              </div>

              <p className="text-xs font-sans text-stone-600 font-light leading-relaxed">
                Allows aggregate performance evaluation of postal tools and stationery rendering.
                <em> Note: OLD-LETTERS does not currently run third-party analytics or tracker scripts;
                enabling this only records your preference should privacy-conscious metrics be introduced.</em>
              </p>
            </div>

            {/* Category 3: Marketing Cookies */}
            <div className="p-4 sm:p-5 rounded-xs border border-[#eae4da] bg-white space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base text-teal-950 font-medium">
                    Marketing Cookies
                  </h3>
                  <span className="text-[10px] font-mono uppercase bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-2xs">
                    Optional · Default Off
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-900"></div>
                </label>
              </div>

              <p className="text-xs font-sans text-stone-600 font-light leading-relaxed">
                Used to deliver commercial advertisements or cross-site tracking. OLD-LETTERS operates on zero
                commercial advertisements, zero data brokering, and zero marketing campaigns. Kept disabled.
              </p>
            </div>

            {/* Informational Policy Link */}
            <div className="pt-1 flex items-center justify-between text-xs text-stone-500 font-sans">
              <span>Have questions about our cookie implementation?</span>
              {onViewPolicy && (
                <button
                  type="button"
                  onClick={() => {
                    onViewPolicy();
                    onClose();
                  }}
                  className="text-teal-900 font-medium hover:underline cursor-pointer"
                >
                  Read Cookie Policy →
                </button>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="px-6 py-4 sm:px-8 border-t border-[#eae4da] bg-[#fbfaf8] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRejectOptional}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xs border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs font-sans uppercase tracking-wider transition-colors cursor-pointer"
            >
              Reject Optional
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xs border border-teal-900/30 text-teal-900 bg-white hover:bg-stone-50 text-xs font-sans uppercase tracking-wider transition-colors cursor-pointer"
              >
                Accept All
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xs bg-teal-900 text-white hover:bg-teal-800 text-xs font-sans uppercase tracking-wider font-medium shadow-xs transition-colors cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
