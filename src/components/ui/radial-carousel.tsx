'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  type Variants,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { Compass, RotateCw } from 'lucide-react';
import { LetterTemplate } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';

export interface RadialCarouselProps {
  templates?: LetterTemplate[];
  activeTemplateId?: string;
  radius?: number;
  thumbnailSize?: number;
  centerSize?: number;
  onSelectTemplate?: (template: LetterTemplate) => void;
}

export const RadialCarousel: React.FC<RadialCarouselProps> = ({
  templates = TEMPLATES,
  activeTemplateId,
  radius = 260,
  thumbnailSize = 115,
  centerSize = 340,
  onSelectTemplate,
}) => {
  // Default to expanded radial wheel so all templates are immediately visible
  const [isExpanded, setIsExpanded] = useState(true);

  const initialIndex = activeTemplateId
    ? Math.max(0, templates.findIndex((t) => t.id === activeTemplateId))
    : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  const [isPanning, setIsPanning] = useState(false);
  const [responsiveSizes, setResponsiveSizes] = useState({
    radius,
    thumbnailSize,
    centerSize,
  });

  useEffect(() => {
    if (activeTemplateId) {
      const idx = templates.findIndex((t) => t.id === activeTemplateId);
      if (idx !== -1) setActiveIndex(idx);
    }
  }, [activeTemplateId, templates]);

  useEffect(() => {
    const updateSizes = () => {
      const width = window.innerWidth;

      if (width < 500) {
        setResponsiveSizes({
          radius: 130,
          thumbnailSize: 72,
          centerSize: 220,
        });
      } else if (width < 768) {
        setResponsiveSizes({
          radius: 175,
          thumbnailSize: 85,
          centerSize: 260,
        });
      } else if (width < 1024) {
        setResponsiveSizes({
          radius: 220,
          thumbnailSize: 100,
          centerSize: 300,
        });
      } else {
        setResponsiveSizes({
          radius: 260,
          thumbnailSize: 115,
          centerSize: 340,
        });
      }
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, [radius, thumbnailSize, centerSize]);

  const rotation = useMotionValue(0);

  const smoothRotation = useSpring(rotation, {
    bounce: 0.15,
    duration: 0.12,
  });

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    onSelectTemplate?.(templates[index]);
  };

  const containerVariants: Variants = {
    collapsed: { transition: { staggerChildren: 0.01, staggerDirection: -1 } },
    expanded: { transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
  };

  const currentTemplate = templates[activeIndex] || templates[0];
  const textColor = getTemplateTextColor(currentTemplate);
  const mutedColor = getTemplateMutedColor(currentTemplate);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Template Filter Pills: All 8 Templates clearly listed */}
      <div className="w-full max-w-4xl flex items-center justify-center gap-2 flex-wrap mb-8 px-4">
        {templates.map((tpl, idx) => {
          const isSelected = activeIndex === idx;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleItemClick(idx)}
              className={`px-3.5 py-1.5 rounded-xs text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? 'bg-teal-900 text-white border-teal-900 shadow-md font-medium scale-105'
                  : 'bg-white/80 text-stone-700 border-stone-200 hover:bg-white hover:border-stone-400'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: tpl.paperColor }}
              />
              <span>{tpl.name}</span>
              <span className="text-[10px] opacity-75">{tpl.sealEmblem}</span>
            </button>
          );
        })}
      </div>

      {/* Main Radial Orbit Stage */}
      <div className="relative flex min-h-[580px] w-full touch-pan-y items-center justify-center overflow-visible select-none sm:min-h-[660px]">
        <AnimatePresence mode="popLayout">
          {isExpanded ? (
            <motion.div
              key="radial-view"
              variants={containerVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className={`relative flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing ${
                isPanning ? 'touch-none' : 'touch-pan-y'
              }`}
              onPanStart={() => setIsPanning(true)}
              onPanEnd={() => setIsPanning(false)}
              onPan={(_, info) => {
                rotation.set(rotation.get() + info.delta.x * 0.5);
              }}
            >
              {/* Radial Orbit Ring Guide */}
              <div
                className="absolute rounded-full border border-dashed border-stone-300 pointer-events-none opacity-60"
                style={{
                  width: responsiveSizes.radius * 2,
                  height: responsiveSizes.radius * 2,
                }}
              />

              {/* Center Active Template Preview Sheet */}
              <motion.div
                layoutId={`center-sheet-${currentTemplate.id}`}
                style={{
                  width: responsiveSizes.centerSize,
                  height: responsiveSizes.centerSize * 1.18,
                  backgroundColor: currentTemplate.paperColor,
                  color: textColor,
                }}
                className="relative z-10 overflow-hidden rounded-xs border border-stone-300 shadow-paper-lg p-5 sm:p-6 flex flex-col justify-between transition-colors duration-300"
              >
                {/* Air Mail Border if Air Mail */}
                {currentTemplate.id === 'air-mail' && (
                  <>
                    <div
                      className="absolute inset-x-0 top-0 h-2"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(-45deg, #dc2626, #dc2626 12px, #f8f9fa 12px, #f8f9fa 18px, #2563eb 18px, #2563eb 30px, #f8f9fa 30px, #f8f9fa 36px)',
                      }}
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 h-2"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(-45deg, #dc2626, #dc2626 12px, #f8f9fa 12px, #f8f9fa 18px, #2563eb 18px, #2563eb 30px, #f8f9fa 30px, #f8f9fa 36px)',
                      }}
                    />
                  </>
                )}

                {/* Diary Vermilion Margin Line if Diary */}
                {currentTemplate.id === 'diary' && (
                  <div className="absolute top-0 bottom-0 left-10 sm:left-12 w-[1px] bg-rose-400/50 pointer-events-none" />
                )}

                {/* Header */}
                <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: mutedColor }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white shadow-xs font-serif shrink-0"
                      style={{ backgroundColor: currentTemplate.sealColor }}
                    >
                      {currentTemplate.sealEmblem}
                    </span>
                    <div>
                      <span className="text-[9px] font-mono tracking-widest uppercase block" style={{ color: mutedColor }}>
                        {currentTemplate.category} EDITION
                      </span>
                      <h4 className="text-base sm:text-lg font-serif font-medium leading-none" style={{ color: textColor }}>
                        {currentTemplate.name}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: mutedColor }}>
                    ACTIVE
                  </span>
                </div>

                {/* Letter Body Preview */}
                <div className="space-y-2 py-3 flex-1 flex flex-col justify-center">
                  <div className="text-sm sm:text-base font-serif" style={{ color: textColor }}>
                    Dear Vasantha,
                  </div>
                  <p className="text-xs sm:text-sm font-serif italic leading-relaxed line-clamp-3" style={{ color: mutedColor }}>
                    "I am writing this on the balcony as the evening cools down over the city. I wanted to tell you how much I admire the way you pay attention to people."
                  </p>
                  <div className="text-[11px] font-serif italic" style={{ color: mutedColor }}>
                    Yours, Lokesh
                  </div>
                </div>

                {/* Footer Tagline */}
                <div className="border-t pt-2 flex items-center justify-between text-[10px] font-mono uppercase" style={{ borderColor: mutedColor, color: mutedColor }}>
                  <span className="truncate">{currentTemplate.tagline}</span>
                  <span className="shrink-0 ml-2 font-semibold">SELECTED</span>
                </div>
              </motion.div>

              {/* Orbiting 8 Templates */}
              {templates.map((tpl, index) => {
                const baseAngle =
                  (index / templates.length) * (2 * Math.PI) - Math.PI / 2;
                const isCurrent = activeIndex === index;
                return (
                  <OrbitTemplateItem
                    key={tpl.id}
                    template={tpl}
                    baseAngle={baseAngle}
                    radius={responsiveSizes.radius}
                    thumbnailSize={responsiveSizes.thumbnailSize}
                    rotation={smoothRotation}
                    isSelected={isCurrent}
                    onClick={() => handleItemClick(index)}
                  />
                );
              })}
            </motion.div>
          ) : (
            /* Collapsed Single View */
            <motion.div
              key="center-view"
              layout
              transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
              className="relative z-10 flex flex-col items-center gap-6"
            >
              <div
                style={{
                  width: responsiveSizes.centerSize * 1.2,
                  height: responsiveSizes.centerSize * 1.4,
                  backgroundColor: currentTemplate.paperColor,
                  color: textColor,
                }}
                className="relative overflow-hidden rounded-xs border border-stone-300 shadow-paper-lg p-8 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: mutedColor }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white shadow-xs font-serif"
                      style={{ backgroundColor: currentTemplate.sealColor }}
                    >
                      {currentTemplate.sealEmblem}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono tracking-widest uppercase block" style={{ color: mutedColor }}>
                        {currentTemplate.category}
                      </span>
                      <h3 className="text-xl font-serif font-medium">{currentTemplate.name}</h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 py-6">
                  <div className="text-lg font-serif">Dear Vasantha,</div>
                  <p className="text-base font-serif italic leading-relaxed" style={{ color: mutedColor }}>
                    "I am writing this on the balcony as the evening cools down over the city. I wanted to tell you how much I admire the way you pay attention to people."
                  </p>
                  <div className="text-sm font-serif italic" style={{ color: mutedColor }}>
                    Yours, Lokesh
                  </div>
                </div>

                <div className="border-t pt-3 flex items-center justify-between text-xs font-mono uppercase" style={{ borderColor: mutedColor, color: mutedColor }}>
                  <span>{currentTemplate.tagline}</span>
                  <span>{currentTemplate.description}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Strip */}
      <div className="flex items-center gap-4 mt-4">
        <button
          type="button"
          onClick={toggleExpand}
          className="inline-flex items-center gap-2 rounded-xs border border-stone-300 bg-white px-4 py-2 text-xs font-mono uppercase tracking-wider text-teal-900 hover:bg-stone-50 transition-colors cursor-pointer shadow-xs"
        >
          <Compass className="size-4 stroke-[1.75]" />
          <span>{isExpanded ? 'Focus Single Card' : 'Expand Radial Wheel (All 8)'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const nextIdx = (activeIndex + 1) % templates.length;
            handleItemClick(nextIdx);
          }}
          className="inline-flex items-center gap-1.5 rounded-xs border border-stone-300 bg-white px-3 py-2 text-xs font-mono uppercase tracking-wider text-teal-900 hover:bg-stone-50 transition-colors cursor-pointer shadow-xs"
        >
          <RotateCw className="size-3.5" />
          <span>Next Template</span>
        </button>
      </div>
    </div>
  );
};

interface OrbitTemplateItemProps {
  template: LetterTemplate;
  baseAngle: number;
  radius: number;
  thumbnailSize: number;
  rotation: any;
  isSelected: boolean;
  onClick: () => void;
}

const OrbitTemplateItem: React.FC<OrbitTemplateItemProps> = ({
  template,
  baseAngle,
  radius,
  thumbnailSize,
  rotation,
  isSelected,
  onClick,
}) => {
  const x = useTransform(rotation, (r: number) => {
    const currentAngle = baseAngle + (r * Math.PI) / 180;
    return Math.cos(currentAngle) * radius;
  });

  const y = useTransform(rotation, (r: number) => {
    const currentAngle = baseAngle + (r * Math.PI) / 180;
    return Math.sin(currentAngle) * radius;
  });

  const rotate = useTransform(rotation, (r: number) => {
    const currentAngle = baseAngle + (r * Math.PI) / 180;
    return (currentAngle * 180) / Math.PI + 90;
  });

  const itemVariants: Variants = {
    collapsed: {
      opacity: 0,
      scale: 0.8,
      transition: { type: 'spring', bounce: 0.4, duration: 0.5 },
    },
    expanded: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring', bounce: 0.4, duration: 0.5 },
    },
  };

  const isAirMail = template.id === 'air-mail';
  const isDiary = template.id === 'diary';
  const textColor = getTemplateTextColor(template);
  const mutedColor = getTemplateMutedColor(template);

  return (
    <motion.div
      variants={itemVariants}
      style={{ x, y, rotate }}
      onClick={onClick}
      className="absolute cursor-pointer z-20"
    >
      <motion.div
        layoutId={`card-${template.id}`}
        style={{
          width: thumbnailSize,
          height: thumbnailSize * 1.25,
          backgroundColor: template.paperColor,
          color: textColor,
        }}
        className={`group relative overflow-hidden rounded-xs border p-2 shadow-paper-md transition-all duration-300 hover:scale-115 flex flex-col justify-between ${
          isSelected
            ? 'ring-2 ring-teal-900 border-teal-900 shadow-xl scale-110'
            : 'border-stone-300 hover:border-stone-400'
        }`}
      >
        {/* Air Mail Border if Air Mail */}
        {isAirMail && (
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, #dc2626, #dc2626 6px, #f8f9fa 6px, #f8f9fa 9px, #2563eb 9px, #2563eb 15px, #f8f9fa 15px, #f8f9fa 18px)',
            }}
          />
        )}

        {/* Diary Line if Diary */}
        {isDiary && (
          <div className="absolute top-0 bottom-0 left-3 w-[1px] bg-rose-400/50 pointer-events-none" />
        )}

        {/* Top Seal Stamp & Category */}
        <div className="flex items-center justify-between">
          <span
            className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] text-white shadow-xs font-serif shrink-0"
            style={{ backgroundColor: template.sealColor }}
          >
            {template.sealEmblem}
          </span>
          <span className="text-[7px] sm:text-[8px] font-mono uppercase tracking-tighter truncate ml-1" style={{ color: mutedColor }}>
            {template.category}
          </span>
        </div>

        {/* Simulated handwritten prose lines */}
        <div className="space-y-1 my-1">
          <div className="h-0.5 sm:h-1 rounded-full w-4/5" style={{ backgroundColor: mutedColor, opacity: 0.4 }} />
          <div className="h-0.5 sm:h-1 rounded-full w-full" style={{ backgroundColor: mutedColor, opacity: 0.4 }} />
          <div className="h-0.5 sm:h-1 rounded-full w-3/4" style={{ backgroundColor: mutedColor, opacity: 0.4 }} />
        </div>

        {/* Template Title */}
        <div className="border-t pt-1" style={{ borderColor: mutedColor, opacity: 0.85 }}>
          <div className="text-[9px] sm:text-[10px] font-serif font-medium leading-tight truncate" style={{ color: textColor }}>
            {template.name}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

function getTemplateTextColor(template: LetterTemplate): string {
  if (template.id === 'burgundy') return '#f5eadc';
  if (template.id === 'midnight') return '#ede8df';
  return '#18181b';
}

function getTemplateMutedColor(template: LetterTemplate): string {
  if (template.id === 'burgundy') return 'rgba(245, 234, 220, 0.8)';
  if (template.id === 'midnight') return 'rgba(237, 232, 223, 0.8)';
  return 'rgba(24, 24, 27, 0.7)';
}

export default RadialCarousel;
