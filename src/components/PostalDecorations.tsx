import React from 'react';
import { getVintageStamp, StampMotifIcon } from './StampSelection';

interface PostmarkProps {
  city?: string;
  date?: string;
  number?: string;
  className?: string;
}

export function Postmark({
  city = 'OLD-LETTERS CENTRAL',
  date = '21 SEP 2026',
  number = '№ 402',
  className = '',
}: PostmarkProps) {
  return (
    <div
      className={`inline-flex items-center select-none opacity-85 pointer-events-none mix-blend-multiply ${className}`}
      aria-hidden="true"
    >
      {/* Circular cancellation stamp */}
      <div className="relative w-20 h-20 rounded-full border-2 border-[#5A2528]/60 p-1 flex flex-col items-center justify-center text-center rotate-[-8deg] shrink-0">
        <div className="w-full h-full rounded-full border border-dashed border-[#5A2528]/50 flex flex-col items-center justify-center p-1">
          <span className="text-[7px] tracking-[0.2em] uppercase font-mono font-bold text-[#5A2528]/80 leading-none">
            {city}
          </span>
          <span className="text-[10px] font-mono font-bold text-[#5A2528] my-0.5 tracking-wider">
            {date}
          </span>
          <span className="text-[6px] tracking-widest font-mono text-[#5A2528]/70 leading-none">
            {number}
          </span>
        </div>
      </div>

      {/* Wavy cancellation bars */}
      <div className="flex flex-col gap-1.5 ml-2">
        <svg width="48" height="6" viewBox="0 0 48 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 3C4 0 8 6 12 3C16 0 20 6 24 3C28 0 32 6 36 3C40 0 44 6 48 3" stroke="#5A2528" strokeWidth="1.2" strokeOpacity="0.6"/>
        </svg>
        <svg width="48" height="6" viewBox="0 0 48 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 3C4 0 8 6 12 3C16 0 20 6 24 3C28 0 32 6 36 3C40 0 44 6 48 3" stroke="#5A2528" strokeWidth="1.2" strokeOpacity="0.6"/>
        </svg>
        <svg width="48" height="6" viewBox="0 0 48 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 3C4 0 8 6 12 3C16 0 20 6 24 3C28 0 32 6 36 3C40 0 44 6 48 3" stroke="#5A2528" strokeWidth="1.2" strokeOpacity="0.6"/>
        </svg>
      </div>
    </div>
  );
}

interface WaxSealProps {
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  broken?: boolean;
  onClick?: () => void;
  className?: string;
  initial?: string;
}

export function WaxSeal({
  color = '#5A2528',
  size = 'md',
  broken = false,
  onClick,
  className = '',
  initial = 'OL',
}: WaxSealProps) {
  const sizeMap = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 text-xl',
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative inline-flex items-center justify-center rounded-full cursor-pointer transition-transform active:scale-95 ${sizeMap[size]} ${className}`}
      style={{
        backgroundColor: color,
        boxShadow: broken
          ? '0 2px 4px rgba(0,0,0,0.2)'
          : '0 8px 20px -3px rgba(36, 29, 24, 0.45), inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -3px 6px rgba(0,0,0,0.4)',
      }}
      title={onClick ? 'Click to break wax seal' : undefined}
    >
      {/* Irregular wax edge ripple */}
      <div className="absolute inset-0.5 rounded-full border-2 border-white/20 opacity-80" />
      <div className="absolute inset-1.5 rounded-full border border-black/30" />

      {/* Embossed emblem in center */}
      <div className="relative font-serif font-bold text-amber-100/90 tracking-widest drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] select-none">
        {broken ? (
          <span className="text-white/60 text-[10px] font-mono">BROKEN</span>
        ) : (
          initial
        )}
      </div>

      {broken && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[120%] h-[2px] bg-[#2C241F]/80 rotate-45" />
        </div>
      )}
    </div>
  );
}

interface PostalStampProps {
  denomination?: string;
  subject?: string;
  accentColor?: string;
  className?: string;
  stampId?: string;
  onClick?: () => void;
  title?: string;
}

export function PostageStamp({
  denomination,
  subject,
  accentColor,
  className = '',
  stampId,
  onClick,
  title,
}: PostalStampProps) {
  const vintage = stampId ? getVintageStamp(stampId) : null;
  const effectiveDenom = vintage ? vintage.denomination : (denomination || '12c');
  const effectiveSubject = vintage ? vintage.name : (subject || 'HERITAGE POST');
  const effectiveColor = vintage ? vintage.color : (accentColor || '#5A2528');
  const effectiveBg = vintage ? vintage.paperBg : '#FAF7F0';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
      className={`relative w-16 h-20 border border-amber-900/30 p-1 shadow-sm select-none shrink-0 transition-transform ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 group' : ''
      } ${className}`}
      style={{
        backgroundColor: effectiveBg,
        boxShadow: '0 2px 8px rgba(44, 36, 31, 0.12)',
      }}
    >
      <div
        className="w-full h-full border flex flex-col justify-between p-1"
        style={{
          borderColor: `${effectiveColor}40`,
          backgroundColor: `${effectiveBg}cc`,
          color: effectiveColor,
        }}
      >
        <div className="flex justify-between items-center text-[7px] font-mono font-bold tracking-widest uppercase leading-none">
          <span className="truncate max-w-[40px]">{vintage?.country || 'AIRMAIL'}</span>
          <span>{effectiveDenom}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center my-0.5 border border-dashed border-current/25 bg-white/70 overflow-hidden">
          {vintage ? (
            <div className="transform scale-75 origin-center">
              <StampMotifIcon motif={vintage.motif} color={effectiveColor} />
            </div>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth="1.2">
              <circle cx="12" cy="12" r="9" strokeDasharray="2 2" />
              <path d="M12 7V17M7 12H17" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
          <span className="text-[5px] tracking-tighter uppercase font-mono mt-0.5 opacity-80 truncate max-w-[50px] text-center">
            {effectiveSubject}
          </span>
        </div>

        <div className="text-[5.5px] font-mono text-center tracking-wider opacity-60 leading-none">
          OFFICIAL POST
        </div>
      </div>
    </div>
  );
}
