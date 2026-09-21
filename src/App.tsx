import { useState, useEffect } from 'react';
import { ViewState, LetterData } from './types';
import { INITIAL_LETTER, LETTER_CATEGORIES, STATIONERY_TEMPLATES } from './data/mockData';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { CategoryPicker } from './components/CategoryPicker';
import { StationeryPicker } from './components/StationeryPicker';
import { LetterEditor } from './components/LetterEditor';
import { DeliveryScheduler } from './components/DeliveryScheduler';
import { PostalReceipt } from './components/PostalReceipt';
import { RecipientExperience } from './components/RecipientExperience';
import { LiveMeetingRoom } from './components/LiveMeetingRoom';
import { PostalArchive } from './components/PostalArchive';
import { HowItWorks } from './components/HowItWorks';
import { CurtainTransition } from './components/CurtainTransition';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('LANDING');
  const [letterData, setLetterData] = useState<LetterData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('old_letters_active_letter');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // Fallback to initial
      }
    }
    return INITIAL_LETTER;
  });

  // Save changes to local state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('old_letters_active_letter', JSON.stringify(letterData));
      } catch {
        // Safe
      }
    }
  }, [letterData]);

  const updateLetterData = (changes: Partial<LetterData>) => {
    setLetterData((prev) => ({ ...prev, ...changes }));
  };

  const startNewLetter = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newLetter: LetterData = {
      ...INITIAL_LETTER,
      id: `letter-${Date.now()}`,
      trackingCode: randomCode,
      letterBody: '',
      status: 'DRAFT',
    };
    setLetterData(newLetter);
    setCurrentView('CATEGORIES');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategoryFromLanding = (catId: string) => {
    updateLetterData({ categoryId: catId });
    setCurrentView('STATIONERY');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageVariants = {
    initial: {
      opacity: 0,
      y: 24,
      scale: 1,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
    },
  };

  const pageTransition = {
    duration: 0.45,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <div className="min-h-screen bg-[#F6F1EA] text-[#2C241F] flex flex-col font-sans antialiased selection:bg-[#5A2528] selection:text-[#FAF8F5] overflow-x-hidden">
      {/* Hide standard header during full-screen immersive video meeting */}
      {currentView !== 'MEETING' && (
        <Header
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onStartWriting={() => {
            setCurrentView('CATEGORIES');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenRecipientDemo={() => {
            setCurrentView('RECIPIENT');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Main View Router with Sliding Page Transitions & Curtain Reveal */}
      <main className="flex-1 overflow-x-hidden relative">
        <CurtainTransition currentView={currentView} />

        <AnimatePresence mode="wait">
          {currentView === 'LANDING' && (
            <motion.div
              key="landing"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <LandingPage
                onStartWriting={() => {
                  setCurrentView('CATEGORIES');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onSelectCategory={handleSelectCategoryFromLanding}
                onOpenArchive={() => {
                  setCurrentView('ARCHIVE');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenHowItWorks={() => {
                  setCurrentView('HOW_IT_WORKS');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentView === 'CATEGORIES' && (
            <motion.div
              key="categories"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <CategoryPicker
                selectedCategoryId={letterData.categoryId}
                onSelectCategory={(catId) => updateLetterData({ categoryId: catId })}
                onContinue={() => {
                  setCurrentView('STATIONERY');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onBack={() => {
                  setCurrentView('LANDING');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentView === 'STATIONERY' && (
            <motion.div
              key="stationery"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <StationeryPicker
                selectedTemplateId={letterData.templateId}
                onSelectTemplate={(tempId) => updateLetterData({ templateId: tempId })}
                onContinue={() => {
                  setCurrentView('WRITE');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onBack={() => {
                  setCurrentView('CATEGORIES');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentView === 'WRITE' && (
            <motion.div
              key="write"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <LetterEditor
                letterData={letterData}
                onChangeLetter={updateLetterData}
                onContinue={() => {
                  setCurrentView('DELIVERY');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onBack={() => {
                  setCurrentView('STATIONERY');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentView === 'DELIVERY' && (
            <motion.div
              key="delivery"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <DeliveryScheduler
                letterData={letterData}
                onChangeLetter={updateLetterData}
                onPostLetter={() => {
                  updateLetterData({ status: 'POSTED' });
                  setCurrentView('RECEIPT');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onSaveDraft={() => {
                  updateLetterData({ status: 'DRAFT' });
                  setCurrentView('ARCHIVE');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onBack={() => {
                  setCurrentView('WRITE');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentView === 'RECEIPT' && (
            <motion.div
              key="receipt"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <PostalReceipt
                letterData={letterData}
                onOpenRecipientExperience={() => {
                  setCurrentView('RECIPIENT');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onReturnToArchive={() => {
                  setCurrentView('ARCHIVE');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onWriteAnother={startNewLetter}
              />
            </motion.div>
          )}

          {currentView === 'RECIPIENT' && (
            <motion.div
              key="recipient"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <RecipientExperience
                letterData={letterData}
                onEnterMeetingRoom={() => {
                  setCurrentView('MEETING');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onBackToPostOffice={() => {
                  setCurrentView('LANDING');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentView === 'MEETING' && (
            <motion.div
              key="meeting"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <LiveMeetingRoom
                letterData={letterData}
                onExit={() => {
                  setCurrentView('ARCHIVE');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentView === 'ARCHIVE' && (
            <motion.div
              key="archive"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <PostalArchive
                onSelectLetterToView={(trackingCode) => {
                  if (trackingCode === letterData.trackingCode) {
                    setCurrentView('RECEIPT');
                  } else {
                    setCurrentView('RECIPIENT');
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onWriteNewLetter={startNewLetter}
              />
            </motion.div>
          )}

          {currentView === 'HOW_IT_WORKS' && (
            <motion.div
              key="how-it-works"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <HowItWorks
                onStartWriting={() => {
                  setCurrentView('CATEGORIES');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Minimal Editorial Footer */}
      {currentView !== 'MEETING' && (
        <footer className="border-t border-[#E3D7C5] bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8 text-xs font-mono text-[#7E6E62]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-serif text-base uppercase tracking-widest text-[#2C241F] font-bold">
                OLD-LETTERS
              </span>
              <span>•</span>
              <span>SLOW CORRESPONDENCE</span>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => {
                  setCurrentView('HOW_IT_WORKS');
                }}
                className="hover:text-[#2C241F] underline transition-colors"
              >
                Philosophy
              </button>
              <button
                onClick={() => {
                  setCurrentView('ARCHIVE');
                }}
                className="hover:text-[#2C241F] underline transition-colors"
              >
                Archive
              </button>
              <button
                onClick={() => {
                  setCurrentView('RECIPIENT');
                }}
                className="hover:text-[#2C241F] underline text-[#5A2528] transition-colors"
              >
                Recipient Demo
              </button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-4 text-center sm:text-left text-[10px] text-stone-400">
            "Some things are worth waiting for." All custom delivery dates are free.
          </div>
        </footer>
      )}
    </div>
  );
}
