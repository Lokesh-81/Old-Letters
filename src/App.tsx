/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Letter, LetterType } from './types/letter';
import { INITIAL_ARCHIVE_LETTERS } from './data/mockData';
import { Navigation } from './components/Navigation';
import { LandingHero } from './components/landing/LandingHero';
import { LandingScenes } from './components/landing/LandingScenes';
import { ComposerFlow } from './components/composer/ComposerFlow';
import { SenderArchive } from './components/archive/SenderArchive';
import { RecipientExperience } from './components/recipient/RecipientExperience';
import { HowItWorksView } from './components/HowItWorksView';

export default function App() {
  const [currentView, setCurrentView] = useState<
    'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient'
  >('landing');

  // Stored correspondence letters
  const [letters, setLetters] = useState<Letter[]>(() => {
    try {
      const saved = localStorage.getItem('old_letters_archive');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback to initial
    }
    return INITIAL_ARCHIVE_LETTERS;
  });

  // Current active letter for recipient experience
  const [activeRecipientLetter, setActiveRecipientLetter] = useState<Letter>(
    INITIAL_ARCHIVE_LETTERS[0]
  );

  // Initial letter type passed to composer
  const [composerInitialType, setComposerInitialType] = useState<LetterType>('LOVE');

  // Helper to save posted letter to archive
  const handleLetterPosted = (newLetter: Letter) => {
    setLetters((prev) => {
      const updated = [newLetter, ...prev];
      try {
        localStorage.setItem('old_letters_archive', JSON.stringify(updated));
      } catch {
        // Safe fallback
      }
      return updated;
    });
    setActiveRecipientLetter(newLetter);
  };

  // Launch recipient mode for a specific letter
  const handleOpenRecipientView = (letterToOpen?: Letter) => {
    if (letterToOpen) {
      setActiveRecipientLetter(letterToOpen);
    } else if (letters.length > 0) {
      setActiveRecipientLetter(letters[0]);
    }
    setCurrentView('recipient');
  };

  // User selects a type from the landing showcase
  const handleSelectTypeFromLanding = (type: LetterType) => {
    setComposerInitialType(type);
    setCurrentView('composer');
  };

  // Recipient wants to pen a reply
  const handleReplyToLetter = (receivedLetter: Letter) => {
    const todayFormatted = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const replyDraft: Letter = {
      id: `ol-${Date.now()}`,
      trackingCode: `OL-${Math.floor(1000 + Math.random() * 9000)}-R`,
      type: 'LOVE',
      templateId: receivedLetter.templateId || 'ivory',
      senderName: receivedLetter.recipientName,
      senderEmail: receivedLetter.recipientEmail,
      recipientName: receivedLetter.senderName,
      recipientEmail: receivedLetter.senderEmail,
      letterDate: todayFormatted,
      greeting: `Dear ${receivedLetter.senderName},`,
      content: `I received your letter dated ${receivedLetter.letterDate} with a full heart. Every word was worth the wait...\n\n`,
      signoff: 'Forever in correspondence,',
      attachments: [],
      verificationMethod: 'open',
      postedAt: new Date().toISOString(),
      scheduledDeliveryAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      waitingHours: 48,
      status: 'IN TRANSIT',
    };

    handleLetterPosted(replyDraft);
    setCurrentView('composer');
  };

  const isRecipientMode = currentView === 'recipient';

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#141618] flex flex-col font-sans selection:bg-[#5c1d24]/15 selection:text-[#5c1d24]">
      {/* Top Navigation Bar (Hidden during intimate recipient experience and on landing where Hero36 displays its animated entrance) */}
      {currentView !== 'landing' && (
        <Navigation
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'recipient') {
              handleOpenRecipientView();
            } else {
              setCurrentView(view);
            }
          }}
          isRecipientMode={isRecipientMode}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'landing' && (
          <div className="space-y-0">
            <LandingHero
              onStartWriting={() => {
                setComposerInitialType('LOVE');
                setCurrentView('composer');
              }}
              onExploreHowItWorks={() => {
                const el = document.getElementById('how-it-works-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setCurrentView('how-it-works');
                }
              }}
              onNavigate={(view) => {
                if (view === 'recipient') {
                  handleOpenRecipientView();
                } else {
                  setCurrentView(view);
                }
              }}
            />
            <LandingScenes
              onSelectLetterType={handleSelectTypeFromLanding}
              onStartWriting={() => {
                setComposerInitialType('LOVE');
                setCurrentView('composer');
              }}
            />
          </div>
        )}

        {currentView === 'composer' && (
          <ComposerFlow
            initialType={composerInitialType}
            onLetterPosted={handleLetterPosted}
            onPreviewRecipient={(postedLtr) => {
              setActiveRecipientLetter(postedLtr);
              setCurrentView('recipient');
            }}
            onViewArchive={() => setCurrentView('archive')}
            onCancel={() => setCurrentView('landing')}
          />
        )}

        {currentView === 'archive' && (
          <SenderArchive
            letters={letters}
            onOpenLetter={(ltr) => {
              setActiveRecipientLetter(ltr);
              setCurrentView('recipient');
            }}
            onWriteNew={() => {
              setComposerInitialType('LOVE');
              setCurrentView('composer');
            }}
          />
        )}

        {currentView === 'how-it-works' && (
          <HowItWorksView
            onStartWriting={() => setCurrentView('composer')}
            onBack={() => setCurrentView('landing')}
          />
        )}

        {currentView === 'recipient' && (
          <RecipientExperience
            letter={activeRecipientLetter}
            onExit={() => setCurrentView('landing')}
            onReply={handleReplyToLetter}
          />
        )}
      </main>
    </div>
  );
}
