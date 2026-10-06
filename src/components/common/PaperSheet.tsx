import React, { useState } from 'react';
import { LetterTemplate, LetterAttachment } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';

interface PaperSheetProps {
  templateId?: string;
  template?: LetterTemplate;
  date?: string;
  greeting?: string;
  content: string;
  signoff?: string;
  senderName?: string;
  recipientName?: string;
  attachments?: LetterAttachment[];
  className?: string;
  isEditing?: boolean;
  onDateChange?: (date: string) => void;
  onGreetingChange?: (greeting: string) => void;
  onContentChange?: (content: string) => void;
  onSignoffChange?: (signoff: string) => void;
  onSenderChange?: (sender: string) => void;
  onUploadPhoto?: () => void;
  showReverseSide?: boolean;
}

export const PaperSheet: React.FC<PaperSheetProps> = ({
  templateId = 'ivory-classic',
  template: customTemplate,
  date = '12 October 2026',
  greeting = 'Dear Recipient,',
  content,
  signoff = 'With affection,',
  senderName = 'Your Name',
  recipientName = 'Recipient Name',
  attachments = [],
  className = '',
  isEditing = false,
  onDateChange,
  onGreetingChange,
  onContentChange,
  onSignoffChange,
  onSenderChange,
  onUploadPhoto,
  showReverseSide = false,
}) => {
  // Normalize template lookup
  const normalizedId =
    templateId === 'ivory' || templateId === 'classic'
      ? 'ivory-classic'
      : templateId === 'midnight' || templateId === 'midnight-correspondence'
      ? 'midnight-archive'
      : templateId === 'vellum' || templateId === 'wax-vellum'
      ? 'antique-vellum'
      : templateId === 'blush'
      ? 'blush-pressed-rose'
      : templateId === 'flowers'
      ? 'pressed-flowers'
      : templateId;

  const t = customTemplate || TEMPLATES.find((tpl) => tpl.id === normalizedId) || TEMPLATES[0];

  // Contrast-safe theme tokens
  const bg = t.paperBackground || t.paperColor || '#FAF6EE';
  const fg = t.paperForeground || t.inkColor || '#3A2520';
  const muted = t.paperMuted || '#7A655C';
  const accent = t.paperAccent || '#5C1D24';
  const border = t.paperBorder || '#CBBDA5';

  const isDarkPaper =
    t.id === 'midnight-archive' ||
    t.id === 'secret-letter' ||
    bg.toLowerCase() === '#111b24' ||
    bg.toLowerCase() === '#1a1617';

  // Postcard front/back flip state
  const [postcardSide, setPostcardSide] = useState<'message' | 'front'>('message');

  const fontClass = {
    serif: 'font-serif',
    display: 'font-serif tracking-wide',
    editorial: 'font-serif italic',
    typewriter: 'font-mono tracking-tight text-[15px]',
    handwriting: 'font-serif italic tracking-normal',
    sans: 'font-sans',
  }[t.fontFamily] || 'font-serif';

  // Template identity flags
  const isAirMail = t.id === 'air-mail' || t.borderStyle === 'airmail-chevron';
  const isTypewriter = t.id === 'typewriter' || t.borderStyle === 'typewriter-rule';
  const isDiary = t.id === 'personal-diary' || t.borderStyle === 'notebook-margin';
  const isPostcard = t.id === 'vintage-postcard' || t.borderStyle === 'postcard-split';
  const isPhoto = t.id === 'archival-photo' || t.borderStyle === 'photo-corners';
  const isMidnight = t.id === 'midnight-archive' || t.borderStyle === 'midnight-gold';
  const isSecret = t.id === 'secret-letter' || t.borderStyle === 'secret-cipher';
  const isVellum = t.id === 'antique-vellum' || t.borderStyle === 'antique-vellum';
  const isBlushRose = t.id === 'blush-pressed-rose' || t.borderStyle === 'blush-rose';
  const isFlowers = t.id === 'pressed-flowers';
  const isLove = t.id === 'love-letter' || t.borderStyle === 'crimson-filigree';
  const isApology = t.id === 'apology' || t.borderStyle === 'apology-minimal';
  const isThankYou = t.id === 'thank-you' || t.borderStyle === 'thankyou-foliage';
  const isBirthday = t.id === 'birthday' || t.borderStyle === 'birthday-garland';
  const isCongratulations = t.id === 'congratulations' || t.borderStyle === 'congratulations-laurel';
  const isEncouragement = t.id === 'encouragement' || t.borderStyle === 'encouragement-botanical';
  const isGoodbye = t.id === 'goodbye' || t.borderStyle === 'goodbye-deckled';
  const isTimeCapsule = t.id === 'time-capsule' || t.borderStyle === 'capsule-docket';
  const isFuture = t.id === 'future-letter' || t.borderStyle === 'future-celestial';
  const isCustom = t.id === 'custom-letter' || t.borderStyle === 'custom-bespoke';
  const isBotanical = t.id === 'botanical-archive' || t.borderStyle === 'herbarium-grid';

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto rounded-xs transition-all duration-300 ${className}`}
      style={{
        backgroundColor: bg,
        color: fg,
        boxShadow: isDarkPaper
          ? '0 4px 24px rgba(0,0,0,0.65), 0 16px 52px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,78,0.35)'
          : isVellum
          ? '0 8px 32px rgba(45,30,20,0.08), 0 24px 60px rgba(45,30,20,0.06), 0 0 0 1px rgba(212,155,56,0.3)'
          : '0 2px 6px rgba(40,25,15,0.05), 0 12px 30px rgba(40,25,15,0.08), 0 28px 64px rgba(40,25,15,0.07), 0 0 0 1px rgba(215,200,180,0.6)',
      }}
    >
      {/* ---------------- 1. BACKGROUND TEXTURES & WATERMARKS ---------------- */}
      {/* Universal subtle paper grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] rounded-xs mix-blend-multiply"
        style={{
          backgroundImage: 'radial-gradient(#1a140f 0.75px, transparent 0.75px)',
          backgroundSize: '10px 10px',
        }}
      />

      {/* Diary ruled lines */}
      {isDiary && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #3b82f6 28px)',
            backgroundPosition: '0 4.5rem',
          }}
        />
      )}

      {/* Diary left red margin rule */}
      {isDiary && (
        <div className="absolute top-0 bottom-0 left-12 sm:left-16 w-[1.5px] bg-red-400/40 pointer-events-none" />
      )}

      {/* Typewriter mechanical left margin line */}
      {isTypewriter && (
        <div className="absolute top-0 bottom-0 left-10 sm:left-14 w-[1px] bg-red-500/35 pointer-events-none" />
      )}

      {/* Air Mail repeating chevron border */}
      {isAirMail && (
        <>
          <div
            className="absolute inset-x-0 top-0 h-3"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, #dc2626, #dc2626 12px, #ffffff 12px, #ffffff 18px, #2563eb 18px, #2563eb 30px, #ffffff 30px, #ffffff 36px)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-3"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, #dc2626, #dc2626 12px, #ffffff 12px, #ffffff 18px, #2563eb 18px, #2563eb 30px, #ffffff 30px, #ffffff 36px)',
            }}
          />
        </>
      )}

      {/* Midnight / Secret celestial constellation watermark */}
      {(isMidnight || isSecret) && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.10] overflow-hidden">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15%" cy="20%" r="2" fill={accent} />
            <circle cx="35%" cy="15%" r="1.5" fill={accent} />
            <circle cx="85%" cy="30%" r="2" fill={accent} />
            <circle cx="75%" cy="75%" r="1.5" fill={accent} />
            <circle cx="20%" cy="85%" r="2" fill={accent} />
            <line x1="15%" y1="20%" x2="35%" y2="15%" stroke={accent} strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="75%" y1="75%" x2="85%" y2="30%" stroke={accent} strokeWidth="0.5" strokeDasharray="3 3" />
          </svg>
        </div>
      )}

      {/* ---------------- 2. BORDER MOTIFS & CORNER ORNAMENTS ---------------- */}
      {/* Ivory Classic double antique border with corner flourishes */}
      {(t.id === 'ivory-classic' || t.borderStyle === 'antique-double') && !isFuture && (
        <div className="absolute inset-3 border pointer-events-none" style={{ borderColor: `${border}80` }}>
          <div className="absolute inset-1 border" style={{ borderColor: `${border}40` }} />
          <span className="absolute -top-2.5 -left-1 text-xs" style={{ color: accent }}>❦</span>
          <span className="absolute -top-2.5 -right-1 text-xs" style={{ color: accent }}>❦</span>
          <span className="absolute -bottom-2.5 -left-1 text-xs" style={{ color: accent }}>❦</span>
          <span className="absolute -bottom-2.5 -right-1 text-xs" style={{ color: accent }}>❦</span>
        </div>
      )}

      {/* Midnight Gold Filigree Border */}
      {(isMidnight || isSecret) && (
        <div className="absolute inset-3.5 border pointer-events-none" style={{ borderColor: `${accent}60` }}>
          <div className="absolute inset-1 border" style={{ borderColor: `${accent}30` }} />
          <span className="absolute top-1 left-1 text-[11px]" style={{ color: accent }}>✦</span>
          <span className="absolute top-1 right-1 text-[11px]" style={{ color: accent }}>✦</span>
          <span className="absolute bottom-1 left-1 text-[11px]" style={{ color: accent }}>✦</span>
          <span className="absolute bottom-1 right-1 text-[11px]" style={{ color: accent }}>✦</span>
        </div>
      )}

      {/* Antique Vellum Deckled & Monastery Border */}
      {isVellum && (
        <div className="absolute inset-3 border pointer-events-none rounded-2xs" style={{ borderColor: `${border}90` }}>
          <div className="absolute inset-1 border border-dashed pointer-events-none" style={{ borderColor: `${border}50` }} />
          <span className="absolute top-1 left-2 text-[10px]" style={{ color: accent }}>⚜</span>
          <span className="absolute top-1 right-2 text-[10px]" style={{ color: accent }}>⚜</span>
          <span className="absolute bottom-1 left-2 text-[10px]" style={{ color: accent }}>⚜</span>
          <span className="absolute bottom-1 right-2 text-[10px]" style={{ color: accent }}>⚜</span>
        </div>
      )}

      {/* Blush Pressed Rose Botanical Border */}
      {(isBlushRose || isFlowers) && (
        <>
          <div className="absolute top-3 left-3 w-14 h-14 pointer-events-none opacity-85 select-none">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-[#607157]">
              <path d="M10 10 C 25 35, 45 40, 70 45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M25 22 C 35 18, 42 28, 30 32 Z" fill="#b08991" fillOpacity="0.75" />
              <path d="M42 32 C 55 25, 62 38, 48 40 Z" fill="#b08991" fillOpacity="0.75" />
              <path d="M18 35 C 10 45, 22 55, 28 42 Z" fill="#829479" fillOpacity="0.7" />
              <circle cx="28" cy="26" r="3" fill="#ecd3b6" />
              <circle cx="48" cy="33" r="3" fill="#ecd3b6" />
            </svg>
          </div>
          <div className="absolute bottom-3 right-3 w-14 h-14 pointer-events-none opacity-85 select-none rotate-180">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-[#607157]">
              <path d="M10 10 C 25 35, 45 40, 70 45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M25 22 C 35 18, 42 28, 30 32 Z" fill="#b08991" fillOpacity="0.75" />
              <path d="M42 32 C 55 25, 62 38, 48 40 Z" fill="#b08991" fillOpacity="0.75" />
              <path d="M18 35 C 10 45, 22 55, 28 42 Z" fill="#829479" fillOpacity="0.7" />
            </svg>
          </div>
        </>
      )}

      {/* Love Letter Crimson Filigree Corners */}
      {isLove && (
        <>
          <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: `${accent}70` }} />
          <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: `${accent}70` }} />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: `${accent}70` }} />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: `${accent}70` }} />
          <div className="absolute top-4 right-4 text-xs font-serif" style={{ color: accent }}>❦</div>
          <div className="absolute bottom-4 left-4 text-xs font-serif" style={{ color: accent }}>❦</div>
        </>
      )}

      {/* Apology Minimal Restrained Border */}
      {isApology && (
        <div className="absolute inset-4 border pointer-events-none" style={{ borderColor: `${border}80` }}>
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] tracking-widest uppercase font-mono" style={{ color: accent }}>
            — 🌿 —
          </div>
        </div>
      )}

      {/* Thank You Golden Foliage Border */}
      {isThankYou && (
        <div className="absolute inset-3 border pointer-events-none" style={{ borderColor: `${border}80` }}>
          <span className="absolute -top-2.5 left-4 text-[11px]" style={{ color: accent }}>🌿</span>
          <span className="absolute -top-2.5 right-4 text-[11px]" style={{ color: accent }}>🌿</span>
          <span className="absolute -bottom-2.5 left-4 text-[11px]" style={{ color: accent }}>🌿</span>
          <span className="absolute -bottom-2.5 right-4 text-[11px]" style={{ color: accent }}>🌿</span>
        </div>
      )}

      {/* Birthday Celebratory Garland Border */}
      {isBirthday && (
        <div className="absolute inset-3 border-2 border-dashed pointer-events-none" style={{ borderColor: `${border}90` }}>
          <span className="absolute -top-2.5 -left-1 text-[11px]" style={{ color: accent }}>☀️</span>
          <span className="absolute -top-2.5 -right-1 text-[11px]" style={{ color: accent }}>☀️</span>
          <span className="absolute -bottom-2.5 -left-1 text-[11px]" style={{ color: accent }}>☀️</span>
          <span className="absolute -bottom-2.5 -right-1 text-[11px]" style={{ color: accent }}>☀️</span>
        </div>
      )}

      {/* Congratulations Triumphant Laurel Border */}
      {isCongratulations && (
        <div className="absolute inset-3.5 border-2 pointer-events-none" style={{ borderColor: border }}>
          <div className="absolute inset-1 border pointer-events-none" style={{ borderColor: `${accent}60` }} />
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 text-xs select-none"
            style={{ color: accent, backgroundColor: bg }}
          >
            👑
          </div>
        </div>
      )}

      {/* Encouragement Botanical Sprig Border */}
      {isEncouragement && (
        <div className="absolute inset-3 border pointer-events-none" style={{ borderColor: `${border}90` }}>
          <div className="absolute top-0 bottom-0 left-6 w-[1px] pointer-events-none" style={{ backgroundColor: `${border}50` }} />
          <span className="absolute top-3 left-2 text-xs" style={{ color: accent }}>🌲</span>
        </div>
      )}

      {/* Goodbye Deckled Wistful Border */}
      {isGoodbye && (
        <div className="absolute inset-3 border border-dashed pointer-events-none" style={{ borderColor: `${border}90` }}>
          <span className="absolute top-2 right-2 text-xs" style={{ color: accent }}>⚓</span>
        </div>
      )}

      {/* Future Letter Celestial Compass Border */}
      {isFuture && (
        <div className="absolute inset-3 border pointer-events-none" style={{ borderColor: `${border}80` }}>
          <span className="absolute -top-2.5 -left-1 text-[11px]" style={{ color: accent }}>✧</span>
          <span className="absolute -top-2.5 -right-1 text-[11px]" style={{ color: accent }}>✧</span>
          <span className="absolute -bottom-2.5 -left-1 text-[11px]" style={{ color: accent }}>✧</span>
          <span className="absolute -bottom-2.5 -right-1 text-[11px]" style={{ color: accent }}>✧</span>
        </div>
      )}

      {/* Custom Letter Bespoke Minimal Border */}
      {isCustom && (
        <div className="absolute inset-3 border pointer-events-none" style={{ borderColor: border }}>
          <div className="absolute bottom-2 right-3 text-[10px]" style={{ color: accent }}>🖋</div>
        </div>
      )}

      {/* Botanical Archive Herbarium Margin Annotations */}
      {isBotanical && (
        <div
          className="absolute top-3 right-4 text-[9px] font-mono tracking-widest uppercase border px-2 py-0.5 rounded-xs select-none"
          style={{ borderColor: `${border}70`, color: muted }}
        >
          HERBARIUM SPECIMEN NO. 42
        </div>
      )}

      {/* Time Capsule Official Preservation Vault Header Stamp */}
      {isTimeCapsule && (
        <div className="absolute top-3 right-4 select-none">
          <div className="border border-red-700/60 px-2.5 py-1 text-center rotate-[2deg]">
            <div className="text-[9px] font-mono tracking-widest uppercase text-red-800 font-bold">
              TOP CONFIDENTIAL
            </div>
            <div className="text-[8px] font-mono text-red-700/80">CHRONO-VAULT 48H</div>
          </div>
        </div>
      )}

      {/* Vintage Postcard Front/Back Flip Toggle */}
      {isPostcard && (
        <div className="absolute top-3 right-3 z-20">
          <button
            type="button"
            onClick={() => setPostcardSide((s) => (s === 'message' ? 'front' : 'message'))}
            className="text-[10px] font-mono tracking-wider uppercase bg-[#e5dec9] hover:bg-[#d8d0b9] text-stone-800 px-2.5 py-1 rounded-xs border border-stone-400 transition-colors shadow-xs cursor-pointer"
          >
            Flip: {postcardSide === 'message' ? 'Show Picture Front' : 'Show Writing Back'}
          </button>
        </div>
      )}

      {/* ---------------- 3. REVERSE SIDE VIEW (WHEN FLIPPED) ---------------- */}
      {showReverseSide ? (
        <div className={`p-8 sm:p-14 lg:p-16 ${fontClass} flex flex-col justify-between min-h-[580px] relative z-10`}>
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: `${border}60` }}>
            <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: muted }}>
              REVERSE SIDE · PAPER CONSERVANCY
            </span>
            <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: muted }}>
              {t.paperWeight || '280 GSM ARCHIVAL COTTON'}
            </span>
          </div>

          <div className="my-auto py-12 text-center space-y-6 max-w-md mx-auto">
            <div
              className="w-16 h-16 mx-auto rounded-full border flex items-center justify-center text-2xl shadow-inner"
              style={{ borderColor: `${border}70`, color: accent }}
            >
              {t.waxSealStyle?.emblem || '✒'}
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight" style={{ color: fg }}>
                {t.reverseSideDetails?.title || 'Artisanal Paper Mill Guarantee'}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed font-sans font-light" style={{ color: muted }}>
                {t.reverseSideDetails?.description ||
                  'Milled on heritage cylinder moulds using natural river water and sun-dried cotton fibers.'}
              </p>
            </div>

            <div
              className="inline-block border border-dashed px-4 py-2 rounded-xs text-[10px] font-mono tracking-widest uppercase"
              style={{ borderColor: `${border}80`, color: muted }}
            >
              {t.reverseSideDetails?.markings || 'OLD-LETTERS CORRESPONDENCE BUREAU · ARCHIVE QUALITY'}
            </div>
          </div>

          <div className="pt-6 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: `${border}60`, color: muted }}>
            <span>STATIONERY SPECIFICATION: {t.name}</span>
            <span>POSTAL CACHET: {t.postalMarks.cachetCity || 'Central Bureau'}</span>
          </div>
        </div>
      ) : isPostcard && postcardSide === 'front' ? (
        /* ---------------- POSTCARD FRONT VIEW ---------------- */
        <div className="p-8 sm:p-12 min-h-[540px] flex flex-col justify-between items-center text-center">
          <div className="w-full h-80 bg-stone-200 border-2 border-[#baa993] rounded-xs overflow-hidden relative shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&q=80&w=1000"
              alt="Vintage Hyderabad"
              className="w-full h-full object-cover filter sepia-[0.35] brightness-95"
            />
            <div className="absolute bottom-3 left-4 text-white font-serif text-lg drop-shadow-md tracking-wider">
              Charminar & Old Hyderabad · Deccan Heritage
            </div>
          </div>
          <div className="text-xs font-mono tracking-widest uppercase text-stone-500 pt-4">
            CENTRAL POSTAL HISTORICAL SERIES · CARD NO. 1892
          </div>
        </div>
      ) : (
        /* ---------------- 4. STANDARD LETTER WRITING / READING SURFACE ---------------- */
        <div className={`p-8 sm:p-14 lg:p-16 ${fontClass} flex flex-col min-h-[580px] relative z-10`}>
          {/* Header Metadata Bar */}
          <div className="flex items-center justify-between border-b pb-4 mb-8" style={{ borderColor: `${border}60` }}>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs tracking-widest uppercase" style={{ color: muted }}>
              <span>CORRESPONDENCE</span>
              <span>·</span>
              <span className="font-mono">{t.name}</span>
              {t.postalMarks.cachetCity && (
                <>
                  <span>·</span>
                  <span className="font-mono">{t.postalMarks.cachetCity}</span>
                </>
              )}
            </div>

            {isEditing ? (
              <input
                type="text"
                value={date}
                onChange={(e) => onDateChange?.(e.target.value)}
                placeholder="Date"
                className="text-right text-xs tracking-wider uppercase bg-transparent border-b border-dashed focus:outline-none"
                style={{ color: muted, borderColor: border }}
              />
            ) : (
              <span className="text-xs tracking-wider uppercase font-mono" style={{ color: muted }}>
                {date}
              </span>
            )}
          </div>

          {/* Time Capsule Special Preservation Header */}
          {isTimeCapsule && (
            <div className="mb-6 p-4 border-2 border-dashed border-red-800/60 bg-red-950/5 rounded-xs flex items-center justify-between gap-4 select-none">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-red-900 font-bold flex items-center gap-1.5">
                  <span>⏳</span>
                  <span>TEMPORAL VAULT LOCK · TO BE OPENED ON:</span>
                </div>
                <div className="font-mono text-sm sm:text-base font-semibold text-red-950 tracking-wider">
                  {date || '12 OCTOBER 2036'}
                </div>
                <div className="text-[9px] font-mono text-red-800/70">
                  DOC NO. CAP-2036-DECCAN · REGISTRY LOCK REF #4819
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-red-800/40 flex items-center justify-center text-xs font-mono text-red-900 rotate-[-12deg]">
                LOCKED
              </div>
            </div>
          )}

          {/* Archival Photograph Mounted Section (If Archival Photo Template) */}
          {isPhoto && (
            <div className="mb-8 p-4 bg-stone-900/5 border border-stone-300 rounded-xs flex flex-col items-center">
              <div className="relative p-3 bg-white shadow-md border border-stone-200 rounded-xs max-w-sm w-full">
                {/* Archival Corner Mounts */}
                <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-stone-800 z-10" />
                <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-stone-800 z-10" />
                <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-stone-800 z-10" />
                <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-stone-800 z-10" />

                <div className="w-full h-48 bg-stone-100 overflow-hidden relative rounded-2xs">
                  <img
                    src={
                      attachments.length > 0
                        ? attachments[0].url
                        : 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800'
                    }
                    alt="Archival Photograph"
                    className="w-full h-full object-cover filter sepia-[0.3] brightness-95 contrast-105"
                  />
                </div>

                <div className="pt-2 text-center text-xs font-serif italic text-stone-700">
                  {attachments.length > 0 && attachments[0].caption
                    ? attachments[0].caption
                    : 'Marine Drive Promenade · Monsoon Archives 1948'}
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onUploadPhoto}
                    className="text-[10px] font-mono uppercase tracking-wider bg-stone-800 text-stone-100 px-3 py-1 rounded-xs hover:bg-stone-700 transition-colors cursor-pointer"
                  >
                    {attachments.length > 0 ? 'Replace Photograph' : 'Mount Custom Photograph'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Postal Mark Cachet (Air Mail, Time Capsule, Postcard) */}
          {isAirMail && (
            <div className="mb-6 flex items-center justify-between">
              <span className="inline-block bg-[#1d3557] text-white text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-xs">
                PAR AVION · AIR MAIL
              </span>
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#1d3557]/40 flex flex-col items-center justify-center text-[8px] font-mono text-[#1d3557] rotate-[-8deg] select-none">
                <span>BOMBAY</span>
                <span>G.P.O.</span>
                <span>TRANSIT</span>
              </div>
            </div>
          )}

          {/* Salutation */}
          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Dear [Recipient],"
                className="w-full text-xl sm:text-2xl font-medium bg-transparent border-b border-transparent hover:border-current/20 focus:border-current/40 focus:outline-none transition-colors"
                style={{ color: fg }}
              />
            ) : (
              <h2 className="text-xl sm:text-2xl font-medium tracking-tight" style={{ color: fg }}>
                {greeting}
              </h2>
            )}
          </div>

          {/* Letter Body / Postcard Split Layout */}
          {isPostcard ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-2 border-t border-b py-6" style={{ borderColor: border }}>
              {/* Left Column: Message */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: muted }}>
                  COMMUNICATION
                </div>
                {isEditing ? (
                  <textarea
                    value={content}
                    onChange={(e) => onContentChange?.(e.target.value)}
                    placeholder="Inscribe your thoughts here..."
                    rows={8}
                    className="w-full bg-transparent resize-y text-sm sm:text-base leading-relaxed focus:outline-none"
                    style={{ color: fg }}
                  />
                ) : (
                  <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap" style={{ color: fg }}>
                    {content || <span className="opacity-50 italic">This card awaits your greeting...</span>}
                  </div>
                )}
              </div>

              {/* Right Column: Stamp & Address */}
              <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 space-y-4" style={{ borderColor: border }}>
                <div className="flex justify-end">
                  <div className="w-16 h-20 border-2 border-dashed flex flex-col items-center justify-center p-1 text-center" style={{ borderColor: border, backgroundColor: `${border}25` }}>
                    <span className="text-[8px] font-mono uppercase" style={{ color: muted }}>INDIA POST</span>
                    <span className="text-sm">🐘</span>
                    <span className="text-[7px] font-mono" style={{ color: muted }}>48H POST</span>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: muted }}>
                    ADDRESSED TO:
                  </div>
                  <div className="border-b pb-1 text-sm font-serif" style={{ borderColor: border, color: fg }}>{recipientName}</div>
                  <div className="border-b pb-1 text-xs font-mono" style={{ borderColor: border, color: muted }}>
                    Poste Restante · {t.sampleCity || 'Hyderabad'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Letter Body */
            <div className="flex-1 my-2">
              {isEditing ? (
                <textarea
                  value={content}
                  onChange={(e) => onContentChange?.(e.target.value)}
                  placeholder="Write your letter here without haste. Some things are worth taking the time to say..."
                  rows={12}
                  className={`w-full bg-transparent resize-y text-base sm:text-lg leading-relaxed focus:outline-none transition-colors ${
                    isDiary ? 'leading-8' : 'leading-relaxed'
                  }`}
                  style={{
                    color: fg,
                    lineHeight: isTypewriter ? '1.8' : isDiary ? '2.1' : '1.85',
                  }}
                />
              ) : (
                <div
                  className="whitespace-pre-wrap text-base sm:text-lg select-text font-normal leading-relaxed"
                  style={{
                    color: fg,
                    lineHeight: isTypewriter ? '1.8' : isDiary ? '2.1' : '1.85',
                  }}
                >
                  {content || (
                    <span className="opacity-50 italic">This letter sheet awaits your words...</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attached Photos / Archival Keepsakes */}
          {attachments.length > 0 && (
            <div className="my-8 pt-6 border-t" style={{ borderColor: `${border}60` }}>
              <div className="text-[11px] uppercase tracking-widest mb-3 font-mono" style={{ color: muted }}>
                Enclosed Keepsake
              </div>
              <div className="flex flex-wrap gap-4">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative p-2.5 bg-white shadow-md border rounded-xs rotate-[-1deg] max-w-xs transition-transform hover:rotate-0"
                    style={{ borderColor: border }}
                  >
                    <div className="w-full h-44 bg-stone-100 overflow-hidden relative">
                      <img
                        src={att.url}
                        alt={att.caption || 'Attached photo'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {/* Archival corner mounts */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-stone-700" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-stone-700" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-stone-700" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-stone-700" />
                    </div>
                    {att.caption && (
                      <div className="pt-2 text-center text-xs font-serif italic text-stone-700">
                        {att.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valediction & Signature */}
          <div className="mt-8 pt-4 flex flex-col items-end text-right">
            {isEditing ? (
              <div className="w-64 space-y-1">
                <input
                  type="text"
                  value={signoff}
                  onChange={(e) => onSignoffChange?.(e.target.value)}
                  placeholder="From,"
                  className="w-full text-right text-base sm:text-lg bg-transparent border-b border-transparent hover:border-current/20 focus:border-current/40 focus:outline-none"
                  style={{ color: fg }}
                />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => onSenderChange?.(e.target.value)}
                  placeholder="Your name"
                  className="w-full text-right text-lg sm:text-xl font-medium bg-transparent border-b border-dashed focus:outline-none"
                  style={{ color: fg, borderColor: border }}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-base sm:text-lg italic" style={{ color: fg }}>{signoff}</div>
                <div className="text-lg sm:text-xl font-medium tracking-tight" style={{ color: fg }}>
                  {senderName || 'Anonymous'}
                </div>
              </div>
            )}
          </div>

          {/* Bureau Footer & Wax Seal Watermark */}
          <div
            className="mt-12 pt-6 border-t flex items-center justify-between text-[10px] sm:text-[11px] font-mono select-none"
            style={{ borderColor: `${border}60`, color: muted }}
          >
            <span>OLD-LETTERS ARCHIVE</span>
            <span className="text-lg" style={{ color: accent }}>{t.waxSealStyle?.emblem || '✒'}</span>
            <span>DISPATCH REF · {t.postalMarks.docketNumber || 'OL-2026'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
