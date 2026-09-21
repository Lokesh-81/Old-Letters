import { useState, useRef, useEffect } from 'react';
import { LetterData, StationeryTemplate } from '../types';
import { STATIONERY_TEMPLATES, LETTER_CATEGORIES } from '../data/mockData';
import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { StampSelection, getVintageStamp } from './StampSelection';
import { motion, AnimatePresence } from 'motion/react';
import {
  Image as ImageIcon,
  Video,
  Feather,
  ArrowRight,
  Maximize2,
  Minimize2,
  Trash2,
  Check,
  Bookmark,
} from 'lucide-react';

interface LetterEditorProps {
  letterData: LetterData;
  onChangeLetter: (data: Partial<LetterData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function LetterEditor({
  letterData,
  onChangeLetter,
  onContinue,
  onBack,
}: LetterEditorProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showInspirations, setShowInspirations] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [stampModalOpen, setStampModalOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeStamp = getVintageStamp(letterData.stampId || 'airmail-1928');

  const template =
    STATIONERY_TEMPLATES.find((t) => t.id === letterData.templateId) ||
    STATIONERY_TEMPLATES[0];

  const category =
    LETTER_CATEGORIES.find((c) => c.id === letterData.categoryId) ||
    LETTER_CATEGORIES[0];

  // Calculate words and reading time
  const words = letterData.letterBody.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.round(words / 130));

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChangeLetter({ letterBody: e.target.value });
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const samplePrompts = [
    'Describe the physical memory of a place you shared together.',
    'Write about something you never said out loud because the room was too loud.',
    'Tell them how their voice or presence shifted your perspective on an ordinary day.',
    'Confess what you hope will still be true between you when seasons change.',
  ];

  return (
    <div
      className={`max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 transition-all duration-300 ${
        fullscreen ? 'fixed inset-0 z-50 bg-[#F6F1EA] overflow-y-auto max-w-none p-6' : ''
      }`}
    >
      {/* Top Bar / Navigation / Fullscreen Toggle */}
      <div className="flex items-center justify-between border-b border-[#E3D7C5] pb-4 mb-8">
        <button
          onClick={onBack}
          className="text-xs font-mono tracking-wider uppercase text-[#7E6E62] hover:text-[#2C241F] flex items-center gap-1"
        >
          ← Change Stationery ({template.name})
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-[#7E6E62] hover:text-[#2C241F]"
            title={fullscreen ? 'Exit writing immersion' : 'Immersive full desk mode'}
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{fullscreen ? 'STANDARD VIEW' : 'IMMERSIVE VIEW'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#886C3E] uppercase">
            <span className="font-bold text-[#5A2528]">STEP 03</span>
            <span className="text-stone-400">/ 05</span>
            <span className="text-stone-400">• THE DESK</span>
          </div>
        </div>
      </div>

      {/* Main Desk Layout: Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Live Tactile Stationery Preview Sheet */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 order-2 lg:order-1">
          <div className="flex items-center justify-between mb-3 text-xs font-mono text-[#7E6E62]">
            <span className="tracking-widest uppercase">LIVE STATIONERY SPECIMEN</span>
            <span>
              {words} WORDS • ~{readingTimeMin} MIN READ
            </span>
          </div>

          <motion.div
            id="stationery-live-sheet"
            animate={
              isTyping
                ? {
                    rotate: [0, -0.3, 0.25, -0.15, 0],
                    scale: [1, 1.0035, 0.999, 1],
                    y: [0, -1.5, 0.8, 0],
                    boxShadow: [
                      '0 20px 32px -10px rgba(44, 36, 31, 0.15)',
                      '0 26px 42px -8px rgba(44, 36, 31, 0.24)',
                      '0 20px 32px -10px rgba(44, 36, 31, 0.15)',
                    ],
                  }
                : {
                    rotate: 0,
                    scale: 1,
                    y: 0,
                    boxShadow: '0 20px 32px -10px rgba(44, 36, 31, 0.15)',
                  }
            }
            whileHover={{
              y: -4,
              rotate: 0.25,
              scale: 1.004,
              boxShadow: '0 28px 46px -8px rgba(44, 36, 31, 0.24)',
              transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
            }}
            transition={{
              duration: 0.38,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`w-full min-h-[580px] p-8 sm:p-10 rounded-sm relative transition-colors duration-300 flex flex-col justify-between border border-black/10 overflow-hidden ${template.paperTextureClass}`}
            style={{
              backgroundColor: template.paperBg,
              color: template.inkColor,
            }}
          >
            {/* Subtle paper-crinkle sheen reaction on typing */}
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-sm mix-blend-soft-light transition-opacity duration-300 z-10"
              animate={{
                opacity: isTyping ? 0.45 : 0,
              }}
              style={{
                backgroundImage: `radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.9) 0%, transparent 70%), repeating-linear-gradient(45deg, rgba(44,36,31,0.02) 0px, rgba(44,36,31,0.02) 1px, transparent 1px, transparent 4px)`,
              }}
            />

            {/* Top postal header */}
            <div className="flex items-start justify-between border-b border-black/10 pb-4 mb-6 relative z-10">
              <div>
                <div className="text-[9px] font-mono tracking-widest uppercase opacity-60">
                  DISPATCH REF: {letterData.trackingCode} // {category.name.toUpperCase()}
                </div>
                <div className="font-serif text-sm italic mt-1 font-medium opacity-85">
                  {letterData.fromLocation || 'OLD-LETTERS Sanctuary No. 4'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Postmark date={letterData.postedDate || '21 SEP 2026'} city="OLD-LETTERS" />
                <div
                  onClick={() => setStampModalOpen(true)}
                  className="relative group cursor-pointer"
                  title="Click to browse and affix vintage postage stamps"
                >
                  <PostageStamp
                    stampId={letterData.stampId || 'airmail-1928'}
                    accentColor={template.sealColor}
                  />
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-[#241D18] text-[#FAF8F5] text-[8px] font-mono px-2 py-0.5 rounded shadow-sm z-20 pointer-events-none uppercase tracking-wider">
                    AFFIX STAMP ✎
                  </div>
                </div>
              </div>
            </div>

            {/* Letter Body rendered in typography style */}
            <div className="flex-1 space-y-4">
              <div className="font-serif text-lg italic font-medium opacity-90">
                Dear {letterData.toName || 'Someone Special'},
              </div>

              <div
                className={`whitespace-pre-line leading-relaxed text-base sm:text-lg ${
                  template.fontFamily === 'serif'
                    ? 'font-serif'
                    : template.fontFamily === 'script'
                    ? 'font-script text-xl sm:text-2xl leading-normal'
                    : 'font-mono text-sm leading-relaxed'
                }`}
              >
                {letterData.letterBody || (
                  <span className="opacity-30 italic">
                    Your words will appear here as you write at the desk...
                  </span>
                )}
              </div>

              {/* Tucked Polaroid Photograph Specimen if attached */}
              {letterData.photoAttachment && (
                <div className="pt-4 flex justify-center sm:justify-end">
                  <div
                    className="p-3 bg-white shadow-md border border-neutral-200 rounded-xs max-w-[220px] transform rotate-[-2deg] transition-transform hover:rotate-0"
                    style={{
                      boxShadow: '0 8px 16px -2px rgba(0,0,0,0.15)',
                    }}
                  >
                    <img
                      src={letterData.photoAttachment.url}
                      alt="Enclosed photograph"
                      referrerPolicy="no-referrer"
                      className="w-full h-28 object-cover rounded-xs filter sepia-[0.25]"
                    />
                    <div className="pt-2 text-[10px] font-script text-neutral-700 text-center leading-tight">
                      {letterData.photoAttachment.caption}
                    </div>
                  </div>
                </div>
              )}

              {/* Super-8 Film enclosure if attached */}
              {letterData.videoNote?.isIncluded && (
                <div className="mt-3 p-3 rounded bg-stone-900/10 border border-stone-800/20 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#5A2528]" />
                    <span className="font-medium">SUPER-8 FILM: {letterData.videoNote.title}</span>
                  </div>
                  <span className="text-[10px] text-[#5A2528] tracking-widest font-bold">
                    {letterData.videoNote.duration}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Sign-off & Seal */}
            <div className="border-t border-black/10 pt-6 mt-8 flex items-end justify-between">
              <div>
                <div className="text-xs font-serif italic opacity-75">With warmth,</div>
                <div
                  className={`text-xl sm:text-2xl font-bold mt-1 ${
                    template.fontFamily === 'script' ? 'font-script text-3xl' : 'font-serif'
                  }`}
                >
                  {letterData.signature || letterData.fromName || 'Lokesh'}
                </div>
                <div className="text-[9px] font-mono tracking-widest uppercase opacity-50 mt-1">
                  SEALED IN CONFIDENTIAL TRANSIT
                </div>
              </div>

              <WaxSeal size="md" color={template.sealColor} initial="PO" />
            </div>
          </motion.div>
        </div>

        {/* RIGHT: Writing Controls & Postal Add-ons */}
        <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
          <div className="bg-[#FAF8F5] p-6 sm:p-8 rounded-xl border border-[#D8C4A9] paper-shadow">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E3D7C5]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#886C3E]">
                  MANUSCRIPT COMPOSITION
                </span>
                <h2 className="font-serif text-2xl text-[#241D18]">The Writing Sheet</h2>
              </div>

              <button
                id="prompts-toggle-btn"
                onClick={() => setShowInspirations(!showInspirations)}
                className="flex items-center gap-1.5 text-xs font-mono text-[#5A2528] hover:text-[#241D18] px-2.5 py-1 rounded bg-[#FAF6EE] border border-[#D8C4A9]"
              >
                <Feather className="w-3.5 h-3.5 text-[#886C3E]" />
                <span>{showInspirations ? 'HIDE PROMPTS' : 'NEED INSPIRATION?'}</span>
              </button>
            </div>

            {/* Inspiration prompts drawer */}
            {showInspirations && (
              <div className="mb-6 p-4 rounded bg-[#F5EFE6] border border-[#D8C4A9] space-y-2 animate-fade-in">
                <div className="text-[10px] font-mono tracking-widest uppercase text-[#5A2528] font-bold">
                  POSTAL WRITING SPARK:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onChangeLetter({
                          letterBody:
                            letterData.letterBody +
                            (letterData.letterBody ? '\n\n' : '') +
                            p,
                        });
                      }}
                      className="text-left text-xs font-serif italic text-[#423730] hover:text-[#5A2528] p-2 rounded hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#D8C4A9]"
                    >
                      "{p}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="space-y-5">
              {/* Recipient Field */}
              <div>
                <label className="block text-[11px] font-mono tracking-widest uppercase text-[#7E6E62] mb-1.5">
                  RECIPIENT NAME
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 font-serif italic text-stone-400">
                    Dear
                  </span>
                  <input
                    type="text"
                    id="letter-to-name"
                    value={letterData.toName}
                    onChange={(e) => onChangeLetter({ toName: e.target.value })}
                    placeholder="Recipient's Name..."
                    className="w-full pl-14 pr-4 py-2.5 bg-[#FAF6EE] border border-[#D8C4A9] rounded font-serif text-lg text-[#2C241F] focus:outline-none focus:border-[#5A2528]"
                  />
                </div>
              </div>

              {/* Destination address / note */}
              <div>
                <label className="block text-[11px] font-mono tracking-widest uppercase text-[#7E6E62] mb-1.5">
                  DELIVERY LOCATION / CITY
                </label>
                <input
                  type="text"
                  id="letter-to-address"
                  value={letterData.toAddress}
                  onChange={(e) => onChangeLetter({ toAddress: e.target.value })}
                  placeholder="e.g. The Old Quarter, Florence"
                  className="w-full px-4 py-2 bg-[#FAF6EE] border border-[#D8C4A9] rounded font-serif text-sm text-[#2C241F] focus:outline-none focus:border-[#5A2528]"
                />
              </div>

              {/* Main Letter Body Textarea with paper-crinkle micro-interaction & hover effect */}
              <motion.div
                animate={
                  isTyping
                    ? {
                        scale: [1, 1.002, 0.999, 1],
                        y: [0, -1, 0.4, 0],
                        boxShadow: [
                          '0 2px 8px rgba(44, 36, 31, 0.05)',
                          '0 8px 18px rgba(44, 36, 31, 0.12)',
                          '0 2px 8px rgba(44, 36, 31, 0.05)',
                        ],
                      }
                    : { scale: 1, y: 0, boxShadow: '0 2px 8px rgba(44, 36, 31, 0.05)' }
                }
                whileHover={{
                  y: -2,
                  boxShadow: '0 8px 20px rgba(44, 36, 31, 0.12)',
                  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
                }}
                className="relative rounded-lg p-0.5 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono tracking-widest uppercase text-[#7E6E62] flex items-center gap-2">
                    <span>LETTER BODY</span>
                    {isTyping && (
                      <span className="text-[9px] text-[#886C3E] italic font-serif animate-pulse">
                        • parchment reacting to quill...
                      </span>
                    )}
                  </label>
                  <span className="text-[10px] font-mono text-[#7E6E62]">
                    {words} words • {letterData.letterBody.length} chars
                  </span>
                </div>
                <div className="relative group">
                  <textarea
                    id="letter-body-textarea"
                    rows={12}
                    value={letterData.letterBody}
                    onChange={handleBodyChange}
                    placeholder="Take your time. Write what deserves to be preserved..."
                    className="w-full p-4 bg-[#FAF6EE] border border-[#D8C4A9] rounded font-serif text-base sm:text-lg text-[#2C241F] leading-relaxed focus:outline-none focus:border-[#5A2528] resize-y transition-all hover:border-[#886C3E]/70 focus:bg-[#FFFDF9]"
                  />
                  {/* Physical tactile watermark note */}
                  <div className="absolute right-3.5 bottom-3.5 pointer-events-none opacity-40 text-[9px] font-mono tracking-widest uppercase text-[#886C3E]">
                    TACTILE VELLUM
                  </div>
                </div>
              </motion.div>

              {/* Sender & Signature row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono tracking-widest uppercase text-[#7E6E62] mb-1.5">
                    FROM (YOUR NAME)
                  </label>
                  <input
                    type="text"
                    id="letter-from-name"
                    value={letterData.fromName}
                    onChange={(e) => onChangeLetter({ fromName: e.target.value })}
                    placeholder="Your Name..."
                    className="w-full px-3.5 py-2 bg-[#FAF6EE] border border-[#D8C4A9] rounded font-serif text-base text-[#2C241F] focus:outline-none focus:border-[#5A2528]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono tracking-widest uppercase text-[#7E6E62] mb-1.5">
                    WRITTEN SIGNATURE
                  </label>
                  <input
                    type="text"
                    id="letter-signature"
                    value={letterData.signature}
                    onChange={(e) => onChangeLetter({ signature: e.target.value })}
                    placeholder="Signature sign-off..."
                    className="w-full px-3.5 py-2 bg-[#FAF6EE] border border-[#D8C4A9] rounded font-script text-xl text-[#2C241F] focus:outline-none focus:border-[#5A2528]"
                  />
                </div>
              </div>
            </div>

            {/* Postal Tools: Add Stamp, Photograph, Super-8 Film */}
            <div className="mt-8 pt-6 border-t border-[#E3D7C5]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#886C3E]">
                  POSTAL ENCLOSURES & PHILATELY
                </span>
                <span className="text-[10px] font-mono text-[#7E6E62]">
                  OPTIONAL ARTIFACTS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Stamp Tool button */}
                <button
                  id="tool-stamp-btn"
                  onClick={() => setStampModalOpen(true)}
                  className="p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all bg-[#FAF6EE] border-[#5A2528] shadow-xs hover:shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <Bookmark className="w-4 h-4 text-[#5A2528]" />
                    <span className="text-[9px] font-mono uppercase bg-[#5A2528]/10 text-[#5A2528] px-1.5 py-0.5 rounded font-bold">
                      {activeStamp.denomination}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="font-serif text-sm font-medium text-[#241D18] truncate">
                      {activeStamp.name}
                    </div>
                    <div className="text-[10px] font-mono text-[#7E6E62] flex items-center justify-between mt-0.5">
                      <span>Affixed Stamp</span>
                      <span className="text-[#5A2528] group-hover:underline">Change ✎</span>
                    </div>
                  </div>
                </button>

                {/* Photo tool */}
                <button
                  id="tool-photo-btn"
                  onClick={() => setPhotoModalOpen(true)}
                  className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    letterData.photoAttachment
                      ? 'bg-[#FAF6EE] border-[#5A2528]'
                      : 'bg-[#FAF8F5] border-[#D8C4A9] hover:border-[#886C3E]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ImageIcon className="w-4 h-4 text-[#5A2528]" />
                    {letterData.photoAttachment && <Check className="w-3.5 h-3.5 text-[#5A2528]" />}
                  </div>
                  <div className="mt-2">
                    <div className="font-serif text-sm font-medium text-[#241D18]">Polaroid Photo</div>
                    <div className="text-[10px] font-mono text-[#7E6E62]">
                      {letterData.photoAttachment ? 'Enclosed' : 'Add Photograph'}
                    </div>
                  </div>
                </button>

                {/* Video Note tool */}
                <button
                  id="tool-video-btn"
                  onClick={() => setVideoModalOpen(true)}
                  className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    letterData.videoNote?.isIncluded
                      ? 'bg-[#FAF6EE] border-[#5A2528]'
                      : 'bg-[#FAF8F5] border-[#D8C4A9] hover:border-[#886C3E]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Video className="w-4 h-4 text-[#5A2528]" />
                    {letterData.videoNote?.isIncluded && <Check className="w-3.5 h-3.5 text-[#5A2528]" />}
                  </div>
                  <div className="mt-2">
                    <div className="font-serif text-sm font-medium text-[#241D18]">Super-8 Film</div>
                    <div className="text-[10px] font-mono text-[#7E6E62]">
                      {letterData.videoNote?.isIncluded ? 'Reel Added' : 'Add Projection'}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom Proceed CTA */}
            <div className="mt-8 pt-6 border-t border-[#E3D7C5] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-mono text-[#7E6E62]">
                NEXT: SEALING & TRANSIT SCHEDULING
              </span>

              <button
                id="letter-continue-btn"
                onClick={onContinue}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#5A2528] text-white text-xs font-mono tracking-widest uppercase rounded-full hover:bg-[#3F191B] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 font-semibold"
              >
                <span>Fold & Prepare Delivery (04)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Photograph Enclosure */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#D8C4A9] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3D7C5] pb-3">
              <h3 className="font-serif text-xl text-[#241D18]">Enclose a Polaroid</h3>
              <button
                onClick={() => setPhotoModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white border border-stone-200 shadow-sm rounded flex flex-col items-center">
              <img
                src={
                  letterData.photoAttachment?.url ||
                  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80'
                }
                alt="Preview"
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover rounded-xs filter sepia-[0.2]"
              />
              <input
                type="text"
                placeholder="Handwritten caption for the border..."
                value={letterData.photoAttachment?.caption || ''}
                onChange={(e) =>
                  onChangeLetter({
                    photoAttachment: {
                      url:
                        letterData.photoAttachment?.url ||
                        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
                      caption: e.target.value,
                      date: 'Autumn 2026',
                    },
                  })
                }
                className="w-full mt-3 px-2 py-1 text-center font-script text-lg text-neutral-700 border-b border-stone-300 focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              {letterData.photoAttachment && (
                <button
                  onClick={() => {
                    onChangeLetter({ photoAttachment: undefined });
                    setPhotoModalOpen(false);
                  }}
                  className="text-xs font-mono text-rose-700 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
              <button
                onClick={() => {
                  if (!letterData.photoAttachment) {
                    onChangeLetter({
                      photoAttachment: {
                        url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
                        caption: 'The old riverbank at dusk — October',
                        date: 'Autumn 2026',
                      },
                    });
                  }
                  setPhotoModalOpen(false);
                }}
                className="ml-auto px-5 py-2 bg-[#5A2528] text-white text-xs font-mono tracking-wider uppercase rounded"
              >
                Enclose in Envelope
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL: Super-8 Film Projection */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#D8C4A9] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3D7C5] pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#886C3E]">
                  KODACHROME PROJECTION
                </span>
                <h3 className="font-serif text-xl text-[#241D18]">Super-8 Film Reel</h3>
              </div>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-black rounded-md border border-stone-800 relative overflow-hidden">
              {/* Film Sprockets */}
              <div className="flex justify-between mb-2 text-stone-600 font-mono text-[8px] select-none">
                <span>[ ] [ ] [ ] [ ] [ ]</span>
                <span>KODAK SAFETY FILM 1924</span>
                <span>[ ] [ ] [ ] [ ] [ ]</span>
              </div>
              <img
                src={
                  letterData.videoNote?.previewUrl ||
                  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80'
                }
                alt="Film frame"
                referrerPolicy="no-referrer"
                className="w-full h-40 object-cover opacity-85 filter contrast-125 sepia-[0.3]"
              />
              <div className="flex justify-between mt-2 text-stone-600 font-mono text-[8px] select-none">
                <span>[ ] [ ] [ ] [ ] [ ]</span>
                <span>24 FRAMES / SEC</span>
                <span>[ ] [ ] [ ] [ ] [ ]</span>
              </div>
            </div>

            <div className="p-3 rounded bg-stone-100 border border-stone-300 text-xs font-serif text-[#5E5046]">
              Future paid tier: Archival Super-8 film captures and video messages enclosed with
              warm projector sound.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  onChangeLetter({
                    videoNote: {
                      duration: '00:38',
                      title: 'Super-8 Film: The River at October',
                      isIncluded: true,
                      previewUrl:
                        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
                    },
                  });
                  setVideoModalOpen(false);
                }}
                className="px-5 py-2 bg-[#5A2528] text-white text-xs font-mono tracking-wider uppercase rounded"
              >
                Enclose Film Reel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Philatelic Vintage Stamp Vault */}
      <AnimatePresence>
        {stampModalOpen && (
          <StampSelection
            selectedStampId={letterData.stampId || 'airmail-1928'}
            onSelectStamp={(stampId) => {
              onChangeLetter({ stampId });
            }}
            onClose={() => setStampModalOpen(false)}
            mode="modal"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
