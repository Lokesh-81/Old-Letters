import React from 'react';
import { WaxSeal } from './WaxSeal';
import { LetterTemplate } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';

interface EnvelopeObjectProps {
  templateId?: string;
  template?: LetterTemplate;
  recipientName?: string;
  senderName?: string;
  date?: string;
  isOpen?: boolean;
  isSealed?: boolean;
  sealColor?: string;
  sealEmblem?: string;
  interactiveSeal?: boolean;
  onSealClick?: () => void;
  className?: string;
  showStamp?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const EnvelopeObject: React.FC<EnvelopeObjectProps> = ({
  templateId = 'ivory',
  template: customTemplate,
  recipientName = 'Recipient Name',
  senderName = 'Your Name',
  date = '29 SEP 2026',
  isOpen = false,
  isSealed = true,
  sealColor,
  sealEmblem,
  interactiveSeal = false,
  onSealClick,
  className = '',
  showStamp = true,
  size = 'md',
}) => {
  const normalizedId =
    templateId === 'ivory'
      ? 'ivory-classic'
      : templateId === 'typewritten'
      ? 'typewriter'
      : templateId === 'burgundy'
      ? 'love-letter'
      : templateId === 'diary'
      ? 'personal-diary'
      : templateId === 'midnight'
      ? 'midnight-correspondence'
      : templateId;

  const t = customTemplate || TEMPLATES.find((tpl) => tpl.id === normalizedId) || TEMPLATES[0];

  const effectiveSealColor = sealColor || t.waxSealStyle?.color || (t as any).sealColor || '#5c1d24';
  const effectiveSealEmblem = sealEmblem || t.waxSealStyle?.emblem || (t as any).sealEmblem || '❦';
  const envelopeBg = t.envelopeStyle?.bgColor || (t as any).envelopeBg || '#ede7dc';
  const envelopeFlapBg = t.envelopeStyle?.flapColor || (t as any).envelopeFlapBg || '#dfd7ca';

  const sizeClasses = {
    sm: 'w-72 h-44 text-xs',
    md: 'w-80 h-52 sm:w-[440px] sm:h-[280px] text-sm',
    lg: 'w-full max-w-xl h-64 sm:h-[320px] text-base',
  }[size];

  return (
    <div className={`relative select-none ${sizeClasses} ${className}`}>
      {/* Outer Luxury Envelope Shell */}
      <div
        className="relative w-full h-full rounded-sm overflow-hidden transition-all duration-700"
        style={{
          backgroundColor: envelopeBg,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Subtle Air Mail Chevron Accent only if Air Mail template */}
        {t.id === 'air-mail' && (
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, #b91c1c, #b91c1c 10px, #ffffff 10px, #ffffff 16px, #1d4ed8 16px, #1d4ed8 26px, #ffffff 26px, #ffffff 32px)',
            }}
          />
        )}

        {/* Minimalist Flap Fold Geometry */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Bottom Flap */}
          <div
            className="absolute bottom-0 inset-x-0 h-1/2 opacity-70"
            style={{
              backgroundColor: envelopeFlapBg,
              clipPath: 'polygon(0% 100%, 50% 18%, 100% 100%)',
            }}
          />

          {/* Left Flap */}
          <div
            className="absolute inset-y-0 left-0 w-1/2 opacity-60"
            style={{
              backgroundColor: envelopeFlapBg,
              clipPath: 'polygon(0% 0%, 0% 100%, 75% 50%)',
            }}
          />

          {/* Right Flap */}
          <div
            className="absolute inset-y-0 right-0 w-1/2 opacity-60"
            style={{
              backgroundColor: envelopeFlapBg,
              clipPath: 'polygon(100% 0%, 100% 100%, 25% 50%)',
            }}
          />

          {/* Top Flap (Opens with 3D perspective fold) */}
          <div
            className="absolute top-0 inset-x-0 h-3/5 origin-top transition-transform duration-700 ease-out"
            style={{
              backgroundColor: envelopeFlapBg,
              clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
              boxShadow: isOpen ? 'none' : '0 6px 16px rgba(0,0,0,0.15)',
              transform: isOpen ? 'rotateX(180deg)' : 'rotateX(0deg)',
              zIndex: isOpen ? 5 : 20,
            }}
          />
        </div>

        {/* Envelope Face Details (Modern editorial postal typography) */}
        <div className="relative z-10 w-full h-full p-6 sm:p-8 flex flex-col justify-between">
          {/* Top row: Clean sender mark & minimal stamp */}
          <div className="flex items-start justify-between">
            <div className="max-w-[200px]">
              <div className="text-[10px] uppercase tracking-wider font-mono text-stone-500">
                DISPATCHED FROM
              </div>
              <div className="font-serif text-sm text-stone-900 font-medium truncate">
                {senderName && senderName.trim() ? senderName : 'Your Name'}
              </div>
            </div>

            {showStamp && (
              <div className="border border-stone-400/80 bg-white/70 px-2.5 py-1.5 rounded-xs text-right shadow-xs">
                <div className="text-[9px] font-mono tracking-widest text-stone-600 uppercase">
                  POST RESTANTE
                </div>
                <div className="text-xs font-mono font-semibold text-stone-900">{date}</div>
              </div>
            )}
          </div>

          {/* Recipient Headline in Center */}
          <div className="my-auto pl-4 sm:pl-10 pr-4">
            <div className="text-[10px] font-mono tracking-widest uppercase text-stone-500 mb-1">
              FOR THE EYES OF
            </div>
            <div className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
              {recipientName && recipientName.trim() ? recipientName : 'Recipient Name'}
            </div>
            <div className="text-xs font-sans text-stone-500 mt-1">
              Private correspondence · Hand delivered
            </div>
          </div>

          {/* Subtle Bottom Reference */}
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 border-t border-stone-300/80 pt-2">
            <span>OLD-LETTERS</span>
            <span>48-HOUR PASSAGE</span>
          </div>
        </div>

        {/* Center Wax Seal (When envelope is closed) */}
        {!isOpen && isSealed && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-transform duration-300">
            <WaxSeal
              color={effectiveSealColor}
              emblem={effectiveSealEmblem}
              size={size === 'sm' ? 'md' : 'lg'}
              interactive={interactiveSeal}
              onClick={onSealClick}
              label="Open correspondence"
            />
          </div>
        )}
      </div>
    </div>
  );
};
