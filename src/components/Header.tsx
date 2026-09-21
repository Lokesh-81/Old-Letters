import { useState } from 'react';
import { ViewState } from '../types';
import { Mail, Eye, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onStartWriting: () => void;
  onOpenRecipientDemo: () => void;
}

export function Header({
  currentView,
  onNavigate,
  onStartWriting,
  onOpenRecipientDemo,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isWritingFlow = ['CATEGORIES', 'STATIONERY', 'WRITE', 'DELIVERY', 'RECEIPT'].includes(currentView);

  const handleNavClick = (view: ViewState) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="postal-header"
      className="sticky top-0 z-40 w-full bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E3D7C5]/80 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          id="brand-logo-btn"
          onClick={() => handleNavClick('LANDING')}
          className="group flex flex-col text-left focus:outline-none transition-transform hover:opacity-90"
        >
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl sm:text-3xl tracking-[0.18em] font-medium text-[#2C241F] uppercase">
              OLD-LETTERS
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] tracking-wider font-serif italic text-[#7E6E62]">
            Some things are worth waiting for.
          </span>
        </button>

        {/* Minimal Editorial Navigation with sliding pill */}
        <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-full bg-[#EFE8DC]/60 border border-[#D8C4A9]/60 text-xs font-mono uppercase tracking-wider">
          <button
            id="nav-home-btn"
            onClick={() => handleNavClick('LANDING')}
            className={`relative px-4 py-2 rounded-full transition-colors ${
              currentView === 'LANDING' ? 'text-[#FAF8F5]' : 'text-[#5C4F45] hover:text-[#2C241F]'
            }`}
          >
            {currentView === 'LANDING' && (
              <motion.div
                layoutId="nav-active-pill"
                className="absolute inset-0 bg-[#2C241F] rounded-full shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">Sanctuary</span>
          </button>

          <button
            id="nav-write-btn"
            onClick={onStartWriting}
            className={`relative px-4 py-2 rounded-full transition-colors ${
              isWritingFlow ? 'text-[#FAF8F5]' : 'text-[#5C4F45] hover:text-[#2C241F]'
            }`}
          >
            {isWritingFlow && (
              <motion.div
                layoutId="nav-active-pill"
                className="absolute inset-0 bg-[#5A2528] rounded-full shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">Write Letter</span>
          </button>

          <button
            id="nav-archive-btn"
            onClick={() => handleNavClick('ARCHIVE')}
            className={`relative px-4 py-2 rounded-full transition-colors ${
              currentView === 'ARCHIVE' ? 'text-[#FAF8F5]' : 'text-[#5C4F45] hover:text-[#2C241F]'
            }`}
          >
            {currentView === 'ARCHIVE' && (
              <motion.div
                layoutId="nav-active-pill"
                className="absolute inset-0 bg-[#2C241F] rounded-full shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">Archive</span>
          </button>

          <button
            id="nav-how-it-works-btn"
            onClick={() => handleNavClick('HOW_IT_WORKS')}
            className={`relative px-4 py-2 rounded-full transition-colors ${
              currentView === 'HOW_IT_WORKS' ? 'text-[#FAF8F5]' : 'text-[#5C4F45] hover:text-[#2C241F]'
            }`}
          >
            {currentView === 'HOW_IT_WORKS' && (
              <motion.div
                layoutId="nav-active-pill"
                className="absolute inset-0 bg-[#2C241F] rounded-full shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">Ritual</span>
          </button>
        </nav>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Recipient Experience Preview Simulator Button */}
          <button
            id="recipient-demo-btn"
            onClick={onOpenRecipientDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono tracking-wider text-[#5A2528] border border-[#5A2528]/35 rounded-full hover:bg-[#5A2528]/10 transition-colors"
            title="Preview recipient unsealing & reading experience"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>RECIPIENT DEMO</span>
          </button>

          {/* Primary CTA */}
          <button
            id="enter-post-office-btn"
            onClick={onStartWriting}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C241F] text-[#FAF8F5] text-xs font-mono tracking-widest uppercase rounded-full hover:bg-[#5A2528] transition-all duration-300 shadow-xs hover:shadow active:scale-98"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="font-semibold">WRITE A LETTER →</span>
          </button>

          {/* Mobile hamburger toggle */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#2C241F] hover:bg-[#EFE8DC] transition-colors"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden border-b border-[#E3D7C5] bg-[#FAF7F2] px-4 pt-2 pb-6 space-y-3"
          >
            <div className="text-center py-2 border-b border-[#EADBCE]">
              <span className="font-serif text-lg tracking-[0.16em] uppercase text-[#2C241F] font-medium block">
                OLD-LETTERS
              </span>
              <span className="text-[10px] font-serif italic text-[#7E6E62]">
                Some things are worth waiting for.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleNavClick('LANDING')}
                className={`p-3 rounded-lg text-xs font-mono tracking-wider uppercase text-center border transition-colors ${
                  currentView === 'LANDING'
                    ? 'bg-[#2C241F] text-[#FAF8F5] border-[#2C241F]'
                    : 'bg-[#F5EFE6] text-[#2C241F] border-[#D8C4A9]'
                }`}
              >
                Sanctuary
              </button>
              <button
                onClick={() => {
                  onStartWriting();
                  setMobileMenuOpen(false);
                }}
                className={`p-3 rounded-lg text-xs font-mono tracking-wider uppercase text-center border transition-colors ${
                  isWritingFlow
                    ? 'bg-[#5A2528] text-white border-[#5A2528]'
                    : 'bg-[#F5EFE6] text-[#2C241F] border-[#D8C4A9]'
                }`}
              >
                Write Letter
              </button>
              <button
                onClick={() => handleNavClick('ARCHIVE')}
                className={`p-3 rounded-lg text-xs font-mono tracking-wider uppercase text-center border transition-colors ${
                  currentView === 'ARCHIVE'
                    ? 'bg-[#2C241F] text-[#FAF8F5] border-[#2C241F]'
                    : 'bg-[#F5EFE6] text-[#2C241F] border-[#D8C4A9]'
                }`}
              >
                Archive
              </button>
              <button
                onClick={() => handleNavClick('HOW_IT_WORKS')}
                className={`p-3 rounded-lg text-xs font-mono tracking-wider uppercase text-center border transition-colors ${
                  currentView === 'HOW_IT_WORKS'
                    ? 'bg-[#2C241F] text-[#FAF8F5] border-[#2C241F]'
                    : 'bg-[#F5EFE6] text-[#2C241F] border-[#D8C4A9]'
                }`}
              >
                Ritual
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  onStartWriting();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 bg-[#5A2528] text-white rounded-full text-xs font-mono tracking-widest uppercase font-semibold text-center"
              >
                WRITE A LETTER →
              </button>
              <button
                onClick={() => {
                  onOpenRecipientDemo();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 border border-[#5A2528]/40 text-[#5A2528] rounded-full text-xs font-mono tracking-widest uppercase text-center"
              >
                RECIPIENT DEMO
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
