import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LetterTemplate, LetterCategory } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';
import { PaperSheet } from '../common/PaperSheet';

interface StationeryGalleryProps {
  selectedTemplateId: string;
  onSelectTemplate: (template: LetterTemplate) => void;
  onConfirmStationery?: (template: LetterTemplate) => void;
  onBackToCompose?: () => void;
}

type GalleryCategory = 'ALL' | LetterCategory;

// Synthesizes a subtle, tactile paper-slide sound using Web Audio API
function playPaperSlideSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const bufferSize = ctx.sampleRate * 0.12; // 120ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch {
    // Gracefully ignore audio failures (e.g. autoplay policies)
  }
}

export const StationeryGallery: React.FC<StationeryGalleryProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  onConfirmStationery,
  onBackToCompose,
}) => {
  const initialIdx = Math.max(
    0,
    TEMPLATES.findIndex((t) => t.id === selectedTemplateId)
  );

  const [currentIndex, setCurrentIndex] = useState(initialIdx >= 0 ? initialIdx : 0);
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('ALL');
  const [direction, setDirection] = useState<1 | -1>(1);

  // Advanced features
  const [showReverseSide, setShowReverseSide] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [isTextureInspectorOpen, setIsTextureInspectorOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync when selectedTemplateId changes from outside
  useEffect(() => {
    const idx = TEMPLATES.findIndex((t) => t.id === selectedTemplateId);
    if (idx !== -1 && idx !== currentIndex) {
      setCurrentIndex(idx);
    }
  }, [selectedTemplateId]);

  const activeTemplate = TEMPLATES[currentIndex] || TEMPLATES[0];

  // Reset reverse side view when template changes
  useEffect(() => {
    setShowReverseSide(false);
  }, [activeTemplate.id]);

  const filteredTemplates =
    selectedCategory === 'ALL'
      ? TEMPLATES
      : TEMPLATES.filter((t) => {
          if (t.category === (selectedCategory as any)) return true;
          if (t.suitableCategories?.includes(selectedCategory as LetterCategory)) return true;
          return false;
        });

  const handleNext = () => {
    if (soundEnabled) playPaperSlideSound();
    setDirection(1);
    const nextIdx = (currentIndex + 1) % TEMPLATES.length;
    setCurrentIndex(nextIdx);
    onSelectTemplate(TEMPLATES[nextIdx]);
  };

  const handlePrev = () => {
    if (soundEnabled) playPaperSlideSound();
    setDirection(-1);
    const prevIdx = (currentIndex - 1 + TEMPLATES.length) % TEMPLATES.length;
    setCurrentIndex(prevIdx);
    onSelectTemplate(TEMPLATES[prevIdx]);
  };

  const handleSelectSpecific = (tpl: LetterTemplate) => {
    const idx = TEMPLATES.findIndex((t) => t.id === tpl.id);
    if (idx !== -1) {
      if (soundEnabled) playPaperSlideSound();
      setDirection(idx > currentIndex ? 1 : -1);
      setCurrentIndex(idx);
      onSelectTemplate(tpl);
    }
  };

  // Keyboard navigation (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        setIsFullscreenPreview(false);
        setIsTextureInspectorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, soundEnabled]);

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 50) {
      handlePrev();
    } else if (diff < -50) {
      handleNext();
    }
    touchStartX.current = null;
  };

  // Neighboring templates for realistic layered physical paper sample sheets peeking behind
  const prevTemplate = TEMPLATES[(currentIndex - 1 + TEMPLATES.length) % TEMPLATES.length];
  const nextTemplate = TEMPLATES[(currentIndex + 1) % TEMPLATES.length];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 select-none font-serif">
      {/* Editorial Header */}
      <div className="text-center space-y-1.5">
        <div className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
          CENTRAL POSTAL DESK · PHYSICAL PAPERS
        </div>
        <h2 className="text-3xl sm:text-4xl text-teal-950 font-normal tracking-tight">
          Select Your Stationery
        </h2>
        <p className="text-xs sm:text-sm font-sans text-stone-600 max-w-lg mx-auto font-light">
          Each sheet is weighted, textured, and marked by traditional postal methods.
          The paper you choose will hold your words until the seal is broken.
        </p>
      </div>

      {/* Category Navigation Controls */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap text-xs font-sans">
        {(['ALL', 'ROMANTIC', 'PERSONAL', 'EMOTIONAL', 'CELEBRATION', 'SPECIAL'] as const).map(
          (cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                const matching =
                  cat === 'ALL'
                    ? TEMPLATES
                    : TEMPLATES.filter(
                        (t) =>
                          t.category === (cat as any) ||
                          t.suitableCategories?.includes(cat as LetterCategory)
                      );
                if (matching.length > 0 && !matching.some((m) => m.id === activeTemplate.id)) {
                  handleSelectSpecific(matching[0]);
                }
              }}
              className={`px-3.5 py-1.5 rounded-full transition-all text-xs tracking-wider uppercase cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-teal-900 text-white shadow-xs font-medium ring-2 ring-teal-900/20'
                  : 'bg-white border border-[#eae4da] text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {cat === 'ALL' ? `All Papers (${TEMPLATES.length})` : cat}
            </button>
          )
        )}
      </div>

      {/* Interactive Tool Actions Bar (Fullscreen, Flip, Texture Inspect, Sound) */}
      <div className="flex items-center justify-between border-y border-[#eae4da] py-2.5 px-3 bg-white/70 backdrop-blur-xs text-xs font-sans text-stone-600">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Flip to Back */}
          <button
            type="button"
            onClick={() => {
              if (soundEnabled) playPaperSlideSound();
              setShowReverseSide(!showReverseSide);
            }}
            className={`px-3 py-1.5 rounded-xs border text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
              showReverseSide
                ? 'bg-teal-900 text-white border-teal-900 shadow-2xs'
                : 'bg-stone-50 border-stone-300 hover:bg-white text-stone-700'
            }`}
          >
            <span>↺</span>
            <span>{showReverseSide ? 'Show Letter Face' : 'Flip to Back / Mill Seal'}</span>
          </button>

          {/* Inspect Paper Texture */}
          <button
            type="button"
            onClick={() => setIsTextureInspectorOpen(true)}
            className="px-3 py-1.5 rounded-xs border border-stone-300 bg-stone-50 hover:bg-white text-[11px] font-mono uppercase tracking-wider text-stone-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🔍</span>
            <span>Inspect Texture ({activeTemplate.paperWeight || '280 GSM'})</span>
          </button>

          {/* Fullscreen Preview */}
          <button
            type="button"
            onClick={() => setIsFullscreenPreview(true)}
            className="px-3 py-1.5 rounded-xs border border-stone-300 bg-stone-50 hover:bg-white text-[11px] font-mono uppercase tracking-wider text-stone-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>⛶</span>
            <span>Fullscreen Inspection</span>
          </button>
        </div>

        {/* Tactile Audio Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-stone-400 hover:text-stone-700 text-xs font-mono uppercase tracking-widest cursor-pointer flex items-center gap-1"
          title="Toggle paper tactile sound"
        >
          <span>{soundEnabled ? '🔊 Sound On' : '🔇 Muted'}</span>
        </button>
      </div>

      {/* ---------------- 1. TEMPLATE CARDS ROW (ABOVE THE LETTER) ---------------- */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2.5 px-2">
          <span className="text-[10px] font-mono tracking-widest uppercase text-stone-500">
            TEMPLATE CARDS ({filteredTemplates.length} AVAILABLE) ↓
          </span>
          <span className="text-[10px] font-mono text-stone-400">
            Use arrow keys or click to select
          </span>
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 px-2 no-scrollbar scroll-smooth">
          {filteredTemplates.map((tpl) => {
            const isSelected = activeTemplate.id === tpl.id;
            const cardBg = tpl.paperBackground || tpl.paperColor || '#FAF6EE';
            const cardFg = tpl.paperForeground || tpl.inkColor || '#3A2520';
            const cardBorder = tpl.paperBorder || '#CBBDA5';
            const cardAccent = tpl.paperAccent || '#5C1D24';

            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectSpecific(tpl)}
                className={`group relative shrink-0 w-32 sm:w-36 rounded-xs p-3 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer border ${
                  isSelected
                    ? 'ring-2 ring-teal-900 shadow-lg -translate-y-1.5 scale-102 z-10'
                    : 'hover:-translate-y-1 shadow-xs hover:shadow-md opacity-90 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: cardBg,
                  color: cardFg,
                  borderColor: isSelected ? cardAccent : cardBorder,
                }}
              >
                {/* Active check indicator */}
                {isSelected && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs flex items-center justify-center text-[8px] text-white font-bold"
                    style={{ backgroundColor: cardAccent }}
                  >
                    ✓
                  </div>
                )}

                <div className="space-y-1">
                  <div
                    className="text-[9px] font-mono uppercase tracking-wider opacity-65 truncate"
                    style={{ color: cardFg }}
                  >
                    {tpl.category}
                  </div>
                  <div className="font-serif text-xs font-semibold leading-tight line-clamp-2">
                    {tpl.name}
                  </div>
                </div>

                <div
                  className="pt-2 mt-3 border-t flex items-center justify-between text-[10px]"
                  style={{ borderColor: `${cardBorder}60` }}
                >
                  <span className="text-xs">{tpl.waxSealStyle?.emblem || '✒'}</span>
                  <span
                    className="w-3.5 h-3.5 rounded-full border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: tpl.waxSealStyle?.color || cardAccent,
                      borderColor: 'rgba(255,255,255,0.4)',
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- 2. ACTUAL LETTER DISPLAY (DOMINANT & READABLE) ---------------- */}
      <div
        className="relative w-full flex flex-col items-center py-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center min-h-[580px] sm:min-h-[620px]">
          {/* Layer 1: Peeking physical paper sheet left behind */}
          <div
            className="absolute inset-x-4 sm:inset-x-8 top-3 bottom-6 rounded-xs border shadow-md pointer-events-none -z-20 transition-all duration-500"
            style={{
              backgroundColor: prevTemplate.paperBackground || prevTemplate.paperColor || '#E8D8BD',
              borderColor: prevTemplate.paperBorder || '#D4C2A3',
              transform: 'translate3d(-18px, -10px, 0) rotate(-2.4deg)',
              opacity: 0.85,
            }}
          />

          {/* Layer 2: Peeking physical paper sheet right behind */}
          <div
            className="absolute inset-x-3 sm:inset-x-6 top-5 bottom-4 rounded-xs border shadow-lg pointer-events-none -z-10 transition-all duration-500"
            style={{
              backgroundColor: nextTemplate.paperBackground || nextTemplate.paperColor || '#F3DDD9',
              borderColor: nextTemplate.paperBorder || '#E2C3BC',
              transform: 'translate3d(16px, -6px, 0) rotate(1.9deg)',
              opacity: 0.9,
            }}
          />

          {/* Main Foreground Dominant Letter */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${activeTemplate.id}-${showReverseSide ? 'rev' : 'face'}`}
              custom={direction}
              initial={{
                x: direction > 0 ? 50 : -50,
                opacity: 0,
                scale: 0.97,
              }}
              animate={{
                x: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.32,
                  ease: [0.16, 1, 0.3, 1],
                },
              }}
              exit={{
                x: direction > 0 ? -50 : 50,
                opacity: 0,
                scale: 0.97,
                transition: { duration: 0.22 },
              }}
              className="w-full relative z-10 cursor-grab active:cursor-grabbing"
            >
              <PaperSheet
                template={activeTemplate}
                date="12 October 2026"
                greeting="Dear Vasantha,"
                content={`I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life.\n\nSome thoughts are too quiet for telephone calls, and too sacred for instant messages. I wanted you to hold these words in your hands, knowing they were written with stillness and patient care.`}
                signoff="With affection,"
                senderName="Lokesh"
                recipientName="Vasantha"
                isEditing={false}
                showReverseSide={showReverseSide}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---------------- 3. METADATA & CONFIRMATION DESK ---------------- */}
        <div className="w-full max-w-2xl mt-6 space-y-4">
          {/* Active Template Meta Description & Postal Mark Badges */}
          <div className="bg-white/80 backdrop-blur-xs p-5 rounded-xs border border-[#eae4da] shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-stone-200 pb-2.5">
              <div>
                <span className="font-serif text-lg font-medium text-teal-950 block">
                  {activeTemplate.name}
                </span>
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                  {activeTemplate.paperWeight || '280 GSM'} · {activeTemplate.category} EDITION
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full border border-stone-300 shadow-2xs flex items-center justify-center text-[10px]"
                  style={{ backgroundColor: activeTemplate.waxSealStyle?.color, color: '#fef08a' }}
                >
                  {activeTemplate.waxSealStyle?.emblem}
                </span>
                <span className="text-xs font-serif italic text-stone-700">
                  {activeTemplate.waxSealStyle?.name}
                </span>
              </div>
            </div>

            <p className="text-xs font-serif italic text-teal-900">
              &ldquo;{activeTemplate.tagline}&rdquo;
            </p>
            <p className="text-[11px] font-sans text-stone-600 font-light leading-relaxed">
              {activeTemplate.description}
            </p>

            {/* Postal Markings Pill Rail */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-500">
              <div className="flex items-center gap-3">
                <span>STAMP: {activeTemplate.postalMarks?.stampName || 'India Post 25p'}</span>
                <span>·</span>
                <span>DESPATCH: {activeTemplate.postalMarks?.cachetCity}</span>
              </div>
              <span className="text-stone-400 font-semibold">
                REF: {activeTemplate.postalMarks?.docketNumber}
              </span>
            </div>
          </div>

          {/* Directional Navigation & Confirm Button */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2.5 rounded-xs border border-[#eae4da] bg-white hover:bg-stone-50 text-xs font-sans font-medium text-stone-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>←</span>
              <span className="hidden sm:inline">Previous Stationery</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTemplate(activeTemplate);
                if (onConfirmStationery) {
                  onConfirmStationery(activeTemplate);
                } else if (onBackToCompose) {
                  onBackToCompose();
                }
              }}
              className="flex-1 py-3.5 px-6 rounded-xs bg-teal-900 hover:bg-teal-800 text-white font-sans text-xs tracking-[0.2em] uppercase font-medium shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] transition-all active:scale-[0.98] cursor-pointer text-center"
            >
              USE THIS STATIONERY →
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2.5 rounded-xs border border-[#eae4da] bg-white hover:bg-stone-50 text-xs font-sans font-medium text-stone-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="hidden sm:inline">Next Stationery</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== FULLSCREEN INSPECTION MODAL ==================== */}
      <AnimatePresence>
        {isFullscreenPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
          >
            <div className="relative w-full max-w-3xl my-auto space-y-4">
              <div className="flex items-center justify-between text-white border-b border-stone-700/60 pb-3">
                <div className="space-y-0.5">
                  <div className="font-serif text-xl font-light">{activeTemplate.name}</div>
                  <div className="text-xs font-mono text-stone-400 uppercase tracking-widest">
                    {activeTemplate.paperWeight} · FULLSCREEN CORRESPONDENCE INSPECTION
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playPaperSlideSound();
                      setShowReverseSide(!showReverseSide);
                    }}
                    className="px-3 py-1.5 rounded-xs border border-stone-600 bg-stone-800 hover:bg-stone-700 text-xs font-mono uppercase tracking-wider text-stone-200 cursor-pointer"
                  >
                    {showReverseSide ? 'Show Letter' : 'Flip to Back'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullscreenPreview(false)}
                    className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center text-sm font-mono cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Elevated Paper Sheet */}
              <div className="py-4">
                <PaperSheet
                  template={activeTemplate}
                  date="12 October 2026"
                  greeting="Dear Vasantha,"
                  content={`I am writing this on the balcony as the evening cools down over the city.\n\nI wanted to tell you something I rarely say properly: how much I value your presence in my life.\n\nSome thoughts are too quiet for telephone calls, and too sacred for instant messages. I wanted you to hold these words in your hands, knowing they were written with stillness and patient care.`}
                  signoff="With affection,"
                  senderName="Lokesh"
                  recipientName="Vasantha"
                  isEditing={false}
                  showReverseSide={showReverseSide}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreenPreview(false);
                    onSelectTemplate(activeTemplate);
                    if (onConfirmStationery) onConfirmStationery(activeTemplate);
                    else if (onBackToCompose) onBackToCompose();
                  }}
                  className="py-2.5 px-6 rounded-xs bg-[#c5a059] hover:bg-[#dec183] text-stone-950 font-sans text-xs tracking-wider uppercase font-semibold transition-colors cursor-pointer"
                >
                  Choose {activeTemplate.name} & Begin Writing →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== TACTILE TEXTURE INSPECTOR MODAL ==================== */}
      <AnimatePresence>
        {isTextureInspectorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg bg-[#faf8f5] text-stone-900 border border-[#eae4da] rounded-xs shadow-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono tracking-widest uppercase text-stone-500">
                    TACTILE SPECIFICATION
                  </div>
                  <h3 className="font-serif text-2xl text-teal-950">{activeTemplate.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTextureInspectorOpen(false)}
                  className="w-7 h-7 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-xs font-mono cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Macro Texture Swatch */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                  MACRO SURFACE REPRODUCTION
                </div>
                <div
                  className="w-full h-44 rounded-xs border border-stone-300 p-6 flex flex-col justify-between relative shadow-inner overflow-hidden"
                  style={{
                    backgroundColor: activeTemplate.paperBackground || activeTemplate.paperColor,
                    color: activeTemplate.paperForeground || activeTemplate.inkColor,
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

                  <div className="relative z-10 flex items-center justify-between text-xs font-mono opacity-65">
                    <span>{activeTemplate.paperWeight}</span>
                    <span>GRAIN DIRECTION: LONG</span>
                  </div>

                  <div className="relative z-10 text-center font-serif text-lg italic opacity-90 max-w-xs mx-auto">
                    &ldquo;{activeTemplate.sampleBody?.split('\n')[0]}&rdquo;
                  </div>

                  <div className="relative z-10 flex items-center justify-between text-[10px] font-mono opacity-60">
                    <span>SEAL: {activeTemplate.waxSealStyle?.name}</span>
                    <span>BORDER: {activeTemplate.borderStyle}</span>
                  </div>
                </div>
              </div>

              {/* Texture Analysis Specs */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-stone-100/70 rounded-xs border border-stone-200">
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 uppercase block">
                      Weight & Caliper
                    </span>
                    <span className="font-sans font-medium text-stone-800">
                      {activeTemplate.paperWeight || '280 GSM Cotton'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 uppercase block">
                      Ink Tone
                    </span>
                    <span className="font-sans font-medium text-stone-800 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20"
                        style={{ backgroundColor: activeTemplate.paperForeground || activeTemplate.inkColor }}
                      />
                      {activeTemplate.paperForeground || activeTemplate.inkColor}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 uppercase block">
                      Postal Origin
                    </span>
                    <span className="font-sans font-medium text-stone-800">
                      {activeTemplate.postalMarks?.cachetCity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 uppercase block">
                      Texture Character
                    </span>
                    <span className="font-sans font-medium text-stone-800">
                      {activeTemplate.backgroundTexture}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed font-sans font-light">
                  {activeTemplate.textureDescription ||
                    'Finished with natural plant starches and cylinder-moulded deckle edges.'}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsTextureInspectorOpen(false)}
                  className="px-5 py-2 rounded-xs bg-teal-900 hover:bg-teal-800 text-white text-xs font-sans uppercase tracking-wider cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
