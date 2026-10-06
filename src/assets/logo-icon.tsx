import React from 'react';

export default function LogoIcon({ className = 'size-8' }: { className?: string }) {
  return <img src="/favicon.png" alt="OLD-LETTERS" className={`${className} object-contain`} />;
}
