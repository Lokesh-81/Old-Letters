/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Letter, LetterType } from './types/letter';
import { INITIAL_ARCHIVE_LETTERS } from './data/mockData';
import { Navigation } from './components/Navigation';
import { LandingHero } from './components/landing/LandingHero';
import { LandingScenes } from './components/landing/LandingScenes';
import { ComposerFlow } from './components/composer/ComposerFlow';
import { SenderArchive } from './components/archive/SenderArchive';
import { RecipientExperience } from './components/recipient/RecipientExperience';
import { HowItWorksView } from './components/HowItWorksView';
import { LoadingScreen } from './components/common/LoadingScreen';
import { fetchLetters, getDeliveryMeta, getCurrentUser, logoutUser } from './lib/api';
import { AdminPaymentModal } from './components/admin/AdminPaymentModal';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/auth/ProfileModal';

export default function App() {
  const [showLoading, setShowLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [intendedDestination, setIntendedDestination] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    fullName: string;
    role?: string;
    avatarUrl?: string;
    authProvider?: string;
    emailVerified?: boolean;
  } | null>(null);

  const [recipientDeliveryToken, setRecipientDeliveryToken] = useState<string | undefined>(undefined);
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
      // Fallback
    }
    return INITIAL_ARCHIVE_LETTERS;
  });

  // Current active letter for recipient experience
  const [activeRecipientLetter, setActiveRecipientLetter] = useState<Letter>(
    INITIAL_ARCHIVE_LETTERS[0]
  );

  // Initial letter type passed to composer
  const [composerInitialType, setComposerInitialType] = useState<LetterType>('LOVE');

  // On mount: check for routes, tokens, and sessions
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/letter\/([a-zA-Z0-9_-]+)/);
    const searchParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = match ? match[1] : searchParams.get('letter');

    if (tokenFromUrl) {
      setRecipientDeliveryToken(tokenFromUrl);
      getDeliveryMeta(tokenFromUrl)
        .then((meta) => {
          setActiveRecipientLetter((prev) => ({
            ...prev,
            trackingCode: meta.trackingCode,
            senderName: meta.senderName,
            recipientName: meta.recipientName,
            verificationMethod: meta.verificationMethod,
            status: meta.status as any,
          }));
          setCurrentView('recipient');
        })
        .catch(() => {
          setCurrentView('recipient');
        });
    }

    if (searchParams.get('admin') === 'true') {
      setShowAdminModal(true);
    }

    if (path === '/login' || searchParams.get('auth') === 'login') {
      setAuthInitialMode('login');
      setShowAuthModal(true);
    } else if (path === '/signup' || searchParams.get('auth') === 'signup') {
      setAuthInitialMode('signup');
      setShowAuthModal(true);
    }

    // Load user session from backend
    getCurrentUser()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
          // Fetch authenticated letters
          fetchLetters().then((data) => {
            if (data && data.length > 0) {
              setLetters(data);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

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

  // Intercept writing action: prompt auth if unauthenticated without losing destination
  const handleStartWriting = (type: LetterType = 'LOVE') => {
    setComposerInitialType(type);
    if (!currentUser) {
      setIntendedDestination('composer');
      setAuthInitialMode('signup');
      setShowAuthModal(true);
      return;
    }
    setCurrentView('composer');
  };

  // Intercept archive action
  const handleOpenArchive = () => {
    if (!currentUser) {
      setIntendedDestination('archive');
      setAuthInitialMode('login');
      setShowAuthModal(true);
      return;
    }
    setCurrentView('archive');
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
    handleStartWriting('LOVE');
  };

  // Auth success handler: restores intended flow seamlessly
  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    fetchLetters().then(setLetters).catch(() => {});

    if (intendedDestination === 'composer' || intendedDestination === 'seal-and-send') {
      setCurrentView('composer');
      setIntendedDestination(null);
    } else if (intendedDestination === 'archive') {
      setCurrentView('archive');
      setIntendedDestination(null);
    }
  };

  const isRecipientMode = currentView === 'recipient';

  return (
    <div className="min-h-screen bg-[#faf9f7] text-teal-900 flex flex-col font-sans selection:bg-stone-300/50 selection:text-stone-900">
      {/* 3-Second Loading Screen with Signature Animation */}
      {showLoading && (
        <LoadingScreen durationMs={3000} onComplete={() => setShowLoading(false)} />
      )}

      {/* Top Navigation Bar */}
      {currentView !== 'landing' && (
        <Navigation
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'recipient') {
              handleOpenRecipientView();
            } else if (view === 'archive') {
              handleOpenArchive();
            } else if (view === 'composer') {
              handleStartWriting();
            } else {
              setCurrentView(view);
            }
          }}
          currentUser={currentUser}
          onOpenAuth={() => {
            setAuthInitialMode('login');
            setShowAuthModal(true);
          }}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenAdmin={() => setShowAdminModal(true)}
          onLogout={() => {
            logoutUser();
            setCurrentUser(null);
            setLetters(INITIAL_ARCHIVE_LETTERS);
            setCurrentView('landing');
          }}
          onWriteClick={() => handleStartWriting()}
          isRecipientMode={isRecipientMode}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'landing' && (
          <div className="space-y-0">
            <LandingHero
              onStartWriting={() => handleStartWriting('LOVE')}
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
                } else if (view === 'archive') {
                  handleOpenArchive();
                } else {
                  setCurrentView(view);
                }
              }}
            />
            <LandingScenes
              onSelectLetterType={(type) => handleStartWriting(type)}
              onStartWriting={() => handleStartWriting('LOVE')}
              onExploreHowItWorks={() => {
                const el = document.getElementById('how-it-works-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setCurrentView('how-it-works');
                }
              }}
            />
          </div>
        )}

        {currentView === 'composer' && (
          <ComposerFlow
            initialType={composerInitialType}
            initialStep={intendedDestination === 'seal-and-send' ? 'review' : 'compose'}
            currentUser={currentUser}
            onRequestAuth={(action) => {
              if (action === 'post') {
                setIntendedDestination('seal-and-send');
                setAuthInitialMode('signup');
                setShowAuthModal(true);
              } else {
                setIntendedDestination('composer');
                setAuthInitialMode('signup');
                setShowAuthModal(true);
              }
            }}
            onLetterPosted={handleLetterPosted}
            onPreviewRecipient={(postedLtr) => {
              setActiveRecipientLetter(postedLtr);
              setCurrentView('recipient');
            }}
            onViewArchive={handleOpenArchive}
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
            onWriteNew={() => handleStartWriting('LOVE')}
          />
        )}

        {currentView === 'how-it-works' && (
          <HowItWorksView
            onStartWriting={() => handleStartWriting('LOVE')}
            onBack={() => setCurrentView('landing')}
          />
        )}

        {currentView === 'recipient' && (
          <RecipientExperience
            letter={activeRecipientLetter}
            deliveryToken={recipientDeliveryToken}
            onExit={() => setCurrentView('landing')}
            onReply={handleReplyToLetter}
          />
        )}
      </main>

      {/* Post Office Bureau Admin Verification Desk */}
      <AdminPaymentModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onPaymentUpdated={() => {
          fetchLetters().then(setLetters).catch(() => {});
        }}
      />

      {/* User Authentication Modal (Login / Signup / Google) */}
      <AuthModal
        isOpen={showAuthModal}
        initialMode={authInitialMode}
        promptTitle={
          intendedDestination === 'seal-and-send'
            ? 'Before a letter can leave your desk,\nwe need to know who is sending it.'
            : intendedDestination === 'composer'
            ? 'Before a letter can leave your desk,\nwe need to know who is sending it.'
            : undefined
        }
        promptSubtitle={
          intendedDestination === 'seal-and-send'
            ? 'Create your correspondence account before sealing and sending your letter.'
            : intendedDestination === 'composer'
            ? 'Create your correspondence account before sending your first letter.'
            : undefined
        }
        onGuestPreview={
          intendedDestination === 'composer'
            ? () => {
                setShowAuthModal(false);
                setCurrentView('composer');
              }
            : undefined
        }
        onClose={() => {
          setShowAuthModal(false);
          setIntendedDestination(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        lettersCount={letters.length}
        onOpenArchive={handleOpenArchive}
        onLogout={() => {
          logoutUser();
          setCurrentUser(null);
          setLetters(INITIAL_ARCHIVE_LETTERS);
          setCurrentView('landing');
        }}
      />
    </div>
  );
}
