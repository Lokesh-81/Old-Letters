import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Compass, Feather, Send, Sparkles as _Sparkles, Shield, Bookmark, ArrowRight, X } from 'lucide-react';

export interface VintageStamp {
  id: string;
  name: string;
  denomination: string;
  country: string;
  series: string;
  year: string;
  color: string; // Primary ink / vignette hue
  paperBg: string; // Vintage paper tint
  motif: 'airmail' | 'fern' | 'sextant' | 'wax' | 'lighthouse' | 'sunburst';
  description: string;
  edition: string;
}

export const VINTAGE_STAMPS: VintageStamp[] = [
  {
    id: 'airmail-1928',
    name: 'Transcontinental Airmail',
    denomination: '25¢',
    country: 'OLD-LETTERS',
    series: 'Aerial Postal Dispatch',
    year: '1928',
    color: '#5A2528',
    paperBg: '#FAF4EB',
    motif: 'airmail',
    description: 'Issued for long-distance nocturnal air dispatches over mountains and seas.',
    edition: 'Edition of 1,200 // Die No. 04',
  },
  {
    id: 'botanical-fern',
    name: 'Florentine Wild Fern',
    denomination: '15¢',
    country: 'OLD-LETTERS',
    series: 'Herbarium & Naturalia',
    year: '1932',
    color: '#284632',
    paperBg: '#F3F6F1',
    motif: 'fern',
    description: 'Drawn from pressed specimens gathered along the Tuscan riverbanks in autumn.',
    edition: 'Edition of 850 // Copperplate',
  },
  {
    id: 'astronomer-sextant',
    name: 'Celestial Meridian Sextant',
    denomination: '50¢',
    country: 'OLD-LETTERS',
    series: 'Stellar Navigation',
    year: '1912',
    color: '#1C2C45',
    paperBg: '#F0F3F7',
    motif: 'sextant',
    description: 'Reserved for letters guided by constellations across northern ocean routes.',
    edition: 'Edition of 600 // Archival Steel',
  },
  {
    id: 'wax-emblem-solstice',
    name: 'Veritas Foundry Quill & Seal',
    denomination: '10¢',
    country: 'OLD-LETTERS',
    series: 'Foundry Standard',
    year: '1924',
    color: '#824520',
    paperBg: '#FBF4EB',
    motif: 'wax',
    description: 'The quintessential postal seal signifying an unhurried, private manuscript.',
    edition: 'Edition of 3,500 // Woodblock',
  },
  {
    id: 'maritime-lighthouse',
    name: 'Cape Horn Beacon',
    denomination: '35¢',
    country: 'OLD-LETTERS',
    series: 'Maritime Wayfarer',
    year: '1936',
    color: '#34414B',
    paperBg: '#F2F4F5',
    motif: 'lighthouse',
    description: 'Guiding steam packet mailboats through storm tides into safe harbor.',
    edition: 'Edition of 950 // Intaglio',
  },
  {
    id: 'solstice-sunburst',
    name: 'Imperial Solstice Sun',
    denomination: '$1.00',
    country: 'OLD-LETTERS',
    series: 'Centennial Milestone',
    year: '1929',
    color: '#785E22',
    paperBg: '#FCF8EE',
    motif: 'sunburst',
    description: 'High-value commemorative stamp with golden leaf and classical olive laurels.',
    edition: 'Edition of 400 // Gold Foil Accent',
  },
];

export function getVintageStamp(id?: string): VintageStamp {
  return VINTAGE_STAMPS.find((s) => s.id === id) || VINTAGE_STAMPS[0];
}

interface StampMotifIconProps {
  motif: VintageStamp['motif'];
  color: string;
}

export function StampMotifIcon({ motif, color }: StampMotifIconProps) {
  switch (motif) {
    case 'airmail':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" stroke={color} strokeWidth="1.6">
          {/* Biplane & postal wings */}
          <path d="M12 32h40M32 16v32" strokeLinecap="round" />
          <path d="M22 22l10 10-10 10M42 22l-10 10 10 10" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          <circle cx="32" cy="32" r="14" strokeDasharray="3 2" />
          <path d="M16 18c8-6 24-6 32 0M16 46c8 6 24 6 32 0" strokeDasharray="1.5 2" opacity="0.5" />
        </svg>
      );
    case 'fern':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" stroke={color} strokeWidth="1.6">
          {/* Botanical fern frond */}
          <path d="M32 54C32 38 34 22 40 10" strokeLinecap="round" />
          <path d="M32 46c6-4 12-4 16 0M32 40c-6-4-12-4-16 0" strokeLinecap="round" />
          <path d="M33 34c5-4 11-4 15 0M33 28c-5-4-11-4-15 0" strokeLinecap="round" />
          <path d="M34 22c4-3 9-3 13 0M34 16c-4-3-9-3-13 0" strokeLinecap="round" />
          <circle cx="32" cy="32" r="18" strokeDasharray="3 2" opacity="0.3" />
        </svg>
      );
    case 'sextant':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" stroke={color} strokeWidth="1.6">
          {/* Celestial Sextant & compass */}
          <circle cx="32" cy="18" r="4" />
          <path d="M32 22v26M20 44c6 4 18 4 24 0" strokeLinecap="round" />
          <path d="M22 26l20 20M42 26L22 46" strokeDasharray="2 2" opacity="0.6" />
          <circle cx="32" cy="32" r="18" strokeDasharray="2 3" />
          <circle cx="46" cy="18" r="1.5" fill={color} />
          <circle cx="18" cy="18" r="1.5" fill={color} />
        </svg>
      );
    case 'wax':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" stroke={color} strokeWidth="1.6">
          {/* Classic Quill & Sealed Envelope */}
          <rect x="16" y="24" width="32" height="22" rx="1.5" strokeWidth="1.4" />
          <path d="M16 26l16 12 16-12" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="35" r="4" fill={color} opacity="0.8" />
          <path d="M42 12c-4 6-8 14-8 20" strokeLinecap="round" />
        </svg>
      );
    case 'lighthouse':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" stroke={color} strokeWidth="1.6">
          {/* Granite Lighthouse over waves */}
          <path d="M28 44l3-26h2l3 26z" strokeLinejoin="round" />
          <path d="M26 44h12M28 18h8M30 14h4v4h-4z" />
          <path d="M14 50c6-3 12 3 18 0s12 3 18 0" strokeLinecap="round" />
          <path d="M16 54c6-2 12 2 16 0s12 2 16 0" strokeLinecap="round" opacity="0.6" />
          <path d="M24 16L12 12M40 16l12-4" strokeDasharray="2 2" opacity="0.6" />
        </svg>
      );
    case 'sunburst':
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-10 h-10" stroke={color} strokeWidth="1.6">
          {/* Imperial Solstice Sun with Laurels */}
          <circle cx="32" cy="32" r="7" strokeWidth="1.8" />
          <path d="M32 18v5M32 41v5M18 32h5M41 32h5" strokeLinecap="round" />
          <path d="M22 22l4 4M38 38l4 4M22 42l4-4M38 26l4-4" strokeLinecap="round" opacity="0.7" />
          <path d="M16 38c0 8 7 12 16 12s16-4 16-12" strokeLinecap="round" strokeDasharray="3 2" />
        </svg>
      );
  }
}

interface StampVisualProps {
  stamp: VintageStamp;
  isAffixed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function StampVisual({
  stamp,
  isAffixed = false,
  size = 'md',
  className = '',
  onClick,
}: StampVisualProps) {
  const sizeMap = {
    sm: 'w-16 h-20 text-[6px]',
    md: 'w-24 h-32 text-[8px]',
    lg: 'w-32 h-44 text-[10px]',
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative select-none shrink-0 transition-transform ${sizeMap[size]} ${
        onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''
      } ${className}`}
      style={{
        // Realistic perforated stamp effect
        filter: 'drop-shadow(0 4px 10px rgba(44, 36, 31, 0.15))',
      }}
    >
      {/* Outer perforated scalloped border illusion */}
      <div
        className="w-full h-full p-1.5 rounded-[2px] flex flex-col justify-between border-2 border-dashed"
        style={{
          backgroundColor: stamp.paperBg,
          borderColor: `${stamp.color}40`,
        }}
      >
        {/* Inner vignette frame */}
        <div
          className="w-full h-full border flex flex-col justify-between p-1.5 rounded-[1px] relative overflow-hidden"
          style={{
            borderColor: `${stamp.color}50`,
            backgroundColor: `${stamp.paperBg}99`,
            color: stamp.color,
          }}
        >
          {/* Subtle paper grain noise */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: `radial-gradient(${stamp.color} 0.5px, transparent 0.5px)`,
              backgroundSize: '8px 8px',
            }}
          />

          {/* Header: Country & Denomination */}
          <div className="relative z-10 flex justify-between items-center font-mono font-bold tracking-widest leading-none">
            <span className="uppercase text-[6px] sm:text-[7px] truncate max-w-[65%]">
              {stamp.country}
            </span>
            <span className="text-[8px] sm:text-[9px] font-serif font-bold">
              {stamp.denomination}
            </span>
          </div>

          {/* Central engraved vignette motif */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center py-1">
            <div className="p-1 rounded-full border border-dashed border-current/30 bg-white/40">
              <StampMotifIcon motif={stamp.motif} color={stamp.color} />
            </div>
            <span className="font-serif italic font-medium mt-1 leading-tight text-[8px] sm:text-[9px] text-center line-clamp-1">
              {stamp.name}
            </span>
          </div>

          {/* Footer: Series & Year */}
          <div className="relative z-10 border-t border-current/20 pt-0.5 flex items-center justify-between font-mono text-[6px] opacity-75">
            <span>{stamp.year}</span>
            <span className="tracking-tighter uppercase font-medium">OFFICIAL POST</span>
          </div>

          {/* Postmark cancellation overlay when affixed */}
          {isAffixed && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-65 mix-blend-multiply rotate-[-12deg]">
              <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="35" stroke="#5A2528" strokeWidth="1.5" strokeDasharray="3 2" />
                <path d="M15 45c15-8 55-8 70 0M15 55c15-8 55-8 70 0" stroke="#5A2528" strokeWidth="1.2" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StampSelectionProps {
  selectedStampId?: string;
  onSelectStamp: (stampId: string) => void;
  onClose?: () => void;
  mode?: 'modal' | 'inline';
}

export function StampSelection({
  selectedStampId,
  onSelectStamp,
  onClose,
  mode = 'modal',
}: StampSelectionProps) {
  const [filter, setFilter] = useState<'ALL' | 'CLASSIC' | 'EXPEDITION' | 'BOTANICAL'>('ALL');
  const [justAffixedId, setJustAffixedId] = useState<string | null>(null);

  const activeStamp = getVintageStamp(selectedStampId);

  const filteredStamps = VINTAGE_STAMPS.filter((stamp) => {
    if (filter === 'CLASSIC') return stamp.motif === 'airmail' || stamp.motif === 'wax';
    if (filter === 'EXPEDITION') return stamp.motif === 'sextant' || stamp.motif === 'lighthouse';
    if (filter === 'BOTANICAL') return stamp.motif === 'fern' || stamp.motif === 'sunburst';
    return true;
  });

  const handleAffix = (stampId: string) => {
    onSelectStamp(stampId);
    setJustAffixedId(stampId);
    setTimeout(() => {
      setJustAffixedId(null);
    }, 1200);
  };

  const content = (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex items-start justify-between border-b border-[#D8C4A9] pb-4">
        <div>
          <div className="text-[10px] font-mono tracking-widest uppercase text-[#886C3E] font-bold">
            ARCHIVAL POSTAL VAULT // № 04
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#241D18] font-normal mt-1">
            Vintage Postage Stamps
          </h2>
          <p className="font-serif text-xs sm:text-sm italic text-[#5E5046] mt-1">
            Affix a collectible philatelic specimen to travel alongside your manuscript.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200/60 text-stone-500 hover:text-stone-800 transition-colors"
            title="Close stamp vault"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        {[
          { id: 'ALL', label: 'All Specimens' },
          { id: 'CLASSIC', label: 'Classic Airmail' },
          { id: 'EXPEDITION', label: 'Navigation & Coast' },
          { id: 'BOTANICAL', label: 'Flora & Solstice' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-full uppercase tracking-wider text-[10px] transition-all whitespace-nowrap ${
              filter === tab.id
                ? 'bg-[#5A2528] text-white font-bold shadow-xs'
                : 'bg-[#FAF6EE] text-[#7E6E62] hover:bg-[#F2EADB] border border-[#D8C4A9]/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Currently Affixed Highlight Banner */}
      <div className="p-4 rounded-xl border border-[#D8C4A9] bg-[#FAF6EE] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <StampVisual stamp={activeStamp} size="sm" isAffixed />
          <div>
            <div className="text-[9px] font-mono tracking-widest uppercase text-[#886C3E]">
              CURRENTLY AFFIXED TO SHEET
            </div>
            <div className="font-serif text-base font-medium text-[#241D18]">
              {activeStamp.name} • {activeStamp.denomination}
            </div>
            <div className="text-[11px] font-serif italic text-[#6B5D52] line-clamp-1">
              {activeStamp.description}
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#5A2528] bg-amber-50 px-3 py-1.5 rounded-full border border-amber-900/20 shrink-0">
          <Check className="w-3.5 h-3.5 text-[#5A2528]" />
          <span>AFFIXED</span>
        </div>
      </div>

      {/* Grid of Collectible Vintage Stamps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredStamps.map((stamp) => {
          const isSelected = stamp.id === selectedStampId;
          const isJustAffixed = justAffixedId === stamp.id;

          return (
            <motion.div
              key={stamp.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleAffix(stamp.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                isSelected
                  ? 'border-[#5A2528] bg-[#FAF6EE] shadow-md ring-1 ring-[#5A2528]/40'
                  : 'border-[#D8C4A9] bg-[#FAF8F5] hover:border-[#886C3E] hover:bg-[#FAF6EE]'
              }`}
            >
              {/* Stamp Display Card */}
              <div className="flex items-start gap-3">
                <StampVisual stamp={stamp} size="sm" isAffixed={isSelected} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-wider text-[#886C3E] uppercase font-bold">
                      {stamp.year} // {stamp.denomination}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase bg-[#5A2528] text-white px-1.5 py-0.5 rounded-full">
                        <Check className="w-2.5 h-2.5" />
                        Affixed
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-sm font-medium text-[#241D18] mt-0.5 leading-snug">
                    {stamp.name}
                  </h3>

                  <p className="text-[11px] font-serif italic text-[#7E6E62] line-clamp-2 mt-1 leading-tight">
                    {stamp.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3 pt-2.5 border-t border-[#E8DFC8] flex items-center justify-between">
                <span className="text-[9px] font-mono text-[#8E7E72] truncate max-w-[140px]">
                  {stamp.series}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAffix(stamp.id);
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase transition-all flex items-center gap-1 font-semibold ${
                    isSelected
                      ? 'bg-[#5A2528] text-white'
                      : 'bg-[#FAF6EE] text-[#5A2528] hover:bg-[#5A2528] hover:text-white border border-[#D8C4A9]'
                  }`}
                >
                  {isJustAffixed ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>AFFIXED!</span>
                    </>
                  ) : isSelected ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>AFFIXED</span>
                    </>
                  ) : (
                    <span>AFFIX STAMP</span>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Philatelic Detail Note */}
      <div className="pt-2 text-center text-[10px] font-mono text-[#7E6E62]">
        Authentic perforations and postmark cancellation lines are rendered automatically upon affixing.
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#FAF8F5] border border-[#D8C4A9] rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF8F5] border border-[#D8C4A9] rounded-xl p-6 shadow-sm">
      {content}
    </div>
  );
}
