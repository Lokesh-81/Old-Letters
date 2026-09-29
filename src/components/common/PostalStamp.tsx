import React from 'react';

interface PostalStampProps {
  denomination?: string;
  country?: string;
  city?: string;
  date?: string;
  theme?: 'brass' | 'burgundy' | 'forest' | 'blue' | 'sepia';
  cancelled?: boolean;
  className?: string;
}

export const PostalStamp: React.FC<PostalStampProps> = ({
  denomination = '48h',
  country = 'OLD-LETTERS POST',
  city = 'BUREAU DE POSTE',
  date = '29 SEP 2026',
  theme = 'brass',
  cancelled = true,
  className = '',
}) => {
  const themeStyles = {
    brass: {
      bg: 'bg-[#f4efe4]',
      border: 'border-[#c5a059]',
      text: 'text-[#5a4220]',
      art: '#9e7b3b',
    },
    burgundy: {
      bg: 'bg-[#faf4f4]',
      border: 'border-[#8a242c]',
      text: 'text-[#52161b]',
      art: '#8a242c',
    },
    forest: {
      bg: 'bg-[#f2f7f4]',
      border: 'border-[#2d4a3e]',
      text: 'text-[#1e332a]',
      art: '#2d4a3e',
    },
    blue: {
      bg: 'bg-[#f0f5fa]',
      border: 'border-[#2563eb]',
      text: 'text-[#1e3a8a]',
      art: '#2563eb',
    },
    sepia: {
      bg: 'bg-[#fbf7f0]',
      border: 'border-[#854d0e]',
      text: 'text-[#713f12]',
      art: '#854d0e',
    },
  }[theme];

  return (
    <div className={`relative inline-block select-none ${className}`}>
      {/* Stamp Body with Perforated / Serrated simulated perimeter */}
      <div
        className={`w-24 h-28 sm:w-28 sm:h-32 p-1.5 ${themeStyles.bg} shadow-md border-2 border-dashed ${themeStyles.border} relative flex flex-col justify-between overflow-hidden`}
        style={{
          boxShadow: '0 4px 10px rgba(0,0,0,0.12), inset 0 0 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Inner frame */}
        <div className={`w-full h-full border border-solid ${themeStyles.border}/60 p-1.5 flex flex-col justify-between items-center text-center`}>
          <div className="flex items-center justify-between w-full text-[9px] uppercase tracking-wider font-mono font-medium text-stone-600">
            <span>{country}</span>
            <span className="font-bold text-stone-900">{denomination}</span>
          </div>

          {/* Postal Engraving Center Art */}
          <div className="my-auto flex flex-col items-center">
            <svg
              className="w-8 h-8 opacity-80"
              viewBox="0 0 24 24"
              fill="none"
              stroke={themeStyles.art}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span className="text-[10px] font-serif tracking-widest uppercase mt-1 font-semibold text-stone-800">
              CORRESPONDENCE
            </span>
          </div>

          <div className="w-full text-center border-t border-stone-300/80 pt-0.5">
            <span className="text-[8px] font-mono tracking-widest uppercase text-stone-500">
              EXPEDITION PRIVÉE
            </span>
          </div>
        </div>
      </div>

      {/* Postmark / Cancellation ink overlay */}
      {cancelled && (
        <div
          className="absolute -bottom-4 -left-6 w-36 h-24 pointer-events-none rotate-[-12deg] opacity-75 mix-blend-multiply flex items-center"
          aria-hidden="true"
        >
          {/* Circular postmark stamp */}
          <div className="w-20 h-20 rounded-full border-2 border-stone-800/80 p-1 flex flex-col items-center justify-center text-center text-stone-800 font-mono text-[8px] leading-tight shrink-0">
            <span className="tracking-widest uppercase text-[7px] font-semibold">{city}</span>
            <span className="font-bold my-0.5 border-y border-stone-700/60 py-0.5 px-1">{date}</span>
            <span className="tracking-wider text-[7px]">CONFIRMED</span>
          </div>

          {/* Wavy cancellation bars */}
          <svg className="w-16 h-12 ml-1 text-stone-800 stroke-current opacity-80" viewBox="0 0 60 40">
            <path d="M0 8 Q15 2 30 8 T60 8" fill="none" strokeWidth="1.5" />
            <path d="M0 16 Q15 10 30 16 T60 16" fill="none" strokeWidth="1.5" />
            <path d="M0 24 Q15 18 30 24 T60 24" fill="none" strokeWidth="1.5" />
            <path d="M0 32 Q15 26 30 32 T60 32" fill="none" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
};
