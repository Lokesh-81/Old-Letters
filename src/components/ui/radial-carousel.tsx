'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  type Variants,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
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
  onStartWriting?: () => void;
}

export const RadialCarousel: React.FC<RadialCarouselProps> = ({
  templates = TEMPLATES,
  activeTemplateId,
  radius = 275,
  thumbnailSize = 110,
  centerSize = 320,
  onSelectTemplate,
}) => {
  // Toggle between full radial orbit wheel and single focused card
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

  const N = templates.length;
  const angleStep = 360 / N;

  // Motion value for continuous rotation in degrees
  const rotation = useMotionValue(-initialIndex * angleStep);
  const smoothRotation = useSpring(rotation, {
    bounce: 0.12,
    duration: 0.35,
    damping: 24,
    stiffness: 170,
  });

  // Track pan start position
  const panStartRotation = useRef(0);

  // Sync activeIndex when activeTemplateId changes externally
  useEffect(() => {
    if (activeTemplateId) {
      const idx = templates.findIndex((t) => t.id === activeTemplateId);
      if (idx !== -1 && idx !== activeIndex) {
        rotateToIndex(idx);
      }
    }
  }, [activeTemplateId, templates]);

  // Responsive radius, thumbnail size, and center size
  useEffect(() => {
    const updateSizes = () => {
      const width = window.innerWidth;
      if (width < 500) {
        setResponsiveSizes({
          radius: 145,
          thumbnailSize: 68,
          centerSize: 190,
        });
      } else if (width < 768) {
        setResponsiveSizes({
          radius: 185,
          thumbnailSize: 82,
          centerSize: 240,
        });
      } else if (width < 1024) {
        setResponsiveSizes({
          radius: 235,
          thumbnailSize: 96,
          centerSize: 280,
        });
      } else {
        setResponsiveSizes({
          radius: 275,
          thumbnailSize: 110,
          centerSize: 320,
        });
      }
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, [radius, thumbnailSize, centerSize]);

  // Smoothly rotate the circle so template at targetIndex is at the prominent front position (-90deg)
  const rotateToIndex = useCallback(
    (targetIndex: number) => {
      const currentRot = rotation.get();
      // Current logical rotation in step units
      const currentStep = -currentRot / angleStep;
      // Calculate shortest angular path to targetIndex
      const currentNormalized = ((Math.round(currentStep) % N) + N) % N;
      let diff = targetIndex - currentNormalized;
      if (diff > N / 2) diff -= N;
      if (diff < -N / 2) diff += N;

      const newStep = Math.round(currentStep) + diff;
      rotation.set(-newStep * angleStep);
      setActiveIndex(targetIndex);
      onSelectTemplate?.(templates[targetIndex]);
    },
    [N, angleStep, onSelectTemplate, rotation, templates]
  );

  const handleItemClick = (index: number) => {
    rotateToIndex(index);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % N;
    rotateToIndex(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (activeIndex - 1 + N) % N;
    rotateToIndex(prevIdx);
  };

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const containerVariants: Variants = {
    collapsed: { transition: { staggerChildren: 0.01, staggerDirection: -1 } },
    expanded: { transition: { staggerChildren: 0.03, delayChildren: 0.08 } },
  };

  const currentTemplate = templates[activeIndex] || templates[0];
  const bg = currentTemplate.paperBackground || currentTemplate.paperColor || '#FAF6EE';
  const fg = currentTemplate.paperForeground || currentTemplate.inkColor || '#3A2520';
  const muted = currentTemplate.paperMuted || '#7A655C';
  const border = currentTemplate.paperBorder || '#CBBDA5';
  const accent = currentTemplate.paperAccent || '#5C1D24';

  return (
    <div className="w-full flex flex-col items-center select-none font-serif">
      {/* Template Filter Pills: All templates clearly listed */}
      <div className="w-full max-w-5xl flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap mb-8 px-4">
        {templates.map((tpl, idx) => {
          const isSelected = activeIndex === idx;
          const pillBg = tpl.paperBackground || tpl.paperColor || '#FAF6EE';
          const pillFg = tpl.paperForeground || tpl.inkColor || '#3A2520';
          const pillAccent = tpl.paperAccent || '#5C1D24';

          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleItemClick(idx)}
              className={`px-3 py-1.5 rounded-xs text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-teal-900 text-white border-teal-900 shadow-md font-medium scale-105'
                  : 'bg-white/85 text-stone-700 border-stone-200 hover:bg-white hover:border-stone-400'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: pillBg }}
              />
              <span>{tpl.name}</span>
              <span className="text-[10px] opacity-75" style={{ color: isSelected ? '#fde047' : pillAccent }}>
                {tpl.waxSealStyle?.emblem || tpl.sealEmblem || '✒'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Radial Orbit Stage with 3D Perspective */}
      <div
        className="relative flex min-h-[620px] sm:min-h-[700px] w-full touch-pan-y items-center justify-center overflow-visible select-none"
        style={{ perspective: '1200px' }}
      >
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
              style={{ transformStyle: 'preserve-3d' }}
              onPanStart={() => {
                setIsPanning(true);
                panStartRotation.current = rotation.get();
              }}
              onPan={(_, info) => {
                // Drag left/right rotates smoothly
                rotation.set(panStartRotation.current + info.offset.x * 0.45);
              }}
              onPanEnd={(_, info) => {
                setIsPanning(false);
                // Snap to nearest template index on release with velocity consideration
                const currentRot = rotation.get() + info.velocity.x * 0.05;
                const nearestStep = Math.round(-currentRot / angleStep);
                rotation.set(-nearestStep * angleStep);
                const newIndex = ((nearestStep % N) + N) % N;
                setActiveIndex(newIndex);
                onSelectTemplate?.(templates[newIndex]);
              }}
            >
              {/* True Circular Orbit Ring Guide */}
              <div
                className="absolute rounded-full border border-dashed border-stone-300 pointer-events-none opacity-60"
                style={{
                  width: responsiveSizes.radius * 2,
                  height: responsiveSizes.radius * 2,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />

              {/* Center Active Template Preview Sheet (Fixed Center with 3D elevation) */}
              <motion.div
                layoutId={`center-sheet-${currentTemplate.id}`}
                style={{
                  width: responsiveSizes.centerSize,
                  height: responsiveSizes.centerSize * 1.18,
                  backgroundColor: bg,
                  color: fg,
                  transform: 'translateZ(10px)',
                  transformStyle: 'preserve-3d',
                }}
                className="relative z-10 overflow-hidden rounded-xs border shadow-paper-lg p-5 sm:p-6 flex flex-col justify-between transition-colors duration-300"
              >
                {/* Air Mail Border if Air Mail */}
                {(currentTemplate.id === 'air-mail' || currentTemplate.borderStyle === 'airmail-chevron') && (
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
                {(currentTemplate.id === 'personal-diary' || currentTemplate.borderStyle === 'notebook-margin') && (
                  <div className="absolute top-0 bottom-0 left-10 sm:left-12 w-[1px] bg-rose-400/50 pointer-events-none" />
                )}

                {/* Header */}
                <div
                  className="flex items-center justify-between border-b pb-2.5"
                  style={{ borderColor: `${border}60` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white shadow-xs font-serif shrink-0"
                      style={{ backgroundColor: currentTemplate.waxSealStyle?.color || accent }}
                    >
                      {currentTemplate.waxSealStyle?.emblem || currentTemplate.sealEmblem || '✒'}
                    </span>
                    <div>
                      <span
                        className="text-[9px] font-mono tracking-widest uppercase block"
                        style={{ color: muted }}
                      >
                        {currentTemplate.category} EDITION
                      </span>
                      <h4
                        className="text-base sm:text-lg font-serif font-medium leading-none"
                        style={{ color: fg }}
                      >
                        {currentTemplate.name}
                      </h4>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-mono tracking-widest uppercase font-semibold"
                    style={{ color: accent }}
                  >
                    ACTIVE
                  </span>
                </div>

                {/* Letter Body Preview (Crisp High-Contrast Text) */}
                <div className="space-y-2 py-3 flex-1 flex flex-col justify-center">
                  <div className="text-sm sm:text-base font-serif font-medium" style={{ color: fg }}>
                    Dear Vasantha,
                  </div>
                  <p
                    className="text-xs sm:text-sm font-serif italic leading-relaxed line-clamp-3"
                    style={{ color: fg, opacity: 0.9 }}
                  >
                    &ldquo;I am writing this on the balcony as the evening cools down over the city. I wanted to tell you how much I value your presence in my life.&rdquo;
                  </p>
                  <div className="text-[11px] font-serif italic" style={{ color: fg, opacity: 0.85 }}>
                    With affection, Lokesh
                  </div>
                </div>

                {/* Footer Tagline */}
                <div
                  className="border-t pt-2 flex items-center justify-between text-[10px] font-mono uppercase"
                  style={{ borderColor: `${border}60`, color: muted }}
                >
                  <span className="truncate max-w-[200px]">{currentTemplate.tagline}</span>
                  <span className="shrink-0 ml-2 font-semibold">SELECTED</span>
                </div>
              </motion.div>

              {/* Orbiting Templates along the True Circular Orbit */}
              {templates.map((tpl, index) => {
                // Base angle in degrees starting at top center (-90deg)
                const baseAngleDeg = (index / N) * 360 - 90;
                const isCurrent = activeIndex === index;

                return (
                  <OrbitTemplateItem
                    key={tpl.id}
                    template={tpl}
                    baseAngleDeg={baseAngleDeg}
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
                  backgroundColor: bg,
                  color: fg,
                }}
                className="relative overflow-hidden rounded-xs border shadow-paper-lg p-8 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: `${border}60` }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white shadow-xs font-serif"
                      style={{ backgroundColor: currentTemplate.waxSealStyle?.color || accent }}
                    >
                      {currentTemplate.waxSealStyle?.emblem || '✒'}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono tracking-widest uppercase block" style={{ color: muted }}>
                        {currentTemplate.category}
                      </span>
                      <h3 className="text-xl font-serif font-medium">{currentTemplate.name}</h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 py-6">
                  <div className="text-lg font-serif">Dear Vasantha,</div>
                  <p className="text-base font-serif italic leading-relaxed" style={{ color: fg, opacity: 0.9 }}>
                    &ldquo;I am writing this on the balcony as the evening cools down over the city. I wanted to tell you how much I value your presence in my life.&rdquo;
                  </p>
                  <div className="text-sm font-serif italic" style={{ color: fg, opacity: 0.85 }}>
                    With affection, Lokesh
                  </div>
                </div>

                <div
                  className="border-t pt-3 flex items-center justify-between text-xs font-mono uppercase"
                  style={{ borderColor: `${border}60`, color: muted }}
                >
                  <span>{currentTemplate.tagline}</span>
                  <span>{currentTemplate.paperWeight || '280 GSM'}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Strip */}
      <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
        <button
          type="button"
          onClick={handlePrev}
          className="inline-flex items-center gap-1.5 rounded-xs border border-stone-300 bg-white px-3 py-2 text-xs font-mono uppercase tracking-wider text-teal-900 hover:bg-stone-50 transition-colors cursor-pointer shadow-xs"
        >
          <span>← Previous</span>
        </button>

        <button
          type="button"
          onClick={toggleExpand}
          className="inline-flex items-center gap-2 rounded-xs border border-stone-300 bg-white px-4 py-2 text-xs font-mono uppercase tracking-wider text-teal-900 hover:bg-stone-50 transition-colors cursor-pointer shadow-xs"
        >
          <Compass className="size-4 stroke-[1.75]" />
          <span>{isExpanded ? 'Focus Single Card' : `Expand Radial Wheel (${templates.length})`}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-1.5 rounded-xs border border-stone-300 bg-white px-3 py-2 text-xs font-mono uppercase tracking-wider text-teal-900 hover:bg-stone-50 transition-colors cursor-pointer shadow-xs"
        >
          <RotateCw className="size-3.5" />
          <span>Next Template →</span>
        </button>
      </div>
    </div>
  );
};

interface OrbitTemplateItemProps {
  template: LetterTemplate;
  baseAngleDeg: number;
  radius: number;
  thumbnailSize: number;
  rotation: any;
  isSelected: boolean;
  onClick: () => void;
}

const OrbitTemplateItem: React.FC<OrbitTemplateItemProps> = ({
  template,
  baseAngleDeg,
  radius,
  thumbnailSize,
  rotation,
  isSelected,
  onClick,
}) => {
  // True circular formula: x = centerX + radius * cos(angle), y = centerY + radius * sin(angle)
  const x = useTransform(rotation, (r: number) => {
    const angleRad = ((baseAngleDeg + r) * Math.PI) / 180;
    return Math.cos(angleRad) * radius;
  });

  const y = useTransform(rotation, (r: number) => {
    const angleRad = ((baseAngleDeg + r) * Math.PI) / 180;
    return Math.sin(angleRad) * radius;
  });

  // Perspective 3D depth calculations relative to front viewing area (-90deg)
  const z = useTransform(rotation, (r: number) => {
    const currentAngleDeg = baseAngleDeg + r;
    const diffDeg = ((((currentAngleDeg - (-90)) % 360) + 540) % 360) - 180;
    const diffRad = (diffDeg * Math.PI) / 180;
    const depth = (1 + Math.cos(diffRad)) / 2; // 1 at front, 0 at back
    return (depth - 0.5) * 80; // +40px front, -40px back
  });

  const scale = useTransform(rotation, (r: number) => {
    const currentAngleDeg = baseAngleDeg + r;
    const diffDeg = ((((currentAngleDeg - (-90)) % 360) + 540) % 360) - 180;
    const diffRad = (diffDeg * Math.PI) / 180;
    const depth = (1 + Math.cos(diffRad)) / 2;
    return 0.82 + 0.28 * depth; // 1.1x at front, 0.82x at back
  });

  const rotateY = useTransform(rotation, (r: number) => {
    const currentAngleDeg = baseAngleDeg + r;
    const diffDeg = ((((currentAngleDeg - (-90)) % 360) + 540) % 360) - 180;
    const diffRad = (diffDeg * Math.PI) / 180;
    return -Math.sin(diffRad) * 20; // Natural 3D inward tilt
  });

  const rotateZ = useTransform(rotation, (r: number) => {
    const currentAngleDeg = baseAngleDeg + r;
    return currentAngleDeg + 90; // Tangential to circle
  });

  const opacity = useTransform(rotation, (r: number) => {
    const currentAngleDeg = baseAngleDeg + r;
    const diffDeg = ((((currentAngleDeg - (-90)) % 360) + 540) % 360) - 180;
    const diffRad = (diffDeg * Math.PI) / 180;
    const depth = (1 + Math.cos(diffRad)) / 2;
    return 0.65 + 0.35 * depth; // 1.0 at front, 0.65 at back
  });

  const zIndex = useTransform(rotation, (r: number) => {
    const currentAngleDeg = baseAngleDeg + r;
    const diffDeg = ((((currentAngleDeg - (-90)) % 360) + 540) % 360) - 180;
    const diffRad = (diffDeg * Math.PI) / 180;
    const depth = (1 + Math.cos(diffRad)) / 2;
    return Math.round(depth * 50);
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

  const isAirMail = template.id === 'air-mail' || template.borderStyle === 'airmail-chevron';
  const isDiary = template.id === 'personal-diary' || template.borderStyle === 'notebook-margin';
  const cardBg = template.paperBackground || template.paperColor || '#FAF6EE';
  const cardFg = template.paperForeground || template.inkColor || '#3A2520';
  const cardMuted = template.paperMuted || '#7A655C';
  const cardBorder = template.paperBorder || '#CBBDA5';
  const cardAccent = template.waxSealStyle?.color || template.paperAccent || '#5c1d24';

  return (
    <motion.div
      variants={itemVariants}
      style={{
        x,
        y,
        z,
        scale,
        rotateY,
        rotateZ,
        opacity,
        zIndex,
        position: 'absolute',
        transformStyle: 'preserve-3d',
      }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <motion.div
        layoutId={`card-${template.id}`}
        style={{
          width: thumbnailSize,
          height: thumbnailSize * 1.25,
          backgroundColor: cardBg,
          color: cardFg,
          borderColor: isSelected ? cardAccent : cardBorder,
        }}
        className={`group relative overflow-hidden rounded-xs border p-2 transition-all duration-300 hover:scale-115 flex flex-col justify-between ${
          isSelected
            ? 'ring-2 ring-teal-900 shadow-xl'
            : 'shadow-paper-md hover:border-stone-400'
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
            style={{ backgroundColor: cardAccent }}
          >
            {template.waxSealStyle?.emblem || template.sealEmblem || '✒'}
          </span>
          <span
            className="text-[7px] sm:text-[8px] font-mono uppercase tracking-tighter truncate ml-1"
            style={{ color: cardMuted }}
          >
            {template.category}
          </span>
        </div>

        {/* Simulated handwritten prose lines */}
        <div className="space-y-1 my-1">
          <div className="h-0.5 sm:h-1 rounded-full w-4/5" style={{ backgroundColor: cardFg, opacity: 0.25 }} />
          <div className="h-0.5 sm:h-1 rounded-full w-full" style={{ backgroundColor: cardFg, opacity: 0.25 }} />
          <div className="h-0.5 sm:h-1 rounded-full w-3/4" style={{ backgroundColor: cardFg, opacity: 0.25 }} />
        </div>

        {/* Template Title */}
        <div className="border-t pt-1" style={{ borderColor: `${cardBorder}60` }}>
          <div
            className="text-[9px] sm:text-[10px] font-serif font-medium leading-tight truncate"
            style={{ color: cardFg }}
          >
            {template.name}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RadialCarousel;
