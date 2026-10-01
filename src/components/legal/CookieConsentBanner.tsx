/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getStoredConsent,
  acceptAllCookies,
  rejectOptionalCookies,
  CookieConsentPreferences,
} from '../../lib/cookieConsent';

interface CookieConsentBannerProps {
  onOpenPreferences: () => void;
  onViewPolicy: () => void;
  onConsentSaved?: (prefs: CookieConsentPreferences) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onOpenPreferences,
  onViewPolicy,
  onConsentSaved,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only display if the user has not yet submitted their consent preference
    const existing = getStoredConsent();
    if (!existing) {
      // Gentle delayed entrance for smoother experience
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for consent updates dispatched anywhere in app
  useEffect(() => {
    const handleUpdate = () => {
      if (getStoredConsent()) {
        setIsVisible(false);
      }
    };
    window.addEventListener('oldletters_cookie_consent_updated', handleUpdate);
    return () => window.removeEventListener('oldletters_cookie_consent_updated', handleUpdate);
  }, []);

  const handleAcceptAll = () => {
    const prefs = acceptAllCookies();
    setIsVisible(false);
    onConsentSaved?.(prefs);
  };

  const handleRejectOptional = () => {
    const prefs = rejectOptionalCookies();
    setIsVisible(false);
    onConsentSaved?.(prefs);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-5 pointer-events-none font-serif text-[#141618]"
        aria-label="Cookie consent notice"
      >
        <div className="max-w-5xl mx-auto pointer-events-auto bg-[#faf9f7] rounded-sm sm:rounded-md border border-[#eae4da] shadow-[0_-8px_30px_rgba(20,22,24,0.08),0_2px_8px_rgba(20,22,24,0.04)] p-4 sm:p-6 transition-all">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            {/* Visual seal & descriptive text */}
            <div className="flex items-start gap-3.5 sm:gap-4 flex-1">
              <div
                className="w-10 h-10 shrink-0 rounded-full border border-teal-900/20 bg-amber-50/80 flex items-center justify-center text-teal-950 shadow-2xs mt-0.5"
                aria-hidden="true"
              >
                <span className="font-serif text-sm font-semibold tracking-wider">❦</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-base sm:text-lg text-teal-950 font-medium tracking-tight">
                    Your privacy matters.
                  </h3>
                  <span className="text-[10px] font-mono tracking-widest uppercase bg-stone-100 text-stone-600 border border-stone-200/80 px-2 py-0.5 rounded-2xs">
                    Postal Conservancy Notice
                  </span>
                </div>

                <p className="font-sans text-xs sm:text-sm text-stone-700 font-light leading-relaxed max-w-3xl">
                  OLD-LETTERS uses essential cookies to keep your correspondence account and sessions secure.
                  Optional cookies are only used when you choose to allow them.{' '}
                  <button
                    type="button"
                    onClick={onViewPolicy}
                    className="text-teal-900 hover:text-teal-950 underline underline-offset-2 font-medium cursor-pointer"
                  >
                    Read our Cookie Policy
                  </button>
                  .
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center flex-wrap sm:flex-nowrap gap-2.5 w-full lg:w-auto shrink-0 justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-[#eae4da]/60">
              <button
                type="button"
                onClick={onOpenPreferences}
                className="text-xs font-sans text-stone-600 hover:text-stone-900 px-3 py-2 uppercase tracking-wider transition-colors cursor-pointer text-left sm:text-center underline sm:no-underline hover:underline"
              >
                Manage Preferences
              </button>

              <button
                type="button"
                onClick={handleRejectOptional}
                className="px-4 py-2.5 rounded-xs border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs font-sans uppercase tracking-wider transition-colors shadow-2xs cursor-pointer flex-1 sm:flex-none"
              >
                Reject Optional
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2.5 rounded-xs bg-teal-900 text-white hover:bg-teal-800 text-xs font-sans uppercase tracking-wider font-medium shadow-xs transition-colors cursor-pointer flex-1 sm:flex-none"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
