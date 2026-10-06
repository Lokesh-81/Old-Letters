'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Signature } from '../ui/signature';

interface LoadingScreenProps {
  onComplete?: () => void;
  durationMs?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  durationMs = 3000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const minTimeElapsedRef = useRef(false);
  const signatureFinishedRef = useRef(false);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setIsVisible(false);
  }, []);

  useEffect(() => {
    // Timer for minimum duration
    const minTimer = setTimeout(() => {
      minTimeElapsedRef.current = true;
      if (signatureFinishedRef.current) {
        dismiss();
      }
    }, durationMs);

    // Fallback maximum safety timer to guarantee dismiss even if signature or fonts take too long
    const safetyTimer = setTimeout(() => {
      dismiss();
    }, durationMs + 1500);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(safetyTimer);
    };
  }, [durationMs, dismiss]);

  const handleSignatureComplete = useCallback(() => {
    signatureFinishedRef.current = true;
    if (minTimeElapsedRef.current) {
      dismiss();
    }
  }, [dismiss]);

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
            <span className="w-8 h-8 rounded-full bg-[#134e4a] text-white flex items-center justify-center font-serif text-sm shadow-md">
              ❦
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] uppercase text-[#134e4a]/70">
              POSTAL VAULT & CORRESPONDENCE
            </span>
          </motion.div>

          {/* Animated Handwritten Signature for "OLD-LETTERS" */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex items-center justify-center px-4"
          >
            <Signature
              text="OLD-LETTERS"
              color="#134e4a"
              fontSize={54}
              duration={0.65}
              delay={0.1}
              charDelay={0.085}
              onAnimationComplete={handleSignatureComplete}
              className="drop-shadow-xs"
            />
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
