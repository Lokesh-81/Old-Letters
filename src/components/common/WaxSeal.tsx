import React from 'react';

interface WaxSealProps {
  color?: string;
  emblem?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  broken?: boolean;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  label?: string;
}

export const WaxSeal: React.FC<WaxSealProps> = ({
  color = '#8a242c',
  emblem = '❦',
  size = 'md',
  broken = false,
  className = '',
  onClick,
  interactive = false,
  label,
}) => {
  const sizeMap = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-24 h-24 text-3xl',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive && !onClick}
      aria-label={label || 'Wax seal'}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-300 ${
        interactive ? 'cursor-pointer hover:scale-105 active:scale-95 hover:shadow-2xl' : ''
      } ${sizeMap[size]} ${className}`}
      style={{
        backgroundColor: color,
        boxShadow: `
          0 4px 14px rgba(0,0,0,0.4),
          inset 0 2px 4px rgba(255,255,255,0.25),
          inset 0 -3px 6px rgba(0,0,0,0.5)
        `,
      }}
    >
      {/* Irregular organic wax perimeter droplets */}
      <span
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full opacity-80 pointer-events-none"
        style={{ backgroundColor: color }}
      />
      <span
        className="absolute -bottom-1 -left-1 w-4 h-3 rounded-full opacity-90 pointer-events-none"
        style={{ backgroundColor: color }}
      />
      <span
        className="absolute top-2 -left-1.5 w-2 h-2 rounded-full opacity-70 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      {/* Inner debossed seal ring */}
      <span
        className="relative flex items-center justify-center w-[76%] h-[76%] rounded-full border border-white/20 select-none text-white/95 font-serif font-bold"
        style={{
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.2)',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        {broken ? (
          <span className="text-amber-200/90 rotate-12 scale-110">✦</span>
        ) : (
          <span>{emblem}</span>
        )}
      </span>
    </button>
  );
};
