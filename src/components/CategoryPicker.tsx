import { useState } from 'react';
import { LetterCategory } from '../types';
import { LETTER_CATEGORIES } from '../data/mockData';
import {
  Heart,
  Cake,
  Gift,
  Compass,
  CloudMoon,
  Award,
  Key,
  Sun,
  Feather,
  Scroll,
  ArrowRight,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryPickerProps {
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function CategoryPicker({
  selectedCategoryId,
  onSelectCategory,
  onContinue,
  onBack,
}: CategoryPickerProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PERSONAL' | 'HEALING' | 'CELEBRATION'>('ALL');

  const getIcon = (iconName: string) => {
    const props = { className: 'w-5 h-5 text-[#5A2528]' };
    switch (iconName) {
      case 'Heart':
        return <Heart {...props} />;
      case 'Cake':
        return <Cake {...props} />;
      case 'Gift':
        return <Gift {...props} />;
      case 'Compass':
        return <Compass {...props} />;
      case 'CloudMoon':
        return <CloudMoon {...props} />;
      case 'Award':
        return <Award {...props} />;
      case 'Key':
        return <Key {...props} />;
      case 'Sun':
        return <Sun {...props} />;
      case 'Feather':
        return <Feather {...props} />;
      case 'Scroll':
      default:
        return <Scroll {...props} />;
    }
  };

  const filteredCategories = LETTER_CATEGORIES.filter((cat) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PERSONAL') return ['love', 'friendship', 'miss-you', 'farewell'].includes(cat.id);
    if (activeFilter === 'HEALING') return ['apology', 'sympathy', 'gratitude'].includes(cat.id);
    if (activeFilter === 'CELEBRATION') return ['birthday', 'congratulations', 'future-self', 'unspoken'].includes(cat.id);
    return true;
  });

  const selectedCategory = LETTER_CATEGORIES.find((c) => c.id === selectedCategoryId) || LETTER_CATEGORIES[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header breadcrumb & step indicator */}
      <div className="flex items-center justify-between border-b border-[#E3D7C5] pb-4 mb-8">
        <button
          onClick={onBack}
          className="text-xs font-mono tracking-wider uppercase text-[#7E6E62] hover:text-[#2C241F] flex items-center gap-1.5 transition-colors"
        >
          ← Back to OLD-LETTERS
        </button>

        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#886C3E] uppercase">
          <span className="font-bold text-[#5A2528]">STEP 01</span>
          <span className="text-stone-400">/ 05</span>
          <span className="text-stone-400">• CATEGORY</span>
        </div>
      </div>

      {/* Main Editorial Header */}
      <div className="max-w-2xl mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-[#886C3E] mb-2">
          OLD-LETTERS • CORRESPONDENCE DOSSIER
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-light text-[#241D18] leading-tight">
          What are you sending today?
        </h1>
        <p className="font-serif text-[#5E5046] text-base sm:text-lg mt-3 italic font-light">
          A physical postal label defines the spirit of your correspondence. Select the intention that
          guides your pen.
        </p>
      </div>

      {/* Category Filter Pills with Sliding Active Indicator */}
      <div className="flex flex-wrap gap-2 border-b border-[#E3D7C5] pb-4 mb-8">
        {(['ALL', 'PERSONAL', 'HEALING', 'CELEBRATION'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`relative px-4 sm:px-5 py-2 text-xs font-mono tracking-widest uppercase rounded-full transition-all ${
              activeFilter === filter
                ? 'text-[#FAF8F5] font-semibold'
                : 'text-[#7E6E62] hover:text-[#2C241F] hover:bg-[#EADBCE]/50'
            }`}
          >
            {activeFilter === filter && (
              <motion.div
                layoutId="category-filter-pill"
                className="absolute inset-0 bg-[#2C241F] rounded-full shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">{filter}</span>
          </button>
        ))}
      </div>

      {/* Category Grid with Sliding Card Stagger */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFilter}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredCategories.map((cat, idx) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onContinue();
                }}
                className={`group p-6 rounded-xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md flex flex-col justify-between min-h-[170px] relative ${
                  isSelected
                    ? 'border-[#5A2528] bg-[#FAF6EE] ring-2 ring-[#5A2528]/20'
                    : 'border-[#D8C4A9] bg-[#FAF8F5] hover:border-[#886C3E]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-[#EFE8DC] border border-[#D8C4A9]/80 group-hover:scale-110 transition-transform">
                      {getIcon(cat.iconName)}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono tracking-widest text-[#7E6E62] uppercase block">
                        {cat.postalCode}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5A2528] font-bold mt-0.5">
                          <Check className="w-3 h-3" /> ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-serif text-2xl text-[#241D18] group-hover:text-[#5A2528] transition-colors font-medium">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#5E5046] mt-2 font-sans line-clamp-2 leading-relaxed">
                    {cat.tagline}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E3D7C5] flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] text-[#886C3E] italic font-serif">
                    "{cat.prompt.slice(0, 32)}..."
                  </span>
                  <span className="text-[#5A2528] font-bold group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                    CHOOSE →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Floating Continue Footer Banner */}
      <div className="mt-12 p-6 rounded-2xl bg-[#2C241F] text-[#FAF8F5] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#5A2528] flex items-center justify-center font-serif text-lg text-white font-bold">
            ✓
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase text-stone-400">
              CURRENT INTENTION SELECTED
            </div>
            <div className="font-serif text-xl text-amber-100">{selectedCategory.name}</div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full sm:w-auto px-8 py-3.5 bg-[#5A2528] hover:bg-[#733034] text-white text-xs font-mono tracking-widest uppercase rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold"
        >
          <span>Continue to Stationery (02)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
