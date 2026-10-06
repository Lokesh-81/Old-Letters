import React from 'react';
import { OldLettersIcon } from './OldLettersIcon';

interface OldLettersHorizontalLogoProps {
  className?: string;
  height?: number | string;
  showTagline?: boolean;
}

/**
 * Official OLD-LETTERS Horizontal Brand Logo:
 * Matches the reference image containing:
 * - Illustrated circular O/door/leaf emblem
 * - "OLD-LETTERS" wordmark with botanical flourishes and ligatures
 * - Tagline "Some things are worth waiting for."
 */
export const OldLettersHorizontalLogo: React.FC<OldLettersHorizontalLogoProps> = ({
  className = '',
  height = 48,
  showTagline = true,
}) => {
  return (
    <div className={`inline-flex flex-col items-start select-none ${className}`}>
      {/* Upper row: Emblem + LD · LETTERS */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Emblem */}
        <div className="relative">
          <OldLettersIcon size={typeof height === 'number' ? height : 44} />
        </div>

        {/* Wordmark with bespoke brand styling */}
        <div className="flex items-baseline tracking-normal">
          <span
            className="font-serif text-2xl sm:text-3xl font-medium tracking-[0.04em] text-[#234238] leading-none"
            style={{
              fontFamily: "'Newsreader', 'Cormorant Garamond', Georgia, serif",
              letterSpacing: '0.04em',
            }}
          >
            <span className="relative inline-block">
              LD
              {/* Subtle botanical sprout accent on D */}
              <svg
                className="absolute -top-1 -right-1 w-3 h-3 text-[#3d5a4e] pointer-events-none"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5 15 C 6 8, 12 5, 18 4 C 15 10, 11 14, 5 15 Z" />
              </svg>
            </span>
            <span className="inline-block mx-1.5 sm:mx-2 text-sm sm:text-base text-[#234238]/60 align-middle">
              ·
            </span>
            <span className="relative inline-block">
              LETTERS
              {/* Sprouting leaf accent over double-T */}
              <svg
                className="absolute -top-1.5 left-6 w-3.5 h-3 text-[#3d5a4e] pointer-events-none"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 14 C 5 7, 13 4, 18 3 C 14 9, 9 13, 2 14 Z" />
              </svg>
              {/* Flourish sparkle at end of S swash */}
              <span className="inline-block text-[#d49b42] text-xs align-top -ml-0.5">
                ✦
              </span>
            </span>
          </span>
        </div>
      </div>

      {/* Tagline */}
      {showTagline && (
        <div
          className="text-[10px] sm:text-[11px] font-serif tracking-[0.24em] text-[#234238]/85 uppercase mt-1 pl-1"
          style={{
            fontFamily: "'Newsreader', 'Cormorant Garamond', Georgia, serif",
            letterSpacing: '0.22em',
          }}
        >
          Some things are worth waiting for.
        </div>
      )}
    </div>
  );
};

export default OldLettersHorizontalLogo;
