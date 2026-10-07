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
      : templateId === 'typewritten'
      ? 'typewriter'
      : templateId === 'burgundy'
      ? 'love-letter'
      : templateId === 'diary'
      ? 'personal-diary'
      : templateId === 'postcard'
      ? 'vintage-postcard'
      : templateId === 'photo'
      ? 'archival-photo'
      : templateId === 'botanical'
      ? 'botanical-archive'
      : templateId === 'capsule'
      ? 'time-capsule'
      : templateId;

  const t = customTemplate || TEMPLATES.find((tpl) => tpl.id === normalizedId) || TEMPLATES[0];

  // Data-driven fallback values for greeting, recipient, and sender
  const effectiveRecipient = recipientName && recipientName.trim() ? recipientName.trim() : 'Recipient Name';
  const effectiveSender = senderName && senderName.trim() ? senderName.trim() : 'Your Name';
  const effectiveGreeting =
    greeting && greeting.trim()
      ? greeting
      : recipientName && recipientName.trim()
      ? `Dear ${recipientName.trim()},`
      : 'Dear Recipient,';

  // Contrast-safe theme tokens
  const bg = t.paperBackground || t.paperColor || '#FAF6EE';
  const fg = t.paperForeground || t.inkColor || '#3A2520';
  const muted = t.paperMuted || '#7A655C';
  const accent = t.paperAccent || '#5C1D24';
  const border = t.paperBorder || '#CBBDA5';

  const isDarkPaper =
    t.id === 'midnight-archive' ||
    t.id === 'secret-letter' ||
    t.id === 'ol-004' ||
    bg.toLowerCase() === '#111b24' ||
    bg.toLowerCase() === '#1a1617' ||
    bg.toLowerCase() === '#1e252b';

  // Postcard front/back flip state
  const [postcardSide, setPostcardSide] = useState<'message' | 'front'>('message');

  // Archetype flags (every template has its own distinct treatment)
  const isPostcard = t.id === 'vintage-postcard';
  const isTypewriter = t.id === 'typewriter';
  const isAirMail = t.id === 'air-mail';
  const isMidnight = t.id === 'midnight-archive';
  const isLove = t.id === 'love-letter';
  const isBlushRose = t.id === 'blush-pressed-rose';
  const isVellum = t.id === 'antique-vellum';
  const isDiary = t.id === 'personal-diary';
  const isPhoto = t.id === 'archival-photo';
  const isBotanical = t.id === 'botanical-archive' || t.id === 'pressed-flowers';
  const isTimeCapsule = t.id === 'time-capsule';
  const isApology = t.id === 'apology';
  const isThankYou = t.id === 'thank-you';
  const isBirthday = t.id === 'birthday';
  const isCongratulations = t.id === 'congratulations';
  const isEncouragement = t.id === 'encouragement';
  const isGoodbye = t.id === 'goodbye';
  const isSecret = t.id === 'secret-letter';
  const isCustom = t.id === 'custom-letter';
  const isFuture = t.id === 'future-letter';
  const isAmbassador = t.id === 'ol-001';
  const isPoet = t.id === 'ol-002';
  const isMaritime = t.id === 'ol-003';
  const isNocturneSolitude = t.id === 'ol-004';
  const isIvory = t.id === 'ivory-classic';

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto rounded-xs transition-all duration-300 ${className}`}
      style={{
        backgroundColor: bg,
        color: fg,
        boxShadow: isDarkPaper
          ? '0 6px 28px rgba(0,0,0,0.7), 0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,78,0.4)'
          : isTypewriter
          ? '0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px #d6cbbe'
          : isAirMail
          ? '0 4px 16px rgba(15,23,42,0.1), 0 16px 40px rgba(15,23,42,0.08), 0 0 0 1px #cbd5e1'
          : isVellum
          ? '0 8px 32px rgba(45,30,20,0.1), 0 24px 60px rgba(45,30,20,0.08), 0 0 0 1px rgba(212,155,56,0.35)'
          : isLove
          ? '0 6px 24px rgba(120,20,40,0.12), 0 18px 48px rgba(120,20,40,0.08), 0 0 0 1px rgba(190,140,150,0.4)'
          : isBlushRose
          ? '0 4px 20px rgba(180,120,130,0.1), 0 14px 40px rgba(180,120,130,0.08), 0 0 0 1px #f0d5db'
          : isDiary
          ? '0 4px 12px rgba(0,0,0,0.05), 0 12px 30px rgba(0,0,0,0.06), 0 0 0 1px #ded7cd'
          : isThankYou
          ? '0 6px 24px rgba(180,140,60,0.12), 0 18px 48px rgba(180,140,60,0.08), 0 0 0 1px #e2cf9f'
          : isCongratulations
          ? '0 8px 30px rgba(120,90,30,0.15), 0 22px 55px rgba(120,90,30,0.1), 0 0 0 1px #d6b870'
          : isSecret
          ? '0 8px 32px rgba(0,0,0,0.6), 0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px #dc2626'
          : '0 2px 6px rgba(40,25,15,0.05), 0 12px 30px rgba(40,25,15,0.08), 0 28px 64px rgba(40,25,15,0.07), 0 0 0 1px rgba(215,200,180,0.6)',
      }}
    >
      {/* Universal paper fiber grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] rounded-xs mix-blend-multiply"
        style={{
          backgroundImage: 'radial-gradient(#1a140f 0.75px, transparent 0.75px)',
          backgroundSize: '10px 10px',
        }}
      />

      {/* Postcard Flip Button */}
      {isPostcard && (
        <div className="absolute top-3 right-3 z-30">
          <button
            type="button"
            onClick={() => setPostcardSide((s) => (s === 'message' ? 'front' : 'message'))}
            className="text-[10px] font-mono tracking-wider uppercase bg-[#e5dec9] hover:bg-[#d8d0b9] text-stone-800 px-3 py-1.5 rounded-xs border border-stone-400 transition-colors shadow-xs cursor-pointer font-bold"
          >
            Flip: {postcardSide === 'message' ? 'Show Picture Front' : 'Show Writing Back'}
          </button>
        </div>
      )}

      {/* ---------------- REVERSE SIDE VIEW (WHEN FLIPPED) ---------------- */}
      {showReverseSide ? (
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col justify-between min-h-[580px] relative z-10">
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
        /* ====================================================================== */
        /* POSTCARD FRONT: ARCHIVAL PHOTOGRAPH VIEW                               */
        /* ====================================================================== */
        <div className="p-8 sm:p-12 min-h-[540px] flex flex-col justify-between items-center text-center">
          <div className="w-full h-80 bg-stone-200 border-2 border-[#baa993] rounded-xs overflow-hidden relative shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&q=80&w=1000"
              alt="Archival Historical Heritage"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover filter sepia-[0.35] brightness-95"
            />
            <div className="absolute bottom-3 left-4 text-white font-serif text-lg drop-shadow-md tracking-wider">
              Heritage Architectural Series · Archival Preservation
            </div>
          </div>
          <div className="text-xs font-mono tracking-widest uppercase text-stone-500 pt-4">
            CENTRAL POSTAL HISTORICAL SERIES · CARD NO. 1892
          </div>
        </div>
      ) : isPostcard ? (
        /* ====================================================================== */
        /* POSTCARD BACK: AUTHENTIC SPLIT POSTCARD WITH DIVIDER & ADDRESS LINES   */
        /* ====================================================================== */
        <div className="p-6 sm:p-10 font-serif flex flex-col min-h-[580px] relative z-10 text-stone-900 bg-[#FAF4E6]">
          {/* Top Postcard Banner */}
          <div className="text-center pb-4 border-b-2 border-stone-800 flex items-center justify-center relative">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-serif tracking-[0.25em] font-bold text-stone-900">
                POST CARD
              </h1>
              <div className="text-[9px] font-mono tracking-widest text-stone-600 uppercase mt-0.5">
                UNIVERSAL POSTAL CONSERVANCY · CARTE POSTALE
              </div>
            </div>
          </div>

          {/* Split 2-Column Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 flex-1">
            {/* Left Column: Correspondence (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-between pr-0 md:pr-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 border-b border-stone-300 pb-1">
                  <span>CORRESPONDENCE ONLY</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => onDateChange?.(e.target.value)}
                      className="text-right bg-transparent border-b border-stone-400 focus:outline-none"
                    />
                  ) : (
                    <span>{date}</span>
                  )}
                </div>

                <div className="pt-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={greeting}
                      onChange={(e) => onGreetingChange?.(e.target.value)}
                      placeholder="Dear Recipient,"
                      className="w-full text-lg font-serif font-bold bg-transparent border-b border-stone-300 focus:outline-none"
                    />
                  ) : (
                    <h2 className="text-lg font-serif font-bold tracking-tight text-stone-900">
                      {effectiveGreeting}
                    </h2>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    value={content}
                    onChange={(e) => onContentChange?.(e.target.value)}
                    placeholder="Inscribe postcard message..."
                    rows={10}
                    className="w-full bg-transparent resize-y text-sm sm:text-base leading-[1.8] focus:outline-none font-serif text-stone-800"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm sm:text-base select-text font-serif leading-[1.8] text-stone-800">
                    {content || <span className="opacity-50 italic">Awaiting postcard message...</span>}
                  </div>
                )}
              </div>

              {/* Left Column Signoff */}
              <div className="pt-4 border-t border-stone-200 mt-4 text-right">
                {isEditing ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={signoff}
                      onChange={(e) => onSignoffChange?.(e.target.value)}
                      placeholder="Fondly,"
                      className="w-full text-right text-xs italic bg-transparent border-b border-stone-300 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => onSenderChange?.(e.target.value)}
                      placeholder="Your Name"
                      className="w-full text-right text-sm font-bold bg-transparent border-b border-stone-300 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="text-xs italic text-stone-600">{signoff || 'Fondly,'}</div>
                    <div className="text-sm font-bold text-stone-900">{effectiveSender}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Center Vertical Divider (on desktop) */}
            <div className="hidden md:block w-px bg-stone-400/80 -my-2" />

            {/* Right Column: Stamp Box & Address Lines (5 cols) */}
            <div className="md:col-span-4 flex flex-col justify-between pl-0 md:pl-2">
              <div className="space-y-6">
                {/* Vintage Postage Stamp Box with Cancellation */}
                <div className="flex justify-end">
                  <div className="relative w-24 h-28 border-2 border-dashed border-stone-700 bg-[#efe6d3] p-1.5 flex flex-col items-center justify-between text-center select-none shadow-xs">
                    <span className="text-[8px] font-mono uppercase text-stone-600">PLACE STAMP HERE</span>
                    <div className="w-10 h-10 border border-stone-600 rounded-full flex items-center justify-center text-xs">
                      ❦
                    </div>
                    <span className="text-[8px] font-mono text-stone-500">25 POSTAL</span>

                    {/* Cancellation Stamp overlay */}
                    <div className="absolute -left-5 top-8 w-20 h-8 border-y-2 border-stone-800 flex flex-col justify-center text-[7px] font-mono uppercase text-stone-800 rotate-[-12deg] bg-transparent opacity-80 pointer-events-none">
                      <span className="font-bold">TRANSIT CANCELLED</span>
                      <span>48-H POSTAL</span>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="space-y-3 pt-2">
                  <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                    ADDRESS / DESTINATION:
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-stone-400 pb-1 text-sm font-serif font-bold text-stone-900">
                      To: {effectiveRecipient}
                    </div>
                    <div className="border-b border-stone-400 pb-1 text-xs font-serif text-stone-700 italic">
                      c/o The Postal Conservancy Vault
                    </div>
                    <div className="border-b border-stone-400 pb-1 text-xs font-serif text-stone-700">
                      Destination: Scheduled Transit Delivery
                    </div>
                    <div className="border-b border-stone-400 pb-1 text-xs font-mono text-stone-500">
                      Interval: 48-Hour Sealed Protection
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[9px] font-mono text-stone-400 text-center pt-6 uppercase">
                SERIES 1892 · PRINTED BY OLD-LETTERS
              </div>
            </div>
          </div>
        </div>
      ) : isTypewriter ? (
        /* ====================================================================== */
        /* TYPEWRITTEN POST: MECHANICAL DOCKET MEMORANDUM                         */
        /* ====================================================================== */
        <div className="p-8 sm:p-12 lg:p-14 font-mono flex flex-col min-h-[580px] relative z-10 text-stone-900">
          {/* Mechanical Docket Header Box */}
          <div className="mb-6 border-2 border-stone-800 p-4 bg-stone-900/[0.03] space-y-2.5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2 text-[11px] font-bold tracking-widest uppercase">
              <span>POSTAL MEMORANDUM // SPEED: 48-H</span>
              <span>DOCKET: {t.postalMarks.docketNumber || 'TYP-48'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 uppercase tracking-wider">TO:</span>
                <span className="font-bold underline">{effectiveRecipient}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-500 uppercase tracking-wider">DATE:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => onDateChange?.(e.target.value)}
                    className="font-bold bg-transparent border-b border-stone-600 focus:outline-none"
                  />
                ) : (
                  <span className="font-bold">{date}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-500 uppercase tracking-wider">FROM:</span>
                <span className="font-bold underline">{effectiveSender}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-500 uppercase tracking-wider">STATUS:</span>
                <span className="font-bold text-red-700">SEALED IN TRANSIT</span>
              </div>
            </div>
          </div>

          {/* Typewriter Salutation with Left Rule */}
          <div className="mb-6 pl-4 sm:pl-8 border-l-2 border-red-500/50">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="DEAR RECIPIENT:"
                className="w-full text-base sm:text-lg font-bold tracking-tight bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
              />
            ) : (
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {effectiveGreeting.toUpperCase()}
              </h2>
            )}
          </div>

          {/* Typewriter Body */}
          <div className="flex-1 my-2 pl-4 sm:pl-8 border-l-2 border-red-500/30">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe typewritten dispatch..."
                rows={12}
                className="w-full bg-transparent resize-y text-sm sm:text-base leading-[2.1] tracking-tight focus:outline-none font-mono"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm sm:text-base leading-[2.1] tracking-tight font-mono select-text">
                {content || <span className="opacity-50 italic">Awaiting mechanical typewriter transcription...</span>}
              </div>
            )}
          </div>

          {/* Typewriter Signoff */}
          <div className="mt-8 pt-4 pl-4 sm:pl-8 border-l-2 border-red-500/50 space-y-1">
            <div className="text-xs text-stone-500 uppercase tracking-wider">SIGNED // AUTHENTIC DISPATCH:</div>
            {isEditing ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={signoff}
                  onChange={(e) => onSignoffChange?.(e.target.value)}
                  placeholder="Respectfully,"
                  className="w-full text-sm font-bold bg-transparent border-b border-stone-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => onSenderChange?.(e.target.value)}
                  placeholder="Your Name"
                  className="w-full text-base font-bold underline bg-transparent border-b border-stone-400 focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <div className="text-sm font-bold">{signoff || 'Respectfully,'}</div>
                <div className="text-base sm:text-lg font-bold tracking-wider underline">{effectiveSender}</div>
              </div>
            )}
            <div className="text-[10px] text-stone-400 font-mono pt-1">
              RECORD HELD AT OLD-LETTERS MECHANICAL VAULT // REF #EP-1892
            </div>
          </div>

          {/* Typewriter Machine Footer */}
          <div className="mt-10 pt-4 border-t-2 border-stone-800 flex items-center justify-between text-[10px] tracking-widest text-stone-600 uppercase select-none">
            <span>OLYMPIA MECHANICAL COURIER</span>
            <span>CARBON RIBBON CONFIDENTIAL</span>
          </div>
        </div>
      ) : isAirMail ? (
        /* ====================================================================== */
        /* AIR MAIL PAR AVION: TRANSATLANTIC AVIATION DISPATCH                    */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-sans flex flex-col min-h-[580px] relative z-10 text-slate-900">
          {/* Repeating Chevron Borders Top and Bottom */}
          <div
            className="absolute inset-x-0 top-0 h-3.5 z-20 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, #dc2626, #dc2626 12px, #ffffff 12px, #ffffff 18px, #2563eb 18px, #2563eb 30px, #ffffff 30px, #ffffff 36px)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-3.5 z-20 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, #dc2626, #dc2626 12px, #ffffff 12px, #ffffff 18px, #2563eb 18px, #2563eb 30px, #ffffff 30px, #ffffff 36px)',
            }}
          />

          {/* Air Mail Header: Cachet Badge + Transit Cancellation Stamp */}
          <div className="mb-8 pt-2 flex items-start justify-between border-b pb-5 border-slate-200">
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2 bg-[#1e3a8a] text-white px-3 py-1.5 rounded-xs shadow-xs font-mono text-xs font-bold tracking-widest uppercase">
                <span>✈</span>
                <span>PAR AVION · AIR MAIL</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                TRANSATLANTIC RAPID TRANSIT
              </span>
            </div>

            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#1e3a8a]/70 flex flex-col items-center justify-center text-[8px] font-mono text-[#1e3a8a] rotate-[-6deg] select-none shadow-xs">
              <span className="font-bold">AERO POST</span>
              <span>{date}</span>
              <span className="text-[7px]">FLIGHT 402</span>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-100/80 px-3 py-1 rounded-xs">
            <span>ROUTE: {t.postalMarks.cachetCity || 'METROPOLITAN POST'} ✈ AIR COURIER</span>
            {isEditing ? (
              <input
                type="text"
                value={date}
                onChange={(e) => onDateChange?.(e.target.value)}
                className="text-right bg-transparent border-b border-slate-400 focus:outline-none"
              />
            ) : (
              <span>DATE: {date}</span>
            )}
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Dear Recipient,"
                className="w-full text-2xl font-serif font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl font-serif font-medium tracking-tight text-slate-900">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2 pl-3 border-l border-blue-300/60">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe transatlantic airmail dispatch..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-relaxed focus:outline-none font-serif text-slate-900"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text font-serif leading-relaxed text-slate-900">
                {content || <span className="opacity-50 italic">Awaiting air mail letter inscription...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between">
            <div className="border border-blue-200 bg-blue-50/60 px-3 py-1.5 rounded-xs text-[10px] font-mono text-blue-900 select-none">
              ✈ AIR TRANSIT VAULT VERIFIED
            </div>

            <div className="text-right space-y-1">
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={signoff}
                    onChange={(e) => onSignoffChange?.(e.target.value)}
                    placeholder="From,"
                    className="w-full text-right text-base italic bg-transparent border-b border-slate-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => onSenderChange?.(e.target.value)}
                    placeholder="Your Name"
                    className="w-full text-right text-lg font-medium bg-transparent border-b border-slate-300 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <div className="text-base italic text-slate-700">{signoff || 'Warmest regards,'}</div>
                  <div className="text-lg font-medium text-slate-900">{effectiveSender}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase select-none">
            <span>UNIVERSAL POSTAL UNION · AIR ENVELOPE</span>
            <span>48-HOUR VAULT INTERVAL</span>
          </div>
        </div>
      ) : isMidnight ? (
        /* ====================================================================== */
        /* MIDNIGHT ARCHIVE: CELESTIAL NOCTURNE MANUSCRIPT                        */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#F7F0E5]">
          {/* Gold Filigree Border with Starbursts */}
          <div className="absolute inset-3.5 border pointer-events-none" style={{ borderColor: '#BFA27070' }}>
            <div className="absolute inset-1 border" style={{ borderColor: '#BFA27035' }} />
            <span className="absolute top-1 left-1.5 text-xs text-[#e2c974]">✦</span>
            <span className="absolute top-1 right-1.5 text-xs text-[#e2c974]">✦</span>
            <span className="absolute bottom-1 left-1.5 text-xs text-[#e2c974]">✦</span>
            <span className="absolute bottom-1 right-1.5 text-xs text-[#e2c974]">✦</span>
          </div>

          <div className="mb-8 pb-4 border-b border-[#BFA270]/40 flex items-center justify-between text-[10px] font-mono tracking-widest text-[#BFA270]">
            <div className="flex items-center gap-2">
              <span className="text-sm">✦</span>
              <span>NOCTURNE OBSERVATORY · MERIDIAN 02:00 AM</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={date}
                onChange={(e) => onDateChange?.(e.target.value)}
                className="text-right text-xs bg-transparent border-b border-[#BFA270]/60 focus:outline-none text-[#F7F0E5]"
              />
            ) : (
              <span>{date}</span>
            )}
          </div>

          <div className="mb-6 flex items-center justify-between text-[10px] font-mono text-[#C5BAA9]/70 tracking-widest border-b border-[#BFA270]/20 pb-2">
            <span>COORDINATES: LAT 17°23&apos;N · AZIMUTH 142°</span>
            <span>STARLIGHT CHRONO VAULT</span>
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Dear Recipient,"
                className="w-full text-2xl sm:text-3xl font-light tracking-wide bg-transparent border-b border-transparent hover:border-[#BFA270]/40 focus:border-[#BFA270] focus:outline-none text-[#F7F0E5]"
              />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-[#F7F0E5]">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe midnight correspondence in starlight ink..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.1] tracking-wide focus:outline-none text-[#F7F0E5]"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text font-light leading-[2.1] tracking-wide text-[#F7F0E5]">
                {content || <span className="opacity-50 italic">The stars await your inscription...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-[#BFA270]/20">
            <div className="flex items-center gap-2 text-[#BFA270]">
              <span className="text-xl">☾</span>
              <span className="text-[11px] font-mono tracking-widest uppercase">STARLIGHT SEALED</span>
            </div>

            <div className="text-right space-y-1">
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={signoff}
                    onChange={(e) => onSignoffChange?.(e.target.value)}
                    placeholder="Under the same stars,"
                    className="w-full text-right text-base italic bg-transparent border-b border-[#BFA270]/40 focus:outline-none text-[#F7F0E5]"
                  />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => onSenderChange?.(e.target.value)}
                    placeholder="Your Name"
                    className="w-full text-right text-lg font-medium bg-transparent border-b border-[#BFA270]/40 focus:outline-none text-[#F7F0E5]"
                  />
                </div>
              ) : (
                <div>
                  <div className="text-base italic text-[#C5BAA9]">{signoff || 'Under the same stars,'}</div>
                  <div className="text-lg font-medium text-[#F7F0E5]">{effectiveSender}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#BFA270]/30 flex items-center justify-between text-[10px] font-mono text-[#BFA270] tracking-widest select-none">
            <span>OBSERVATORY TRANSIT VAULT</span>
            <span>CHRONO RECORD NO. 74</span>
          </div>
        </div>
      ) : isLove ? (
        /* ====================================================================== */
        /* LOVE LETTER: BURGUNDY VELVET & INTIMATE BILLET-DOUX                    */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#3a1d23]">
          {/* Crimson Ornate Frame */}
          <div className="absolute inset-3.5 border pointer-events-none" style={{ borderColor: '#84182460' }}>
            <div className="absolute inset-1 border border-dashed" style={{ borderColor: '#84182430' }} />
            <div className="absolute top-1 left-1 text-xs font-serif text-[#841824]">❦</div>
            <div className="absolute top-1 right-1 text-xs font-serif text-[#841824]">❦</div>
            <div className="absolute bottom-1 left-1 text-xs font-serif text-[#841824]">❦</div>
            <div className="absolute bottom-1 right-1 text-xs font-serif text-[#841824]">❦</div>
          </div>

          <div className="mb-8 text-center border-b pb-5 border-[#841824]/20 space-y-1">
            <div className="text-[10px] font-mono tracking-[0.3em] text-[#841824] uppercase font-semibold">
              — BILLET-DOUX · CONFIDENTIAL HEARTS —
            </div>
            <div className="text-xs italic text-stone-500">
              {isEditing ? (
                <input
                  type="text"
                  value={date}
                  onChange={(e) => onDateChange?.(e.target.value)}
                  className="text-center bg-transparent border-b border-stone-300 focus:outline-none"
                />
              ) : (
                <span>In the stillness of evening · {date}</span>
              )}
            </div>
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="My Dearest,"
                className="w-full text-2xl sm:text-3xl italic font-light bg-transparent border-b border-transparent hover:border-[#841824]/30 focus:border-[#841824] focus:outline-none text-[#5c1620]"
              />
            ) : (
              <h2 className="text-2xl sm:text-3xl italic font-light tracking-tight text-[#5c1620]">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe your deepest devotion..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.1] font-serif focus:outline-none text-[#3a1d23]"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text font-serif leading-[2.1] text-[#3a1d23]">
                {content || <span className="opacity-50 italic">Awaiting words of patient devotion...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-[#841824]/20">
            <div className="text-xl text-[#841824] select-none">❦</div>
            <div className="text-right space-y-1">
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={signoff}
                    onChange={(e) => onSignoffChange?.(e.target.value)}
                    placeholder="Forever yours,"
                    className="w-full text-right text-base italic bg-transparent border-b border-stone-300 focus:outline-none text-[#5c1620]"
                  />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => onSenderChange?.(e.target.value)}
                    placeholder="Your Name"
                    className="w-full text-right text-lg font-medium bg-transparent border-b border-stone-300 focus:outline-none text-[#3a1d23]"
                  />
                </div>
              ) : (
                <div>
                  <div className="text-base italic text-[#6e3740]">{signoff || 'Forever yours,'}</div>
                  <div className="text-lg font-medium text-[#3a1d23]">{effectiveSender}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#841824]/20 text-center text-[10px] font-mono tracking-widest uppercase text-[#841824]/70 select-none">
            Inscribed for one heart alone · Sealed against all others
          </div>
        </div>
      ) : isBlushRose ? (
        /* ====================================================================== */
        /* BLUSH PRESSED ROSE: FRENCH SALON EPISTOLARY & PRESSED FLORA            */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#4c242d] bg-[#FFF5F5]">
          {/* Delicate Scalloped Border Frame */}
          <div className="absolute inset-4 border border-dashed border-[#e8b5be] pointer-events-none rounded-sm">
            <div className="absolute inset-1 border border-dotted border-[#f2ccd3]" />
          </div>

          {/* Centered Rose Cartouche Header */}
          <div className="mb-8 text-center space-y-2 pb-4 border-b border-[#f0c2cb]">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/70 border border-[#e8b5be] rounded-full text-[9px] font-mono uppercase tracking-[0.2em] text-[#a04658]">
              <span>🌸</span>
              <span>BILLET DE ROSE · PARIS SCRIPTORIUM</span>
              <span>🌸</span>
            </div>
            <div className="text-xs italic text-[#7a414d] font-serif">
              {isEditing ? (
                <input
                  type="text"
                  value={date}
                  onChange={(e) => onDateChange?.(e.target.value)}
                  className="text-center bg-transparent border-b border-[#e8b5be] focus:outline-none text-[#4c242d]"
                />
              ) : (
                <span>Sous les roses épanouies · {date}</span>
              )}
            </div>
          </div>

          <div className="mb-6 pl-4">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Chère âme,"
                className="w-full text-2xl font-serif italic text-[#731f32] bg-transparent border-b border-transparent hover:border-[#e8b5be] focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl font-serif italic tracking-tight text-[#731f32]">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2 pl-4">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe delicate poetic prose..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.1] font-serif italic focus:outline-none text-[#4c242d]"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text font-serif italic leading-[2.1] text-[#4c242d]">
                {content || <span className="opacity-50">Words pressed like rose petals between forgotten book leaves...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-[#f0c2cb]">
            <div className="text-sm font-mono text-[#a04658] uppercase tracking-wider">
              PÉTALE PRESSÉ № 18
            </div>
            <div className="text-right space-y-1">
              <div className="text-base italic text-[#8a384b]">{signoff || 'Avec tendresse,'}</div>
              <div className="text-lg font-medium text-[#5c1c2b]">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isThankYou ? (
        /* ====================================================================== */
        /* THANK YOU: ILLUMINATED CARTOUCHE OF GRATITUDE                          */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#3E2D1A] bg-[#FDF9F0]">
          {/* Golden Laurel Double Border */}
          <div className="absolute inset-4 border-2 border-[#D8BE75] pointer-events-none">
            <div className="absolute inset-1.5 border border-[#E9D99F]" />
            <span className="absolute top-1 left-2 text-sm text-[#BFA24E]">🌿</span>
            <span className="absolute top-1 right-2 text-sm text-[#BFA24E]">🌿</span>
            <span className="absolute bottom-1 left-2 text-sm text-[#BFA24E]">🌿</span>
            <span className="absolute bottom-1 right-2 text-sm text-[#BFA24E]">🌿</span>
          </div>

          {/* Illuminated Cartouche Header */}
          <div className="mb-8 text-center space-y-2 pb-5 border-b border-[#D8BE75]/40">
            <div className="inline-block px-4 py-1.5 border-2 border-[#D8BE75] bg-[#F9F1D8] text-[10px] font-mono tracking-[0.25em] text-[#7A5B18] uppercase font-bold shadow-xs">
              ✦ EXPRESSION OF HEARTFELT GRATITUDE ✦
            </div>
            <div className="text-xs font-mono text-[#8C6D29] tracking-wider uppercase">
              REGISTER OF APPRECIATION · {date}
            </div>
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Dearest Benefactor,"
                className="w-full text-2xl font-serif font-bold text-[#4F3610] bg-transparent border-b border-transparent hover:border-[#D8BE75] focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#4F3610]">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Express your sincere gratitude..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.05] focus:outline-none text-[#3E2D1A]"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text leading-[2.05] text-[#3E2D1A]">
                {content || <span className="opacity-50 italic">The page waits to record words of genuine thankfulness...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-[#D8BE75]/50">
            <div className="text-xl text-[#BFA24E]">⚜</div>
            <div className="text-right space-y-1">
              <div className="text-base italic text-[#7A5B18]">{signoff || 'With boundless appreciation,'}</div>
              <div className="text-lg font-bold text-[#3E2D1A]">{effectiveSender}</div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#D8BE75]/30 text-center text-[9px] font-mono uppercase tracking-widest text-[#8C6D29]">
            HONORING KINDNESS PRESERVED IN TIME · PERMANENT TRIBUTE
          </div>
        </div>
      ) : isCongratulations ? (
        /* ====================================================================== */
        /* CONGRATULATIONS: CIVIC PROCLAMATION & TRIUMPH                          */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-stone-900 bg-[#FAF7F0]">
          {/* Roman Architectural Border */}
          <div className="absolute inset-3 border-2 border-stone-800 pointer-events-none">
            <div className="absolute inset-1 border border-stone-400" />
            <div className="absolute top-2 left-2 text-xs">🏛</div>
            <div className="absolute top-2 right-2 text-xs">🏛</div>
            <div className="absolute bottom-2 left-2 text-xs">🏛</div>
            <div className="absolute bottom-2 right-2 text-xs">🏛</div>
          </div>

          {/* Grand Civic Header */}
          <div className="mb-8 text-center space-y-2 border-b-2 border-stone-800 pb-5">
            <div className="text-sm font-bold tracking-[0.25em] uppercase text-amber-900">
              PROCLAMATION OF ACHIEVEMENT & HONOR
            </div>
            <div className="text-xs font-mono text-stone-500 uppercase tracking-widest">
              OFFICIAL ACCLAIM · PROMULGATED ON {date}
            </div>
          </div>

          <div className="mb-6 text-center">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="To the Victorious,"
                className="w-full text-center text-2xl font-bold uppercase tracking-wider bg-transparent border-b border-stone-400 focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-stone-900">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2 px-4 sm:px-8 border-x border-stone-300">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe proclamation of victory and praise..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.1] focus:outline-none text-stone-800"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text leading-[2.1] text-stone-800">
                {content || <span className="opacity-50 italic">The proclamation awaits citation of your triumph...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t-2 border-stone-800">
            <div className="text-xs font-mono uppercase text-stone-500">
              SEALED WITH LAUREL OF TRIUMPH
            </div>
            <div className="text-right">
              <div className="text-base italic text-stone-600">{signoff || 'In celebration of your victory,'}</div>
              <div className="text-lg font-bold text-stone-900">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isBirthday ? (
        /* ====================================================================== */
        /* BIRTHDAY: JUBILEE ANNIVERSARY CALENDAR FOLIO                           */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#382618] bg-[#FDF8EE]">
          {/* Celebratory Golden Garland Frame */}
          <div className="absolute inset-4 border border-[#e2c77d] pointer-events-none">
            <div className="absolute inset-1.5 border border-dashed border-[#d1b25d]" />
            <span className="absolute top-1 left-2 text-xs">🌟</span>
            <span className="absolute top-1 right-2 text-xs">🌟</span>
            <span className="absolute bottom-1 left-2 text-xs">🌟</span>
            <span className="absolute bottom-1 right-2 text-xs">🌟</span>
          </div>

          {/* Calendar Milestone Header */}
          <div className="mb-8 flex items-center justify-between border-b border-[#e2c77d] pb-4">
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-[#966b26]">
                COMMEMORATIVE ANNIVERSARY JUBILEE
              </div>
              <div className="text-lg font-serif font-bold text-[#5c3e16]">
                A Celebration of Your Journey
              </div>
            </div>

            <div className="border border-[#b88f3b] bg-[#fbf1d5] p-2 text-center rounded-xs shadow-2xs">
              <div className="text-[8px] font-mono uppercase text-[#73501a]">DATE OF CELEBRATION</div>
              <div className="text-xs font-mono font-bold text-[#5c3e16]">{date}</div>
            </div>
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Dearest Celebrant,"
                className="w-full text-2xl font-serif font-bold text-[#5c3e16] bg-transparent border-b border-transparent hover:border-[#b88f3b] focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#5c3e16]">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe birthday blessings and heartfelt wishes..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.0] focus:outline-none text-[#382618]"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text leading-[2.0] text-[#382618]">
                {content || <span className="opacity-50 italic">Awaiting joyful birthday wishes for this milestone...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-[#e2c77d]">
            <div className="text-xs font-mono text-[#966b26] uppercase">
              GOLDEN MILESTONE RECORD
            </div>
            <div className="text-right">
              <div className="text-base italic text-[#78531d]">{signoff || 'With joyful wishes,'}</div>
              <div className="text-lg font-bold text-[#5c3e16]">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isSecret ? (
        /* ====================================================================== */
        /* SECRET DISPATCH: CLASSIFIED REDACTED VAULT DOSSIER                     */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-mono flex flex-col min-h-[580px] relative z-10 text-[#E6EDF2] bg-[#1E252B]">
          {/* Stamped Red Alert Header */}
          <div className="mb-6 p-4 border-2 border-red-600 bg-red-950/20 space-y-2 select-none">
            <div className="flex items-center justify-between border-b border-red-600 pb-2">
              <span className="text-xs font-bold text-red-500 tracking-widest uppercase">
                [ TOP SECRET // RESTRICTED ACCESS ]
              </span>
              <span className="text-[10px] text-red-400">CLEARANCE: LEVEL-4</span>
            </div>
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span>DISPATCH REF: {t.postalMarks.docketNumber || 'SEC-0091'}</span>
              <span>SEAL INTEGRITY: UNCOMPROMISED</span>
            </div>
          </div>

          <div className="mb-6 text-xs text-stone-400 border-b border-stone-700 pb-2 flex items-center justify-between">
            <span>TO: [RECIPIENT EYES ONLY] — {effectiveRecipient}</span>
            <span>DATE: {date}</span>
          </div>

          <div className="mb-4">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="ATTENTION RECIPIENT:"
                className="w-full text-lg font-mono font-bold text-white bg-transparent border-b border-stone-600 focus:outline-none"
              />
            ) : (
              <h2 className="text-lg font-mono font-bold text-white tracking-wide">
                {effectiveGreeting.toUpperCase()}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2 bg-black/20 p-4 border border-stone-800">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe classified intelligence..."
                rows={12}
                className="w-full bg-transparent resize-y text-sm sm:text-base leading-[2.1] font-mono focus:outline-none text-stone-200"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm sm:text-base select-text font-mono leading-[2.1] text-stone-200">
                {content || <span className="opacity-40 italic">[Awaiting confidential encrypted cipher...]</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-stone-700 flex items-end justify-between">
            <div className="text-[10px] text-red-400 font-mono">
              DESTROY OR STORE UNDER SEAL UPON READING
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-400">{signoff || 'In strict confidence,'}</div>
              <div className="text-base font-bold text-white">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isEncouragement ? (
        /* ====================================================================== */
        /* ENCOURAGEMENT: BEACON OF RESOLVE & FORTITUDE                           */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#1F2D24] bg-[#F4F7F4]">
          {/* Architectural Grounded Side Pillars */}
          <div className="absolute inset-y-0 left-6 w-[2px] bg-[#3B5442]/30 pointer-events-none" />
          <div className="absolute inset-y-0 right-6 w-[2px] bg-[#3B5442]/30 pointer-events-none" />

          {/* Beacon Header */}
          <div className="mb-8 pl-6 pr-6 flex items-center justify-between border-b border-[#3B5442]/30 pb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#2B3E31] uppercase tracking-widest">
              <span>⚓</span>
              <span>THE BEACON RECORD · ARCHIVE OF RESILIENCE</span>
            </div>
            <span className="text-xs font-mono text-stone-500">{date}</span>
          </div>

          <div className="mb-6 pl-6 pr-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="To a Steadfast Soul,"
                className="w-full text-2xl font-bold text-[#1F2D24] bg-transparent border-b border-stone-300 focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl font-bold tracking-tight text-[#1F2D24]">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2 pl-6 pr-6">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe words of enduring strength and belief..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.1] focus:outline-none text-[#1F2D24]"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text leading-[2.1] text-[#1F2D24]">
                {content || <span className="opacity-50 italic">Awaiting words to steady the storm...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 pl-6 pr-6 flex items-end justify-between border-t border-[#3B5442]/30">
            <div className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
              UNSHAKEN IN PURPOSE
            </div>
            <div className="text-right">
              <div className="text-base italic text-[#3B5442]">{signoff || 'With unshakable belief in you,'}</div>
              <div className="text-lg font-bold text-[#1F2D24]">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isGoodbye ? (
        /* ====================================================================== */
        /* GOODBYE: FAREWELLS & PARTING HORIZON                                   */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-stone-800 bg-[#F7F5F2]">
          {/* Drifting Birds Header */}
          <div className="mb-10 text-center space-y-2 border-b border-stone-300 pb-5">
            <div className="text-lg text-stone-500 select-none">🕊 〰〰 🕊</div>
            <div className="text-[10px] font-mono tracking-[0.25em] text-stone-400 uppercase">
              AT THE DEPARTURE THRESHOLD · {date}
            </div>
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Dear Traveller,"
                className="w-full text-2xl font-serif italic text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl font-serif italic tracking-tight text-stone-900">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe parting words of benediction and memory..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.1] italic focus:outline-none text-stone-800"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text italic leading-[2.1] text-stone-800">
                {content || <span className="opacity-50">Words whispered before the ship departs from harbor...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-stone-300">
            <div className="text-xs font-mono text-stone-400 uppercase">
              UNTIL THE NEXT EMBARKATION
            </div>
            <div className="text-right">
              <div className="text-base italic text-stone-600">{signoff || 'Until our paths meet again,'}</div>
              <div className="text-lg font-medium text-stone-900">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isCustom ? (
        /* ====================================================================== */
        /* CUSTOM: ATELIER BESPOKE DRAFTING SPECIFICATION                         */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-mono flex flex-col min-h-[580px] relative z-10 text-stone-900 bg-[#FAF9F5]">
          {/* Technical Corner Crosshairs */}
          <div className="absolute top-2 left-2 text-[10px] text-stone-400 select-none">+</div>
          <div className="absolute top-2 right-2 text-[10px] text-stone-400 select-none">+</div>
          <div className="absolute bottom-2 left-2 text-[10px] text-stone-400 select-none">+</div>
          <div className="absolute bottom-2 right-2 text-[10px] text-stone-400 select-none">+</div>

          {/* Metric Scale Left Line */}
          <div className="absolute top-8 bottom-8 left-3 w-[1px] bg-stone-300 pointer-events-none" />

          {/* Modernist Atelier Header */}
          <div className="mb-8 pl-4 flex items-start justify-between border-b-2 border-stone-900 pb-3">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase">
                ATELIER BESPOKE // CORRESPONDENCE SPEC.
              </div>
              <div className="text-[10px] text-stone-500 font-sans mt-0.5">
                Precision Typography & Custom Spatial Alignment
              </div>
            </div>
            <span className="text-xs font-bold">{date}</span>
          </div>

          <div className="mb-6 pl-4">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="RE: CORRESPONDENCE"
                className="w-full text-lg font-bold uppercase bg-transparent border-b border-stone-300 focus:outline-none"
              />
            ) : (
              <h2 className="text-lg font-bold uppercase tracking-wider text-stone-900">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2 pl-4">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe custom tailored prose..."
                rows={12}
                className="w-full bg-transparent resize-y text-sm sm:text-base leading-[2.0] font-sans focus:outline-none text-stone-900"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm sm:text-base select-text font-sans leading-[2.0] text-stone-900">
                {content || <span className="opacity-50 italic">Awaiting custom tailored drafting...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 pl-4 flex items-end justify-between border-t border-stone-300">
            <span className="text-[10px] text-stone-400">ARCHITECTURAL GRID: 12-PT BASELINE</span>
            <div className="text-right">
              <div className="text-xs font-mono text-stone-500">{signoff || 'Precisely yours,'}</div>
              <div className="text-sm font-bold uppercase tracking-wider">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isFuture ? (
        /* ====================================================================== */
        /* FUTURE LETTER: CHRONOMETER HORIZON EXPEDITION                          */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-mono flex flex-col min-h-[580px] relative z-10 text-stone-900 bg-[#F4F1EA]">
          {/* Chronometric Timeline Bar */}
          <div className="mb-6 p-3 bg-stone-900 text-stone-100 flex items-center justify-between text-xs">
            <span className="font-bold tracking-widest uppercase">⏳ CHRONOMETRIC TIMELINE HORIZON</span>
            <span className="font-mono text-amber-300">DISPATCH APPOINTED: {date}</span>
          </div>

          <div className="mb-6 border-b border-stone-400 pb-2 flex items-center justify-between text-xs text-stone-600">
            <span>TRANSMITTED ACROSS YEARS</span>
            <span>DESTINATION: {effectiveRecipient}</span>
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="To My Future Self / Recipient,"
                className="w-full text-xl font-bold bg-transparent border-b border-stone-400 focus:outline-none"
              />
            ) : (
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="What will the world be when this envelope arrives?"
                rows={12}
                className="w-full bg-transparent resize-y text-base leading-[2.0] font-mono focus:outline-none"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base leading-[2.0] select-text font-mono">
                {content || <span className="opacity-50 italic">Awaiting inscription for the horizon of time...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t-2 border-stone-900 flex items-end justify-between">
            <span className="text-[10px] text-stone-500">CHRONO LOCK INTERVAL VERIFIED</span>
            <div className="text-right">
              <div className="text-xs font-bold text-stone-600">{signoff || 'Across the years,'}</div>
              <div className="text-base font-bold underline">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isAmbassador ? (
        /* ====================================================================== */
        /* OL-001: THE AMBASSADOR (EMBASSY DIPLOMATIC PROTOCOL)                   */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-stone-900 bg-[#FCFAF5]">
          <div className="absolute inset-4 border border-[#BFA270] pointer-events-none">
            <div className="absolute inset-1 border border-dashed border-[#BFA270]/50" />
          </div>

          <div className="mb-8 text-center space-y-1 border-b border-[#BFA270] pb-4">
            <div className="text-xl text-[#BFA270]">⚜</div>
            <div className="text-xs font-mono tracking-[0.25em] text-[#7A5B18] uppercase font-bold">
              EMBASSY DIPLOMATIC CORRESPONDENCE POUCH
            </div>
            <div className="text-[10px] font-mono text-stone-500 uppercase">
              BILATERAL PROTOCOL · {date}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              {effectiveGreeting}
            </h2>
          </div>

          <div className="flex-1 my-2">
            <div className="whitespace-pre-wrap text-base sm:text-lg leading-[2.0] text-stone-800">
              {content || <span className="opacity-50 italic">Diplomatic memorandum inscription...</span>}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#BFA270] flex items-end justify-between">
            <span className="text-[10px] font-mono text-[#7A5B18]">CONSULAR ENVOY DISPATCH</span>
            <div className="text-right">
              <div className="text-sm italic text-stone-600">{signoff || 'With highest consideration,'}</div>
              <div className="text-base font-bold text-stone-900">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isPoet ? (
        /* ====================================================================== */
        /* OL-002: THE POET'S LEDGER (STANZA CENTERED VERSE)                      */
        /* ====================================================================== */
        <div className="p-10 sm:p-16 lg:p-20 font-serif flex flex-col min-h-[580px] relative z-10 text-[#2B231D] bg-[#FBF7F0] text-center">
          <div className="mb-10 text-xs font-mono text-stone-400 uppercase tracking-[0.3em]">
            STANZA & CADENCE · {date}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-serif italic text-[#4A3528]">
              {effectiveGreeting}
            </h2>
          </div>

          <div className="flex-1 my-4 max-w-lg mx-auto">
            <div className="whitespace-pre-wrap text-base sm:text-lg font-serif italic leading-[2.3] text-[#2B231D]">
              {content || <span className="opacity-50">Stanzas waiting upon quiet parchment...</span>}
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-stone-200 space-y-1">
            <div className="text-sm italic text-stone-500">{signoff || 'In poetry and silence,'}</div>
            <div className="text-base font-serif font-bold text-[#4A3528]">{effectiveSender}</div>
          </div>
        </div>
      ) : isMaritime ? (
        /* ====================================================================== */
        /* OL-003: MARITIME COURIER (COASTAL NAVAL DISPATCH)                      */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-mono flex flex-col min-h-[580px] relative z-10 text-[#0F2338] bg-[#F2F6FA]">
          <div className="mb-8 flex items-center justify-between border-b-2 border-[#1E3A5F] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚓</span>
              <span className="text-xs font-bold tracking-widest uppercase text-[#1E3A5F]">
                MARITIME POSTAL COURIER // HARBOR DISPATCH
              </span>
            </div>
            <span className="text-xs text-blue-900 font-bold">{date}</span>
          </div>

          <div className="mb-6 text-[10px] tracking-widest text-slate-500 border-b border-slate-300 pb-1">
            COASTAL NAVIGATION RECORD · LAT 17°38&apos;N LON 78°28&apos;E
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-[#0F2338]">
              {effectiveGreeting}
            </h2>
          </div>

          <div className="flex-1 my-2">
            <div className="whitespace-pre-wrap text-sm sm:text-base leading-[2.0] font-sans text-slate-800">
              {content || <span className="opacity-50 italic">Harbor dispatch log awaits entry...</span>}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t-2 border-[#1E3A5F] flex items-end justify-between">
            <span className="text-[10px] text-blue-800">NAVAL TRANSIT AUTHORITY</span>
            <div className="text-right">
              <div className="text-xs italic text-slate-600">{signoff || 'Fair winds and calm seas,'}</div>
              <div className="text-base font-bold text-[#0F2338]">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isNocturneSolitude ? (
        /* ====================================================================== */
        /* OL-004: NOCTURNE SOLITUDE (MINIMALIST OBSIDIAN & PLATINUM)             */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#E0E6ED] bg-[#0E1116]">
          <div className="absolute inset-4 border border-stone-800 pointer-events-none" />

          <div className="mb-10 text-center space-y-1 border-b border-stone-800 pb-4">
            <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-stone-500">
              SOLITUDE · THE VELVET HOUR
            </div>
            <div className="text-xs font-mono text-stone-400">{date}</div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-light tracking-wide text-white">
              {effectiveGreeting}
            </h2>
          </div>

          <div className="flex-1 my-2">
            <div className="whitespace-pre-wrap text-base sm:text-lg font-light leading-[2.2] text-stone-300">
              {content || <span className="opacity-40 italic">In the quiet silence of the night...</span>}
            </div>
          </div>

          <div className="mt-10 pt-4 border-t border-stone-800 flex items-end justify-between">
            <span className="text-[10px] font-mono text-stone-600">NIGHT VAULT</span>
            <div className="text-right">
              <div className="text-sm italic text-stone-400">{signoff || 'In silent truth,'}</div>
              <div className="text-base font-medium text-white">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isVellum ? (
        /* ====================================================================== */
        /* ANTIQUE VELLUM: CHANCERY SCRIPTORIUM MANUSCRIPT                        */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#4A3528]">
          <div className="absolute inset-3 border-2 pointer-events-none" style={{ borderColor: `${border}90` }}>
            <div className="absolute inset-1 border border-dotted pointer-events-none" style={{ borderColor: `${border}50` }} />
            <span className="absolute top-1 left-2 text-[11px]" style={{ color: accent }}>⚜</span>
            <span className="absolute top-1 right-2 text-[11px]" style={{ color: accent }}>⚜</span>
            <span className="absolute bottom-1 left-2 text-[11px]" style={{ color: accent }}>⚜</span>
            <span className="absolute bottom-1 right-2 text-[11px]" style={{ color: accent }}>⚜</span>
          </div>

          <div className="mb-8 pb-4 border-b border-[#a89070]/40 flex items-center justify-between text-xs text-[#6b4c3b]">
            <div className="flex items-center gap-2 tracking-widest uppercase text-[10px] font-mono font-bold">
              <span>⚜</span>
              <span>CHANCERY ARCHIVAL REGISTER · No. 882</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={date}
                onChange={(e) => onDateChange?.(e.target.value)}
                className="text-right text-xs bg-transparent border-b border-[#a89070] focus:outline-none text-[#4A3528]"
              />
            ) : (
              <span className="italic font-serif">{date}</span>
            )}
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="To the Esteemed Recipient,"
                className="w-full text-2xl font-serif font-medium bg-transparent border-b border-transparent hover:border-[#a89070]/40 focus:border-[#6b4c3b] focus:outline-none text-[#4A3528]"
              />
            ) : (
              <h2 className="text-2xl font-serif font-medium tracking-tight text-[#4A3528]">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Inscribe chancery parchment deed..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[2.0] focus:outline-none text-[#4A3528]"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text font-normal leading-[2.0] text-[#4A3528]">
                {content || <span className="opacity-50 italic">Awaiting chancery scriptorium entry...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-[#a89070]/30">
            <div className="text-2xl text-[#76533A] select-none">⚜</div>
            <div className="text-right space-y-1">
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={signoff}
                    onChange={(e) => onSignoffChange?.(e.target.value)}
                    placeholder="In witness whereof,"
                    className="w-full text-right text-base italic bg-transparent border-b border-[#a89070] focus:outline-none text-[#4A3528]"
                  />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => onSenderChange?.(e.target.value)}
                    placeholder="Your Name"
                    className="w-full text-right text-lg font-medium bg-transparent border-b border-[#a89070] focus:outline-none text-[#4A3528]"
                  />
                </div>
              ) : (
                <div>
                  <div className="text-base italic text-[#6E5443]">{signoff || 'In witness whereof,'}</div>
                  <div className="text-lg font-medium text-[#4A3528]">{effectiveSender}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#a89070]/30 flex items-center justify-between text-[10px] font-mono text-[#6b4c3b] uppercase select-none">
            <span>EX OFFICINA TABELLIONIS</span>
            <span>ARCHIVUM PERPETUUM</span>
          </div>
        </div>
      ) : isDiary ? (
        /* ====================================================================== */
        /* PERSONAL DIARY: RULED INTIMATE JOURNAL NOTEBOOK                        */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 pl-16 sm:pl-20 text-stone-900">
          {/* Blue Ruled Lines and Red Left Margin Line */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #60a5fa 32px)',
              backgroundPosition: '0 5rem',
            }}
          />
          <div className="absolute top-0 bottom-0 left-12 sm:left-16 w-[1.5px] bg-red-400/40 pointer-events-none" />

          <div className="mb-8 flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
              PRIVATE JOURNAL ENTRY
            </span>
            {isEditing ? (
              <input
                type="text"
                value={date}
                onChange={(e) => onDateChange?.(e.target.value)}
                className="text-right text-xs font-serif italic bg-transparent border-b border-stone-300 focus:outline-none"
              />
            ) : (
              <span className="text-xs font-serif italic text-stone-600">{date}</span>
            )}
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Dear friend,"
                className="w-full text-xl sm:text-2xl font-serif bg-transparent border-b border-transparent hover:border-stone-300 focus:outline-none"
              />
            ) : (
              <h2 className="text-xl sm:text-2xl font-serif tracking-tight text-stone-900">
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Write your journal entry..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[32px] focus:outline-none font-serif"
              />
            ) : (
              <div className="whitespace-pre-wrap text-base sm:text-lg select-text font-serif leading-[32px] text-stone-900">
                {content || <span className="opacity-50 italic">The journal page awaits your thoughts...</span>}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex flex-col items-end text-right">
            {isEditing ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={signoff}
                  onChange={(e) => onSignoffChange?.(e.target.value)}
                  placeholder="Always,"
                  className="w-full text-right text-base italic bg-transparent border-b border-stone-300 focus:outline-none"
                />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => onSenderChange?.(e.target.value)}
                  placeholder="Your Name"
                  className="w-full text-right text-lg font-medium bg-transparent border-b border-stone-300 focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <div className="text-base italic text-stone-600">{signoff || 'Always,'}</div>
                <div className="text-lg font-medium text-stone-900">{effectiveSender}</div>
              </div>
            )}
          </div>

          <div className="mt-10 pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400 uppercase select-none">
            <span>PAGE 142</span>
            <span>PRIVATE THOUGHTS LEDGER</span>
          </div>
        </div>
      ) : isPhoto ? (
        /* ====================================================================== */
        /* ARCHIVAL PHOTO FOLIO: MOUNTED SPECIMEN & STUDY NOTES                   */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-stone-900">
          <div className="mb-8 p-4 bg-stone-900/5 border border-stone-300 rounded-xs flex flex-col items-center">
            <div className="relative p-3 bg-white shadow-md border border-stone-200 rounded-xs max-w-sm w-full">
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
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover filter sepia-[0.3] brightness-95"
                />
              </div>

              <div className="pt-2 text-center text-xs font-serif italic text-stone-700">
                {attachments.length > 0 && attachments[0].caption
                  ? attachments[0].caption
                  : 'Historical Specimen Study · Archival Folio 1948'}
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

          <div className="mb-6">
            <h2 className="text-2xl font-serif font-medium tracking-tight text-stone-900">
              {effectiveGreeting}
            </h2>
          </div>

          <div className="flex-1 my-2">
            <div className="whitespace-pre-wrap text-base sm:text-lg select-text font-serif leading-relaxed text-stone-900">
              {content || <span className="opacity-50 italic">Awaiting inscription for this photograph folio...</span>}
            </div>
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-stone-200">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
              PHOTOGRAPHIC REGISTRY NO. 1892
            </span>
            <div className="text-right">
              <div className="text-base italic text-stone-600">{signoff || 'In memory,'}</div>
              <div className="text-lg font-medium text-stone-900">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isTimeCapsule ? (
        /* ====================================================================== */
        /* TIME CAPSULE: TEMPORAL VAULT LOCK DOCKET                               */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-mono flex flex-col min-h-[580px] relative z-10 text-stone-900">
          <div className="absolute inset-3 border-2 border-dashed border-red-800/60 pointer-events-none" />

          <div className="mb-6 p-4 border-2 border-dashed border-red-800/70 bg-red-950/5 rounded-xs flex items-center justify-between gap-4 select-none">
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-red-900 font-bold flex items-center gap-1.5">
                <span>⏳</span>
                <span>TEMPORAL VAULT LOCK · APPOINTED UNSEALING:</span>
              </div>
              <div className="font-mono text-base sm:text-lg font-bold text-red-950 tracking-wider">
                {date || '12 OCTOBER 2036'}
              </div>
              <div className="text-[9px] font-mono text-red-800/80">
                DOC REF: CAP-VAULT-48 · CRYPTOGRAPHIC INTERVAL RESTRICTION
              </div>
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-red-800/50 flex flex-col items-center justify-center text-[9px] font-mono text-red-900 rotate-[-12deg] font-bold">
              <span>LOCKED</span>
              <span>48H</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              {effectiveGreeting}
            </h2>
          </div>

          <div className="flex-1 my-2">
            <div className="whitespace-pre-wrap text-base leading-[2.0] select-text font-mono">
              {content || <span className="opacity-50 italic">Awaiting message for future unsealing...</span>}
            </div>
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t-2 border-stone-800">
            <div className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
              LOCKED AT T=0
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-stone-700">{signoff || 'Across time,'}</div>
              <div className="text-lg font-bold underline">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isBotanical ? (
        /* ====================================================================== */
        /* BOTANICAL ARCHIVE & PRESSED FLORA: HERBARIUM SPECIMEN SHEET            */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-[#25392b] bg-[#F4F7F2]">
          <div className="mb-8 flex items-start justify-between border-b border-[#25392b]/20 pb-4">
            <div className="flex items-center gap-2 text-xs font-serif text-[#25392b]">
              <span className="text-base">🌿</span>
              <span className="font-mono text-[10px] tracking-widest uppercase">CONSERVATORY HERBARIUM</span>
            </div>
            <div className="border border-[#25392b]/40 bg-[#25392b]/5 px-3 py-1 text-right rounded-xs">
              <div className="text-[9px] font-mono tracking-widest uppercase text-[#25392b]/80">
                SPECIMEN NO. 42 · FLORA
              </div>
              <div className="text-xs font-mono font-medium">{date}</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-serif font-medium tracking-tight text-[#25392b]">
              {effectiveGreeting}
            </h2>
          </div>

          <div className="flex-1 my-2 pl-3 border-l-2 border-[#25392b]/20">
            <div className="whitespace-pre-wrap text-base sm:text-lg select-text font-serif leading-[2.0] text-[#25392b]">
              {content || <span className="opacity-50 italic">Awaiting inscription upon the botanical sheet...</span>}
            </div>
          </div>

          <div className="mt-8 pt-4 flex items-end justify-between border-t border-[#25392b]/20">
            <div className="text-xl text-[#25392b]">🌲</div>
            <div className="text-right">
              <div className="text-base italic text-[#3e5645]">{signoff || 'In nature and friendship,'}</div>
              <div className="text-lg font-medium text-[#25392b]">{effectiveSender}</div>
            </div>
          </div>
        </div>
      ) : isApology ? (
        /* ====================================================================== */
        /* APOLOGY: QUIET CONTEMPLATIVE MINIMALIST REFLECTION                     */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-stone-800 bg-[#F9F8F6]">
          <div className="mb-10 text-center space-y-1">
            <div className="text-base text-stone-500 select-none">— 🌿 —</div>
            <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-stone-400">
              {date}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-serif font-light tracking-wide text-stone-900">
              {effectiveGreeting}
            </h2>
          </div>

          <div className="flex-1 my-2">
            <div className="whitespace-pre-wrap text-lg select-text font-serif font-light leading-[2.1] text-stone-800">
              {content || <span className="opacity-50 italic">The page waits quietly for your honest reflection...</span>}
            </div>
          </div>

          <div className="mt-10 pt-4 flex flex-col items-end text-right border-t border-stone-200/60">
            <div className="text-base italic text-stone-600">{signoff || 'Sincerely and with care,'}</div>
            <div className="text-lg font-normal text-stone-900">{effectiveSender}</div>
          </div>
        </div>
      ) : (
        /* ====================================================================== */
        /* IVORY CLASSICAL & DIPLOMATIC (LETTERPRESS BUREAU DESK)                 */
        /* ====================================================================== */
        <div className="p-8 sm:p-14 lg:p-16 font-serif flex flex-col min-h-[580px] relative z-10 text-stone-900 bg-[#FAF6EE]">
          {/* Classic Double Border with Corner Florets */}
          <div className="absolute inset-3 border pointer-events-none" style={{ borderColor: `${border}80` }}>
            <div className="absolute inset-1 border" style={{ borderColor: `${border}40` }} />
            <span className="absolute -top-2.5 -left-1 text-xs" style={{ color: accent }}>❦</span>
            <span className="absolute -top-2.5 -right-1 text-xs" style={{ color: accent }}>❦</span>
            <span className="absolute -bottom-2.5 -left-1 text-xs" style={{ color: accent }}>❦</span>
            <span className="absolute -bottom-2.5 -right-1 text-xs" style={{ color: accent }}>❦</span>
          </div>

          <div className="mb-8 border-b pb-4 flex items-center justify-between" style={{ borderColor: `${border}70` }}>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono tracking-widest uppercase" style={{ color: muted }}>
              <span>CORRESPONDENCE BUREAU</span>
              <span>·</span>
              <span className="font-semibold text-stone-900">{t.name}</span>
            </div>

            {isEditing ? (
              <input
                type="text"
                value={date}
                onChange={(e) => onDateChange?.(e.target.value)}
                placeholder="Date"
                className="text-right text-xs tracking-wider uppercase font-mono bg-transparent border-b border-dashed focus:outline-none"
                style={{ color: muted, borderColor: border }}
              />
            ) : (
              <span className="text-xs tracking-wider uppercase font-mono" style={{ color: muted }}>
                {date}
              </span>
            )}
          </div>

          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={greeting}
                onChange={(e) => onGreetingChange?.(e.target.value)}
                placeholder="Dear Recipient,"
                className="w-full text-2xl font-serif font-normal bg-transparent border-b border-transparent hover:border-current/20 focus:border-current/40 focus:outline-none"
                style={{ color: fg }}
              />
            ) : (
              <h2 className="text-2xl font-serif font-normal tracking-tight" style={{ color: fg }}>
                {effectiveGreeting}
              </h2>
            )}
          </div>

          <div className="flex-1 my-2">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange?.(e.target.value)}
                placeholder="Write your letter here without haste. Some things are worth taking the time to say..."
                rows={12}
                className="w-full bg-transparent resize-y text-base sm:text-lg leading-[1.95] focus:outline-none"
                style={{ color: fg }}
              />
            ) : (
              <div
                className="whitespace-pre-wrap text-base sm:text-lg select-text font-normal leading-[1.95]"
                style={{ color: fg }}
              >
                {content || <span className="opacity-50 italic">This letter sheet awaits your words...</span>}
              </div>
            )}
          </div>

          {/* Attached Keepsakes if any */}
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
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
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

          <div className="mt-8 pt-4 flex flex-col items-end text-right">
            {isEditing ? (
              <div className="w-64 space-y-1">
                <input
                  type="text"
                  value={signoff}
                  onChange={(e) => onSignoffChange?.(e.target.value)}
                  placeholder="With affection,"
                  className="w-full text-right text-base sm:text-lg bg-transparent border-b border-transparent hover:border-current/20 focus:border-current/40 focus:outline-none"
                  style={{ color: fg }}
                />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => onSenderChange?.(e.target.value)}
                  placeholder="Your Name"
                  className="w-full text-right text-lg sm:text-xl font-medium bg-transparent border-b border-dashed focus:outline-none"
                  style={{ color: fg, borderColor: border }}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-base sm:text-lg italic" style={{ color: fg }}>{signoff || 'With affection,'}</div>
                <div className="text-lg sm:text-xl font-medium tracking-tight" style={{ color: fg }}>
                  {effectiveSender}
                </div>
              </div>
            )}
          </div>

          <div
            className="mt-12 pt-6 border-t flex items-center justify-between text-[10px] sm:text-[11px] font-mono select-none"
            style={{ borderColor: `${border}60`, color: muted }}
          >
            <span>OLD-LETTERS ARCHIVE</span>
            <span className="text-lg" style={{ color: accent }}>{t.waxSealStyle?.emblem || '✒'}</span>
            <span>DISPATCH REF · {t.postalMarks.docketNumber || 'EP-1892'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
