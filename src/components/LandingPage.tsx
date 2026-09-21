import { useState } from 'react';
import { HeroDesk } from './HeroDesk';
import { LETTER_CATEGORIES } from '../data/mockData';
import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Feather,
  ShieldCheck,
  Mail,
  BookOpen,
  Layers,
} from 'lucide-react';

interface LandingPageProps {
  onStartWriting: () => void;
  onSelectCategory: (catId: string) => void;
  onOpenArchive: () => void;
  onOpenHowItWorks: () => void;
}

export function LandingPage({
  onStartWriting,
  onSelectCategory,
  onOpenArchive,
  onOpenHowItWorks,
}: LandingPageProps) {
  const [categoryIndex, setCategoryIndex] = useState(0);

  const nextCategorySlide = () => {
    setCategoryIndex((prev) => (prev + 1) % Math.ceil(LETTER_CATEGORIES.length / 4));
  };

  const prevCategorySlide = () => {
    setCategoryIndex((prev) => (prev - 1 + Math.ceil(LETTER_CATEGORIES.length / 4)) % Math.ceil(LETTER_CATEGORIES.length / 4));
  };

  return (
    <div className="w-full pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 sm:pt-16 pb-16 sm:pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          {/* Subtle postal header mark */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D8C4A9] bg-[#F5EFE6] text-[#5A2528] text-xs font-mono tracking-widest uppercase mb-6 shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#5A2528]" />
            CORRESPONDENCE SANCTUARY
          </motion.div>

          {/* Prominent OLD-LETTERS Wordmark */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-5xl sm:text-7xl lg:text-8xl font-normal text-[#241D18] tracking-[0.16em] uppercase leading-none mb-4"
          >
            OLD-LETTERS
          </motion.h1>

          {/* Tagline: Some things are worth waiting for. */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-serif italic text-2xl sm:text-3xl text-[#5A2528] max-w-2xl mx-auto leading-relaxed font-light mb-8"
          >
            Some things are worth waiting for.
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              id="hero-write-cta"
              onClick={onStartWriting}
              className="w-full sm:w-auto px-9 py-4 bg-[#5A2528] text-[#FAF8F5] text-xs font-mono tracking-[0.2em] uppercase rounded-full hover:bg-[#3F191B] transition-all duration-300 shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-3 font-semibold"
            >
              <span>WRITE A LETTER →</span>
            </button>

            <button
              id="hero-explore-cta"
              onClick={() => {
                const el = document.getElementById('post-office-environment');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-4 border border-[#C4AC8D] text-[#2C241F] text-xs font-mono tracking-widest uppercase rounded-full hover:bg-[#EADBCE]/50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Explore The Sanctuary</span>
            </button>
          </motion.div>
        </div>

        {/* Hero Visual: Cinematic Vintage Writing Desk */}
        <div className="mt-8 sm:mt-12">
          <HeroDesk onStartWriting={onStartWriting} onSelectCategory={onSelectCategory} />
        </div>
      </section>

      {/* 2. SLIDING CATEGORIES STRIP: "WHAT ARE YOU SENDING TODAY?" */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#EADBCE]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#886C3E] mb-2">
              DISPATCH CATALOGUE
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#241D18] font-normal">
              What are you sending today?
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#7E6E62] hidden sm:inline">
              SLIDE TO EXPLORE CATEGORIES
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={prevCategorySlide}
                className="w-9 h-9 rounded-full border border-[#D8C4A9] bg-[#FAF8F5] text-[#2C241F] flex items-center justify-center hover:bg-[#FAF6EE] transition-colors"
                title="Previous categories"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextCategorySlide}
                className="w-9 h-9 rounded-full border border-[#D8C4A9] bg-[#FAF8F5] text-[#2C241F] flex items-center justify-center hover:bg-[#FAF6EE] transition-colors"
                title="Next categories"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sliding Category Cards Container */}
        <div className="overflow-hidden">
          <motion.div
            animate={{ x: `-${categoryIndex * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex gap-4"
          >
            {LETTER_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="group shrink-0 w-[calc(100%-1rem)] sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-0.75rem)] p-5 rounded-xl bg-[#FAF8F5] border border-[#D8C4A9] hover:border-[#5A2528] cursor-pointer transition-all duration-300 hover:-translate-y-1 paper-shadow relative flex flex-col justify-between min-h-[160px]"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono tracking-widest text-[#7E6E62] uppercase">
                    {cat.postalCode}
                  </span>
                  <span className="text-xs font-mono text-[#5A2528] opacity-0 group-hover:opacity-100 transition-opacity">
                    SELECT →
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#241D18] group-hover:text-[#5A2528] transition-colors font-medium">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#5E5046] line-clamp-2 mt-1 font-sans">
                    {cat.tagline}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={onStartWriting}
            className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#5A2528] hover:text-[#241D18] underline underline-offset-4"
          >
            <span>View All 11 Postal Categories In Studio →</span>
          </button>
        </div>
      </section>

      {/* 3. OLD-LETTERS ENVIRONMENT: 5 ROOMS */}
      <section
        id="post-office-environment"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#EADBCE]"
      >
        <div className="max-w-3xl mb-16">
          <div className="text-xs font-mono uppercase tracking-widest text-[#886C3E] mb-2">
            THE ARCHITECTURE OF SLOW MAIL
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl text-[#241D18] font-normal leading-tight">
            A quiet sanctuary for words that matter.
          </h2>
          <p className="font-serif text-lg text-[#5E5046] mt-4 leading-relaxed font-light">
            In an era of disposable instant messaging, OLD-LETTERS resurrects the sacred
            physical ritual of letterpress, delayed transit, and true emotional anticipation.
          </p>
        </div>

        <div className="space-y-12 sm:space-y-16">
          {/* Room 1: The Writing Desk */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#FAF8F5] p-6 sm:p-10 rounded-2xl border border-[#D8C4A9]">
            <div className="lg:col-span-6 space-y-4">
              <div className="text-xs font-mono uppercase tracking-widest text-[#5A2528]">
                ROOM I • THE WRITING DESK
              </div>
              <h3 className="font-serif text-2xl sm:text-4xl text-[#241D18]">
                Where thought is given space to breathe.
              </h3>
              <p className="text-sm sm:text-base text-[#5E5046] leading-relaxed">
                Take a seat before a blank manuscript. No noisy notifications, read receipts, or
                typing indicators. Write at your own pace, enclose a vintage Polaroid or Super-8 film capture,
                and sign your name with lasting purpose.
              </p>
              <div className="pt-2">
                <button
                  onClick={onStartWriting}
                  className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#5A2528] font-semibold hover:underline"
                >
                  Enter the Writing Desk →
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#F5EFE6] p-6 rounded-xl border border-[#E3D7C5] relative">
              <Postmark date="DISPATCH 1924" city="WRITING DESK" className="absolute top-4 right-4" />
              <div className="font-mono text-xs text-[#7E6E62] mb-3">MANUSCRIPT SPECIMEN</div>
              <blockquote className="font-serif italic text-lg sm:text-xl text-[#2C241F] leading-relaxed">
                "When you write a letter, you give someone a piece of your time that was held completely still."
              </blockquote>
              <div className="mt-4 pt-4 border-t border-[#D8C4A9]/70 flex items-center justify-between text-xs font-mono text-[#5C4F45]">
                <span>FEATHER NIB // DECKLED VELLUM</span>
                <span>FREE DELAYED DELIVERY</span>
              </div>
            </div>
          </div>

          {/* Room 2: The Stationery Room */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#FAF8F5] p-6 sm:p-10 rounded-2xl border border-[#D8C4A9]">
            <div className="lg:col-span-6 order-2 lg:order-1 bg-[#F5EFE6] p-6 rounded-xl border border-[#E3D7C5]">
              <div className="grid grid-cols-2 gap-3 text-center text-xs font-mono">
                <div className="p-3 bg-[#FAF6EE] border border-[#D8C4A9] rounded-lg">
                  <div className="font-serif text-base text-[#2C241F] mb-1">Cream Letter</div>
                  <span className="text-[#886C3E]">CLASSIC</span>
                </div>
                <div className="p-3 bg-[#F8FAF9] border border-blue-200 rounded-lg">
                  <div className="font-serif text-base text-[#1F2D3D] mb-1">Blue Air Mail</div>
                  <span className="text-blue-700">TRANSATLANTIC</span>
                </div>
                <div className="p-3 bg-[#FBF5F3] border border-rose-200 rounded-lg">
                  <div className="font-serif text-base text-[#382226] mb-1">Rose Petal</div>
                  <span className="text-rose-700">BOTANICAL</span>
                </div>
                <div className="p-3 bg-[#1A212D] text-slate-100 border border-slate-700 rounded-lg">
                  <div className="font-serif text-base text-slate-100 mb-1">Midnight Ink</div>
                  <span className="text-amber-300">NOCTURNE</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
              <div className="text-xs font-mono uppercase tracking-widest text-[#5A2528]">
                ROOM II • THE STATIONERY ROOM
              </div>
              <h3 className="font-serif text-2xl sm:text-4xl text-[#241D18]">
                Curated papers from classic archives.
              </h3>
              <p className="text-sm sm:text-base text-[#5E5046] leading-relaxed">
                Sixteen bespoke stationery templates crafted from historical paper weights,
                pressed botanicals, Paris airmail stripes, and hand-typed ribbon impressions. All
                templates are 100% complimentary.
              </p>
            </div>
          </div>

          {/* Room 3 & 4: The Post Box & The Delivery Room */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#FAF8F5] p-6 sm:p-8 rounded-2xl border border-[#D8C4A9] space-y-4">
              <div className="text-xs font-mono uppercase tracking-widest text-[#5A2528]">
                ROOM III • THE POST BOX
              </div>
              <h3 className="font-serif text-2xl text-[#241D18]">
                The romantic ritual of letting go.
              </h3>
              <p className="text-sm text-[#5E5046] leading-relaxed">
                Choose traditional 2-day delivery or select any custom future date for free: next
                season, an anniversary, or a year from now. Once dropped in the slot, the letter is
                wax-sealed and time-locked until the hour strikes.
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-6 sm:p-8 rounded-2xl border border-[#D8C4A9] space-y-4">
              <div className="text-xs font-mono uppercase tracking-widest text-[#5A2528]">
                ROOM IV • THE UNSEALING MOMENT
              </div>
              <h3 className="font-serif text-2xl text-[#241D18]">
                A cinematic arrival for the recipient.
              </h3>
              <p className="text-sm text-[#5E5046] leading-relaxed">
                Your recipient receives a private delivery link. After passing confidential postal
                verification (postal OTP or secret passphrase), they break the physical wax seal, slide
                out the paper, and read your letter in uninterrupted beauty.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PHILOSOPHICAL MANIFESTO / STATS */}
      <section className="bg-[#241D18] text-[#FAF8F5] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block text-[10px] font-mono tracking-[0.3em] uppercase text-[#A88955]">
            THE OLD-LETTERS MANIFESTO
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-light leading-snug">
            "Some things are worth waiting for."
          </h2>
          <p className="font-serif italic text-lg sm:text-xl text-stone-300 max-w-2xl mx-auto font-light">
            When you hold back instant delivery, you create anticipation. And anticipation is the
            noblest part of receiving.
          </p>

          <div className="pt-8 flex justify-center">
            <button
              onClick={onStartWriting}
              className="px-8 py-3.5 bg-[#5A2528] text-white text-xs font-mono tracking-[0.2em] uppercase rounded-full hover:bg-[#733034] transition-colors font-semibold"
            >
              WRITE A LETTER →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
