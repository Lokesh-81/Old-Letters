import { useState } from 'react';
import { StationeryTemplate, TemplateCollection } from '../types';
import { STATIONERY_TEMPLATES } from '../data/mockData';
import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { ArrowRight, Check, Eye, ChevronLeft, ChevronRight, Sliders, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StationeryPickerProps {
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function StationeryPicker({
  selectedTemplateId,
  onSelectTemplate,
  onContinue,
  onBack,
}: StationeryPickerProps) {
  const [activeCollection, setActiveCollection] = useState<TemplateCollection>('CLASSIC CORRESPONDENCE');
  const [viewMode, setViewMode] = useState<'slider' | 'grid'>('slider');
  const [sliderIndex, setSliderIndex] = useState(0);

  const collections: TemplateCollection[] = [
    'CLASSIC CORRESPONDENCE',
    'ROMANTIC',
    'PERSONAL',
    'CELEBRATION',
  ];

  const currentTemplates = STATIONERY_TEMPLATES.filter(
    (t) => t.collection === activeCollection
  );

  const activeTemplate = currentTemplates[sliderIndex] || currentTemplates[0] || STATIONERY_TEMPLATES[0];

  const handleNextSlide = () => {
    setSliderIndex((prev) => (prev + 1) % currentTemplates.length);
  };

  const handlePrevSlide = () => {
    setSliderIndex((prev) => (prev - 1 + currentTemplates.length) % currentTemplates.length);
  };

  const handleSelectCollection = (col: TemplateCollection) => {
    setActiveCollection(col);
    setSliderIndex(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header breadcrumb & step indicator */}
      <div className="flex items-center justify-between border-b border-[#E3D7C5] pb-4 mb-8">
        <button
          onClick={onBack}
          className="text-xs font-mono tracking-wider uppercase text-[#7E6E62] hover:text-[#2C241F] flex items-center gap-1.5 transition-colors"
        >
          ← Back to Category
        </button>

        <div className="flex items-center gap-4">
          {/* Slider vs Grid toggle */}
          <div className="flex items-center p-1 rounded-full bg-[#EFE8DC] border border-[#D8C4A9]/80 text-xs font-mono">
            <button
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${
                viewMode === 'slider'
                  ? 'bg-[#2C241F] text-[#FAF8F5] shadow-xs'
                  : 'text-[#7E6E62] hover:text-[#2C241F]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>SLIDER</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#2C241F] text-[#FAF8F5] shadow-xs'
                  : 'text-[#7E6E62] hover:text-[#2C241F]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>VAULT</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono tracking-widest text-[#886C3E] uppercase">
            <span className="font-bold text-[#5A2528]">STEP 02</span>
            <span className="text-stone-400">/ 05</span>
            <span className="text-stone-400">• STATIONERY</span>
          </div>
        </div>
      </div>

      {/* Main Title & Editorial Subtitle */}
      <div className="max-w-2xl mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-[#886C3E] mb-2">
          OLD-LETTERS • ARCHIVAL PAPER SANCTUARY
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-light text-[#241D18] leading-tight">
          Choose your stationery.
        </h1>
        <p className="font-serif text-[#5E5046] text-base sm:text-lg mt-3 italic font-light">
          Some things are worth waiting for. Slide through sixteen archival paper stocks, tactile
          linens, and botanical vellums.
        </p>
      </div>

      {/* Collection Navigation Tabs with sliding pill */}
      <div className="flex flex-wrap gap-2 border-b border-[#E3D7C5] pb-4 mb-8">
        {collections.map((col) => (
          <button
            key={col}
            onClick={() => handleSelectCollection(col)}
            className={`relative px-4 sm:px-5 py-2 text-xs font-mono tracking-widest uppercase rounded-full transition-all ${
              activeCollection === col
                ? 'text-[#FAF8F5] font-semibold'
                : 'text-[#7E6E62] hover:text-[#2C241F] hover:bg-[#EADBCE]/50'
            }`}
          >
            {activeCollection === col && (
              <motion.div
                layoutId="collection-active-pill"
                className="absolute inset-0 bg-[#2C241F] rounded-full shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">{col}</span>
          </button>
        ))}
      </div>

      {/* MODE 1: INTERACTIVE SLIDING CAROUSEL (Smooth sliding transitions) */}
      {viewMode === 'slider' ? (
        <div className="space-y-6">
          {/* Main Slide Stage */}
          <div className="relative bg-[#FAF8F5] border border-[#D8C4A9] rounded-2xl p-6 sm:p-10 shadow-lg overflow-hidden">
            {/* Slide Navigation Controls */}
            <div className="flex items-center justify-between mb-6 border-b border-[#E3D7C5] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-widest text-[#5A2528] font-bold">
                  SHEET {String(sliderIndex + 1).padStart(2, '0')} / {String(currentTemplates.length).padStart(2, '0')}
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-xs font-mono text-[#7E6E62] uppercase tracking-wider">
                  {activeCollection}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevSlide}
                  className="p-2.5 rounded-full border border-[#D8C4A9] text-[#2C241F] hover:bg-[#2C241F] hover:text-[#FAF8F5] transition-all hover:scale-105 active:scale-95"
                  aria-label="Previous stationery sheet"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextSlide}
                  className="p-2.5 rounded-full border border-[#D8C4A9] text-[#2C241F] hover:bg-[#2C241F] hover:text-[#FAF8F5] transition-all hover:scale-105 active:scale-95"
                  aria-label="Next stationery sheet"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sliding Stage */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[440px]">
              {/* Paper Visual Stage with Slide Transition */}
              <div className="lg:col-span-7 flex justify-center items-center py-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTemplate.id}
                    initial={{ opacity: 0, x: 70, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -70, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className={`w-full max-w-md aspect-[1/1.38] rounded-xl p-8 shadow-2xl relative flex flex-col justify-between overflow-hidden border ${activeTemplate.paperTextureClass}`}
                    style={{
                      backgroundColor: activeTemplate.paperBg,
                      color: activeTemplate.inkColor,
                    }}
                  >
                    {/* Airmail border overlay */}
                    {activeTemplate.borderStyle === 'airmail' && (
                      <div className="absolute inset-0 airmail-border pointer-events-none opacity-80" />
                    )}

                    {/* Watermark */}
                    {activeTemplate.watermarkText && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="font-serif tracking-[0.3em] uppercase text-4xl opacity-5 select-none -rotate-12">
                          {activeTemplate.watermarkText}
                        </span>
                      </div>
                    )}

                    {/* Top Sheet Header */}
                    <div className="flex justify-between items-start relative z-10">
                      <Postmark city="OLD-LETTERS" date="21 SEP 2026" number="№ 24" />
                      <PostageStamp denomination="24¢" subject="CORRESPONDENCE" accentColor={activeTemplate.sealColor} />
                    </div>

                    {/* Body Type Specimen */}
                    <div className="my-auto py-6 relative z-10 space-y-3">
                      <div className="text-[10px] font-mono tracking-widest uppercase opacity-60">
                        MEMORANDUM OF INTENTION
                      </div>
                      <p
                        className={`text-lg sm:text-xl leading-relaxed ${
                          activeTemplate.fontFamily === 'script'
                            ? 'font-handwriting'
                            : activeTemplate.fontFamily === 'mono'
                            ? 'font-mono'
                            : 'font-serif italic'
                        }`}
                      >
                        "Some words are meant to travel slowly. They belong on paper that holds the warmth of
                        the hand that penned them."
                      </p>
                    </div>

                    {/* Bottom Stamp / Seal */}
                    <div className="flex justify-between items-end relative z-10 pt-4 border-t border-current/15">
                      <div className="text-[9px] font-mono tracking-widest uppercase opacity-70">
                        {activeTemplate.name} // 100% COTTON FIBER
                      </div>
                      <WaxSeal size="sm" color={activeTemplate.sealColor} initial="OL" />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Details & Selection Action with Slide Transition */}
              <div className="lg:col-span-5 space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTemplate.id + '-info'}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-[#886C3E]">
                        {activeTemplate.collection}
                      </span>
                      <h2 className="font-serif text-3xl sm:text-4xl text-[#241D18] font-normal mt-1">
                        {activeTemplate.name}
                      </h2>
                    </div>

                    <p className="font-serif text-[#5E5046] text-base leading-relaxed">
                      {activeTemplate.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                      <div className="p-3 rounded-lg bg-[#F5EFE6] border border-[#D8C4A9]">
                        <span className="text-[10px] text-[#7E6E62] block uppercase">TYPOGRAPHIC VOICE</span>
                        <span className="font-bold text-[#2C241F] capitalize">{activeTemplate.fontFamily}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#F5EFE6] border border-[#D8C4A9]">
                        <span className="text-[10px] text-[#7E6E62] block uppercase">EDGE & MARGIN</span>
                        <span className="font-bold text-[#2C241F] capitalize">{activeTemplate.borderStyle}</span>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Primary Selection Button */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      onSelectTemplate(activeTemplate.id);
                      onContinue();
                    }}
                    className="flex-1 px-7 py-3.5 bg-[#5A2528] hover:bg-[#3F191B] text-white text-xs font-mono tracking-widest uppercase rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold"
                  >
                    <span>Write on this Paper</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onSelectTemplate(activeTemplate.id)}
                    className={`px-5 py-3.5 rounded-full border text-xs font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                      selectedTemplateId === activeTemplate.id
                        ? 'bg-[#2C241F] text-white border-[#2C241F]'
                        : 'border-[#D8C4A9] text-[#2C241F] hover:bg-[#EADBCE]/50'
                    }`}
                  >
                    {selectedTemplateId === activeTemplate.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <span>Select</span>
                    )}
                  </button>
                </div>

                {/* Sliding Pagination Dots */}
                <div className="flex items-center gap-2 pt-2">
                  {currentTemplates.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setSliderIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        sliderIndex === idx ? 'w-8 bg-[#5A2528]' : 'w-2 bg-[#D8C4A9] hover:bg-[#886C3E]'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: GRID VAULT VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentTemplates.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                  onSelectTemplate(template.id);
                  onContinue();
                }}
                className={`group cursor-pointer rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-[#5A2528] bg-[#FAF6EE] ring-2 ring-[#5A2528]/20'
                    : 'border-[#D8C4A9] bg-[#FAF8F5] hover:border-[#886C3E]'
                }`}
              >
                <div>
                  {/* Visual Paper Swatch */}
                  <div
                    className={`w-full aspect-[4/3] rounded-lg mb-4 border p-4 shadow-inner flex flex-col justify-between relative overflow-hidden ${template.paperTextureClass}`}
                    style={{
                      backgroundColor: template.paperBg,
                      color: template.inkColor,
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] font-mono tracking-widest uppercase opacity-70">
                        {template.fontFamily}
                      </span>
                      <PostageStamp denomination="24¢" accentColor={template.sealColor} />
                    </div>
                    <p className="font-serif italic text-xs line-clamp-2 opacity-80">
                      "A quiet space to write..."
                    </p>
                    <div className="flex justify-end">
                      <WaxSeal size="sm" color={template.sealColor} initial="OL" />
                    </div>
                  </div>

                  <h3 className="font-serif text-xl text-[#241D18] group-hover:text-[#5A2528] transition-colors font-medium">
                    {template.name}
                  </h3>
                  <p className="text-xs text-[#5E5046] mt-1 font-serif line-clamp-2">
                    {template.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E3D7C5] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#7E6E62] uppercase tracking-wider text-[10px]">
                    {template.borderStyle}
                  </span>
                  <span className="text-[#5A2528] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    USE PAPER →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
