import React from 'react';

interface OldLettersIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Official OLD-LETTERS circular O emblem:
 * Features the botanical crescent O, inward-opening arched doorway,
 * radiant warm star inside, and blooming wildflower branch.
 */
export const OldLettersIcon: React.FC<OldLettersIconProps> = ({
  className = '',
  size = 40,
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="OLD-LETTERS Emblem"
    >
      {/* Outer botanical crescent O */}
      <path
        d="M 50 4 C 75.4 4 96 24.6 96 50 C 96 75.4 75.4 96 50 96 C 24.6 96 4 75.4 4 50 C 4 24.6 24.6 4 50 4 Z"
        fill="#234238"
      />
      {/* Soft inner watercolor glow behind doorway */}
      <ellipse cx="50" cy="50" rx="34" ry="38" fill="#e8ebe4" />

      {/* Arched doorway opening inward */}
      {/* Doorway frame background / depth */}
      <path
        d="M 32 82 L 32 40 C 32 28 40 20 50 20 C 60 20 68 28 68 40 L 68 82 Z"
        fill="#d5ded5"
      />

      {/* Interior warm doorway glow */}
      <path
        d="M 36 82 L 36 42 C 36 32 42 25 50 25 C 58 25 64 32 64 42 L 64 82 Z"
        fill="#faf8f2"
      />

      {/* Left door perspective panel (opened inward) */}
      <path
        d="M 32 38 L 46 45 L 46 84 L 32 82 Z"
        fill="#b8c6b8"
        stroke="#234238"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Right door perspective panel (opened inward) */}
      <path
        d="M 68 38 L 55 45 L 55 84 L 68 82 Z"
        fill="#c2cfc2"
        stroke="#234238"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Radiant 4-point golden star shining in open doorway */}
      <path
        d="M 50 38 Q 50 46 44 46 Q 50 46 50 54 Q 50 46 56 46 Q 50 46 50 38 Z"
        fill="#d49b42"
      />
      <circle cx="50" cy="46" r="1.5" fill="#fbe3a8" />

      {/* Wildflower stem growing up right side of doorway */}
      <path
        d="M 54 84 Q 58 70 56 58 Q 54 50 63 38"
        stroke="#234238"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Slender botanical leaves along the stem */}
      <path
        d="M 56 68 Q 63 65 65 69 Q 60 72 56 68 Z"
        fill="#3d5a4e"
      />
      <path
        d="M 55 56 Q 48 52 48 57 Q 53 59 55 56 Z"
        fill="#3d5a4e"
      />

      {/* Wildflower blossoms */}
      {/* Lower blossom */}
      <circle cx="63" cy="46" r="3" fill="#f7f5ed" stroke="#234238" strokeWidth="0.8" />
      <circle cx="63" cy="46" r="1.2" fill="#d49b42" />

      {/* Main upper blooming flower */}
      <g transform="translate(63, 36)">
        {/* 5 soft cream petals */}
        <ellipse cx="0" cy="-6" rx="3.5" ry="5.5" fill="#fffdfa" stroke="#234238" strokeWidth="0.8" />
        <ellipse cx="5.5" cy="-2" rx="3.5" ry="5" transform="rotate(72 5.5 -2)" fill="#fffdfa" stroke="#234238" strokeWidth="0.8" />
        <ellipse cx="3.5" cy="5" rx="3.5" ry="5" transform="rotate(144 3.5 5)" fill="#fffdfa" stroke="#234238" strokeWidth="0.8" />
        <ellipse cx="-3.5" cy="5" rx="3.5" ry="5" transform="rotate(216 -3.5 5)" fill="#fffdfa" stroke="#fffdfa" strokeWidth="0.8" />
        <ellipse cx="-5.5" cy="-2" rx="3.5" ry="5" transform="rotate(288 -5.5 -2)" fill="#fffdfa" stroke="#234238" strokeWidth="0.8" />
        {/* Flower center */}
        <circle cx="0" cy="0" r="2.8" fill="#d99f43" />
        <circle cx="0" cy="0" r="1.2" fill="#8f5b1d" />
      </g>
    </svg>
  );
};

export default OldLettersIcon;
