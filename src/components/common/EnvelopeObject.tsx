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
    templateId === 'ivory' || templateId === 'classic'
      ? 'ivory-classic'
      : templateId === 'typewritten'
      ? 'typewriter'
      : templateId === 'burgundy'
      ? 'love-letter'
      : templateId === 'diary'
      ? 'personal-diary'
      : templateId === 'midnight'
      ? 'midnight-archive'
      : templateId === 'vellum'
      ? 'antique-vellum'
      : templateId === 'capsule'
      ? 'time-capsule'
      : templateId;

  const t = customTemplate || TEMPLATES.find((tpl) => tpl.id === normalizedId) || TEMPLATES[0];

  const effectiveSealColor = sealColor || t.waxSealStyle?.color || (t as any).sealColor || '#5c1d24';
  const effectiveSealEmblem = sealEmblem || t.waxSealStyle?.emblem || (t as any).sealEmblem || '❦';
  const envelopeBg = t.envelopeStyle?.bgColor || (t as any).envelopeBg || '#ede7dc';
  const envelopeFlapBg = t.envelopeStyle?.flapColor || (t as any).envelopeFlapBg || '#dfd7ca';

  // Template archetype checks
  const isAirMail = t.id === 'air-mail' || t.borderStyle === 'airmail-chevron';
  const isTypewriter = t.id === 'typewriter' || t.borderStyle === 'typewriter-rule';
  const isMidnight = t.id === 'midnight-archive' || t.borderStyle === 'midnight-gold';
  const isLove = t.id === 'love-letter' || t.borderStyle === 'crimson-filigree';
  const isVellum = t.id === 'antique-vellum' || t.borderStyle === 'antique-vellum';
  const isTimeCapsule = t.id === 'time-capsule' || t.borderStyle === 'capsule-docket';
  const isBotanical = t.id === 'botanical-archive' || t.id === 'pressed-flowers';

  const sizeClasses = {
    sm: 'w-72 h-44 text-xs',
    md: 'w-80 h-52 sm:w-[440px] sm:h-[280px] text-sm',
    lg: 'w-full max-w-xl h-64 sm:h-[320px] text-base',
  }[size];

  return (
    <div className={`relative select-none ${sizeClasses} ${className}`}>
      {/* Outer Envelope Shell */}
      <div
        className="relative w-full h-full rounded-sm overflow-hidden transition-all duration-700"
        style={{
          backgroundColor: envelopeBg,
          boxShadow: isMidnight
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(201, 168, 78, 0.3)'
            : isAirMail
            ? '0 25px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(30, 58, 138, 0.2)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Air Mail Repeating Chevron Border along all outer edges */}
        {isAirMail && (
          <>
            <div
              className="absolute inset-x-0 top-0 h-2 z-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(-45deg, #b91c1c, #b91c1c 10px, #ffffff 10px, #ffffff 16px, #1d4ed8 16px, #1d4ed8 26px, #ffffff 26px, #ffffff 32px)',
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-2 z-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(-45deg, #b91c1c, #b91c1c 10px, #ffffff 10px, #ffffff 16px, #1d4ed8 16px, #1d4ed8 26px, #ffffff 26px, #ffffff 32px)',
              }}
            />
          </>
        )}

        {/* Midnight Celestial Gold Hairline Border */}
        {isMidnight && (
          <div className="absolute inset-2 border border-[#c9a84e]/30 pointer-events-none z-10">
            <span className="absolute top-1 left-1 text-[9px] text-[#c9a84e]">✦</span>
            <span className="absolute top-1 right-1 text-[9px] text-[#c9a84e]">✦</span>
            <span className="absolute bottom-1 left-1 text-[9px] text-[#c9a84e]">✦</span>
            <span className="absolute bottom-1 right-1 text-[9px] text-[#c9a84e]">✦</span>
          </div>
        )}

        {/* Burgundy Velvet Double Border */}
        {isLove && (
          <div className="absolute inset-2 border border-[#841824]/20 pointer-events-none z-10" />
        )}

        {/* Flap Fold Geometry */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Bottom Flap */}
          <div
            className="absolute bottom-0 inset-x-0 h-1/2 opacity-75"
            style={{
              backgroundColor: envelopeFlapBg,
              clipPath: 'polygon(0% 100%, 50% 18%, 100% 100%)',
            }}
          />

          {/* Left Flap */}
          <div
            className="absolute inset-y-0 left-0 w-1/2 opacity-65"
            style={{
              backgroundColor: envelopeFlapBg,
              clipPath: 'polygon(0% 0%, 0% 100%, 75% 50%)',
            }}
          />

          {/* Right Flap */}
          <div
            className="absolute inset-y-0 right-0 w-1/2 opacity-65"
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

        {/* Envelope Face Details */}
        <div className="relative z-10 w-full h-full p-6 sm:p-8 flex flex-col justify-between">
          {/* Top Row */}
          <div className="flex items-start justify-between">
            <div className="max-w-[200px]">
              {isAirMail ? (
                <div className="inline-flex items-center gap-1.5 bg-[#1e3a8a] text-white px-2.5 py-1 rounded-xs font-mono text-[9px] font-bold tracking-widest uppercase">
                  <span>✈</span>
                  <span>PAR AVION</span>
                </div>
              ) : isMidnight ? (
                <div className="text-[10px] font-mono text-[#c9a84e] tracking-widest uppercase flex items-center gap-1">
                  <span>✦</span>
                  <span>OBSERVATORY POST</span>
                </div>
              ) : isTypewriter ? (
                <div className="text-[10px] font-mono font-bold text-stone-900 tracking-wider">
                  DISPATCH MEMO // 48-H
                </div>
              ) : isTimeCapsule ? (
                <div className="border border-red-700/60 bg-red-950/10 px-2 py-0.5 rounded-xs text-[8px] font-mono text-red-700 font-bold uppercase tracking-wider">
                  ⏳ TEMPORAL VAULT LOCK
                </div>
              ) : (
                <div className="text-[10px] uppercase tracking-wider font-mono text-stone-500">
                  DISPATCHED FROM
                </div>
              )}

              <div
                className={`font-serif text-sm font-medium truncate mt-0.5 ${
                  isMidnight ? 'text-[#F7F0E5]' : 'text-stone-900'
                }`}
              >
                {senderName && senderName.trim() ? senderName : 'Your Name'}
              </div>
            </div>

            {showStamp && (
              <div
                className={`border px-2.5 py-1.5 rounded-xs text-right shadow-xs ${
                  isMidnight
                    ? 'border-[#c9a84e]/40 bg-[#111B24]/80 text-[#F7F0E5]'
                    : isAirMail
                    ? 'border-blue-400/80 bg-white/90 text-blue-900'
                    : isTypewriter
                    ? 'border-stone-800 bg-stone-100 text-stone-900 font-mono'
                    : 'border-stone-400/80 bg-white/70 text-stone-900'
                }`}
              >
                <div
                  className={`text-[8px] font-mono tracking-widest uppercase ${
                    isMidnight ? 'text-[#c9a84e]' : 'text-stone-600'
                  }`}
                >
                  {isAirMail ? 'AERO POST 48' : isMidnight ? 'NOCTURNE' : 'POST RESTANTE'}
                </div>
                <div className="text-xs font-mono font-semibold">{date}</div>
              </div>
            )}
          </div>

          {/* Recipient Center Block */}
          <div className="my-auto pl-4 sm:pl-10 pr-4">
            <div
              className={`text-[9px] font-mono tracking-widest uppercase mb-1 ${
                isMidnight ? 'text-[#c9a84e]/80' : 'text-stone-500'
              }`}
            >
              {isTypewriter ? 'DELIVER TO:' : isTimeCapsule ? 'RESERVED UNTIL DELIVERY FOR:' : 'FOR THE EYES OF:'}
            </div>
            <div
              className={`font-serif text-2xl sm:text-3xl font-normal tracking-tight ${
                isMidnight ? 'text-[#F7F0E5]' : isTypewriter ? 'font-mono font-bold text-stone-900' : 'text-stone-950'
              }`}
            >
              {recipientName && recipientName.trim() ? recipientName : 'Recipient Name'}
            </div>
            <div
              className={`text-xs mt-1 ${
                isMidnight ? 'text-[#c9a84e]/70' : 'text-stone-500 font-sans'
              }`}
            >
              Private correspondence · Sealed in transit
            </div>
          </div>

          {/* Bottom Reference */}
          <div
            className={`flex items-center justify-between text-[10px] font-mono border-t pt-2 ${
              isMidnight
                ? 'border-[#c9a84e]/20 text-[#c9a84e]/70'
                : 'border-stone-300/80 text-stone-500'
            }`}
          >
            <span>OLD-LETTERS</span>
            <span>48-HOUR VAULT PASSAGE</span>
          </div>
        </div>

        {/* Center Wax Seal */}
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
