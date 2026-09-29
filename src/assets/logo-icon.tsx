import React from 'react';

export default function LogoIcon({ className = 'size-8 text-zinc-500' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="6" width="26" height="20" rx="2" />
      <path d="M3 8l13 9 13-9" />
      <circle cx="16" cy="17" r="3" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}
