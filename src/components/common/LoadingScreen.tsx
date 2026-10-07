'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onComplete?: () => void;
  durationMs?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  durationMs = 3000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setIsVisible(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, dismiss]);

  const handleExitComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && (
        <motion.div
          key="app-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#faf9f7] text-[#134e4a] select-none overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(19, 78, 74, 0.03) 0%, transparent 70%)',
          }}
        >
          {/* Subtle perimeter deckle frame */}
          <div className="absolute inset-4 sm:inset-8 border border-[#eae4da] pointer-events-none rounded-xs opacity-75" />
          <div className="absolute inset-5 sm:inset-9 border border-[#eae4da]/50 pointer-events-none rounded-xs" />

          {/* Top Seal Stamp */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-8 h-8 rounded-full bg-[#134e4a] p-1 flex items-center justify-center shadow-md">
              <img src="/favicon.png" alt="OLD-LETTERS" className="w-5 h-5 object-contain" />
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] uppercase text-[#134e4a]/70">
              POSTAL VAULT & CORRESPONDENCE
            </span>
          </motion.div>

          {/* Official Horizontal Brand Logo with responsive constraint */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="flex items-center justify-center w-full max-w-full px-4 sm:px-6 my-2 sm:my-4"
          >
            <div
              className="flex items-center justify-center max-w-full"
              style={{
                width: 'min(85vw, 900px)',
                maxWidth: '100%',
              }}
            >
              <img
                src="/logo.png"
                alt="OLD-LETTERS"
                width={900}
                height={300}
                style={{
                  width: 'min(85vw, 900px)',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: 'min(24vh, 220px)',
                  objectFit: 'contain',
                  display: 'block',
                }}
                className="brand-logo-loading max-w-full object-contain block drop-shadow-xs"
              />
            </div>
          </motion.div>

          {/* Bottom Cadence Label & Progress Line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 flex flex-col items-center gap-3"
          >
            <div className="text-xs sm:text-sm font-serif italic text-[#134e4a]/80">
              Restoring the ceremony of slow correspondence
            </div>

            {/* Timed Hairline Progress Bar */}
            <div className="w-48 sm:w-64 h-[1.5px] bg-[#134e4a]/10 overflow-hidden rounded-full mt-2">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: durationMs / 1000, ease: 'linear' }}
                className="h-full bg-[#134e4a]"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
