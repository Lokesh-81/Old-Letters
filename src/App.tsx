/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Letter, LetterType, RecipientMetadata } from './types/letter';
import { INITIAL_ARCHIVE_LETTERS } from './data/mockData';
import { Navigation, AppView } from './components/Navigation';
import { LandingHero } from './components/landing/LandingHero';
import { LandingScenes } from './components/landing/LandingScenes';
import { ComposerFlow } from './components/composer/ComposerFlow';
import { SenderArchive } from './components/archive/SenderArchive';
import { RecipientExperience } from './components/recipient/RecipientExperience';
import { HowItWorksView } from './components/HowItWorksView';
import { LoadingScreen } from './components/common/LoadingScreen';
import { CookiePolicyView } from './components/legal/CookiePolicyView';
import { PrivacyPolicyView } from './components/legal/PrivacyPolicyView';
import { TermsOfServiceView } from './components/legal/TermsOfServiceView';
import { CookieConsentBanner } from './components/legal/CookieConsentBanner';
import { CookiePreferencesModal } from './components/legal/CookiePreferencesModal';
import { fetchLetters, getDeliveryMeta, getCurrentUser, logoutUser } from './lib/api';
import { AdminPaymentModal } from './components/admin/AdminPaymentModal';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/auth/ProfileModal';
import { BureauDashboard, BureauTab } from './components/bureau/BureauDashboard';

export default function App() {
  const [showLoading, setShowLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [bureauTab, setBureauTab] = useState<BureauTab>('overview');
  const [showCookiePreferencesModal, setShowCookiePreferencesModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [intendedDestination, setIntendedDestination] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Initialize currentUser synchronously from URL payload (post-OAuth redirect) or local cache so authenticated state is preserved across redirects/refreshes
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    fullName: string;
    role?: string;
    avatarUrl?: string;
    authProvider?: string;
    emailVerified?: boolean;
  } | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('auth') === 'google_success') {
          const userParam = searchParams.get('u');
          if (userParam) {
            const parsed = JSON.parse(decodeURIComponent(userParam));
            if (parsed && (parsed.id || parsed.email)) {
              try {
                localStorage.setItem('old_letters_user', JSON.stringify(parsed));
              } catch {}
              return parsed;
            }
          }
        }
      }
      const saved = localStorage.getItem('old_letters_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setAndPersistUser = (user: any | null) => {
    setCurrentUser(user);
    try {
      if (user) {
        localStorage.setItem('old_letters_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('old_letters_user');
      }
    } catch {
      // Safe fallback
    }
  };

  const [recipientDeliveryToken, setRecipientDeliveryToken] = useState<string | undefined>(undefined);
  const [currentView, setCurrentView] = useState<AppView>('landing');

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

  // Current active letter and metadata for recipient experience (STRICTLY null by default to prevent leakage)
  const [activeRecipientLetter, setActiveRecipientLetter] = useState<Letter | null>(null);
  const [recipientMetadata, setRecipientMetadata] = useState<RecipientMetadata | null>(null);

  // Initial letter type passed to composer
  const [composerInitialType, setComposerInitialType] = useState<LetterType>('LOVE');

  // Unified navigation handler with browser history updates
  const handleNavigate = (view: AppView) => {
    if (view === 'landing') {
      window.history.pushState(null, '', '/');
    } else if (view === 'cookies' || view === 'privacy' || view === 'terms') {
      window.history.pushState(null, '', `/${view}`);
    } else if (view === 'profile') {
      window.history.pushState(null, '', '/profile');
    } else if (view === 'admin') {
      window.history.pushState(null, '', '/admin');
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // On mount & popstate: check for routes, tokens, and sessions
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const authParam = searchParams.get('auth');

      // Legal & Profile Pages
      if (path === '/cookies') {
        setCurrentView('cookies');
      } else if (path === '/privacy') {
        setCurrentView('privacy');
      } else if (path === '/terms') {
        setCurrentView('terms');
      } else if (path === '/profile' || path === '/account' || path === '/bureau') {
        setCurrentView('profile');
      } else if (path === '/admin' || path === '/admin/dashboard') {
        setCurrentView('admin');
      }

      // Google OAuth redirection feedback
      if (authParam === 'google_not_configured') {
        setAuthNotice('Google sign-in is not configured yet. Please use email and password.');
        setAuthInitialMode('login');
        setShowAuthModal(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authParam === 'consent_required') {
        setAuthNotice('You must agree to the Terms of Service and Privacy Policy before continuing with Google.');
        setAuthInitialMode('login');
        setShowAuthModal(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authParam === 'google_success') {
        // Hydrate authenticated state synchronously from safe redirect payload if available
        const tokenParam = searchParams.get('token');
        if (tokenParam) {
          try {
            localStorage.setItem('old_letters_token', tokenParam);
            sessionStorage.setItem('old_letters_token', tokenParam);
          } catch {}
        }
        const userParam = searchParams.get('u');
        let hydratedUser: any = null;
        if (userParam) {
          try {
            const parsedUser = JSON.parse(decodeURIComponent(userParam));
            if (parsedUser && (parsedUser.id || parsedUser.email)) {
              hydratedUser = parsedUser;
              setAndPersistUser(parsedUser);
            }
          } catch {
            // Safe fallback
          }
        }

        setAuthNotice('Signed in with Google successfully.');
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => setAuthNotice(null), 5000);

        // Fetch authoritative session from /api/auth/me using credentials: 'include'
        getCurrentUser().then((user) => {
          if (user) {
            setAndPersistUser(user);
            fetchLetters().then((l) => {
              if (l && l.length > 0) setLetters(l);
            });
          } else if (hydratedUser) {
            setAndPersistUser(hydratedUser);
          }
          setAuthChecking(false);
        }).catch(() => {
          setAuthChecking(false);
        });
      } else if (authParam === 'error') {
        setAuthNotice('Authentication could not be completed. Please try again.');
        setAuthInitialMode('login');
        setShowAuthModal(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => setAuthNotice(null), 5000);
      }

      const match = path.match(/\/letter\/([a-zA-Z0-9_-]+)/);
      const tokenFromUrl = match ? match[1] : searchParams.get('letter');

      if (tokenFromUrl) {
        setRecipientDeliveryToken(tokenFromUrl);
        getDeliveryMeta(tokenFromUrl)
          .then((res) => {
            setRecipientMetadata(res.metadata);
            if (res.letter) {
              setActiveRecipientLetter(res.letter);
            } else {
              setActiveRecipientLetter(null);
            }
            setCurrentView('recipient');
          })
          .catch(() => {
            setRecipientMetadata(null);
            setActiveRecipientLetter(null);
            setCurrentView('recipient');
          });
      }

      if (searchParams.get('admin') === 'true') {
        setShowAdminModal(true);
      }

      if (path === '/login' || authParam === 'login') {
        setAuthInitialMode('login');
        setShowAuthModal(true);
      } else if (path === '/signup' || authParam === 'signup') {
        setAuthInitialMode('signup');
        setShowAuthModal(true);
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);

    // Load user session from backend
    getCurrentUser()
      .then((user) => {
        if (user) {
          setAndPersistUser(user);
          // Fetch authenticated letters
          fetchLetters().then((data) => {
            if (data && data.length > 0) {
              setLetters(data);
            }
          }).catch(() => {});
        } else {
          // Only clear if neither cookie nor local cache nor oauth redirect indicates active session
          const hasLoggedInCookie = typeof document !== 'undefined' && document.cookie.includes('oldletters_logged_in=1');
          const isGoogleSuccessUrl = typeof window !== 'undefined' && window.location.search.includes('google_success');
          if (!hasLoggedInCookie && !isGoogleSuccessUrl) {
            setAndPersistUser(null);
          }
        }
        setAuthChecking(false);
      })
      .catch(() => {
        setAuthChecking(false);
      });

    return () => window.removeEventListener('popstate', handleLocationChange);
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
  };

  // Launch recipient mode for a specific letter
  const handleOpenRecipientView = (letterToOpen?: Letter) => {
    const target = letterToOpen || (letters.length > 0 ? letters[0] : null);
    if (target) {
      setActiveRecipientLetter(target);
      setRecipientMetadata({
        trackingCode: target.trackingCode,
        senderName: target.senderName,
        recipientName: target.recipientName,
        recipientEmailMasked: target.recipientEmail ? target.recipientEmail.replace(/(?<=.).(?=.*@)/g, '*') : '***@***.com',
        verificationMethod: target.verificationMethod,
        status: target.status,
        isDelivered: target.status !== 'SCHEDULED',
        isArrived: true,
        canUnseal: true,
        deliveryDate: target.scheduledDeliveryAt || new Date().toISOString(),
        scheduledDeliveryAt: target.scheduledDeliveryAt || new Date().toISOString(),
        waitingHours: target.waitingHours || 48,
        remainingMs: 0,
        remainingSeconds: 0,
        remainingHours: 0,
        templateId: target.templateId,
        postmarkCity: target.postmarkCity || 'Hyderabad Bureau',
      });
    } else {
      setActiveRecipientLetter(null);
      setRecipientMetadata(null);
    }
    setCurrentView('recipient');
  };

  // Intercept writing action: prompt auth if unauthenticated without losing destination
  const handleStartWriting = (type: LetterType = 'LOVE') => {
    setComposerInitialType(type);

    let activeUser = currentUser;
    if (!activeUser) {
      try {
        const saved = localStorage.getItem('old_letters_user');
        if (saved) activeUser = JSON.parse(saved);
      } catch {
        // Fallback
      }
    }

    if (activeUser) {
      if (!currentUser) setAndPersistUser(activeUser);
      setCurrentView('composer');
      return;
    }

    // Await authoritative session check before proceeding or popping auth modal
    getCurrentUser().then((user) => {
      if (user) {
        setAndPersistUser(user);
        setCurrentView('composer');
      } else {
        setIntendedDestination('composer');
        setAuthInitialMode('signup');
        setShowAuthModal(true);
      }
    }).catch(() => {
      setIntendedDestination('composer');
      setAuthInitialMode('signup');
      setShowAuthModal(true);
    });
  };

  // Intercept archive action
  const handleOpenArchive = () => {
    let activeUser = currentUser;
    if (!activeUser) {
      try {
        const saved = localStorage.getItem('old_letters_user');
        if (saved) activeUser = JSON.parse(saved);
      } catch {
        // Fallback
      }
    }

    const hasLoggedInCookie = typeof document !== 'undefined' && document.cookie.includes('oldletters_logged_in=1');

    if (activeUser || hasLoggedInCookie) {
      setCurrentView('archive');
      return;
    }

    if (authChecking) {
      getCurrentUser().then((user) => {
        if (user) {
          setAndPersistUser(user);
          setCurrentView('archive');
        } else {
          setIntendedDestination('archive');
          setAuthInitialMode('login');
          setShowAuthModal(true);
        }
      });
      return;
    }

    setIntendedDestination('archive');
    setAuthInitialMode('login');
    setShowAuthModal(true);
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
      senderName: receivedLetter.recipientName || 'Your Name',
      senderEmail: receivedLetter.recipientEmail,
      recipientName: receivedLetter.senderName || 'Recipient Name',
      recipientEmail: receivedLetter.senderEmail,
      letterDate: todayFormatted,
      greeting: receivedLetter.senderName ? `Dear ${receivedLetter.senderName},` : 'Dear Recipient,',
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
    setAndPersistUser(user);
    setShowAuthModal(false);
    fetchLetters().then(setLetters).catch(() => {});

    if (intendedDestination === 'composer' || intendedDestination === 'seal-and-send') {
      setCurrentView('composer');
      setIntendedDestination(null);
    } else if (intendedDestination === 'archive') {
      setCurrentView('archive');
      setIntendedDestination(null);
    } else if (intendedDestination === 'profile') {
      setCurrentView('profile');
      window.history.pushState(null, '', '/profile');
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

      {/* Auth / Configuration Notification Banner */}
      {authNotice && (
        <div className="bg-amber-100/90 border-b border-amber-300/80 px-6 py-3 text-xs font-sans text-amber-950 flex items-center justify-between z-50">
          <span>{authNotice}</span>
          <button
            type="button"
            onClick={() => setAuthNotice(null)}
            className="text-amber-800 hover:text-amber-950 font-mono text-xs uppercase cursor-pointer ml-4"
          >
            [Dismiss]
          </button>
        </div>
      )}

      {/* Top Navigation Bar (Always rendered across all views, replacing public write button with account menu when authenticated) */}
      <Navigation
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthInitialMode('login');
          setShowAuthModal(true);
        }}
        onOpenProfile={() => {
          setBureauTab('overview');
          handleNavigate('profile');
        }}
        onNavigateBureauTab={(tab) => setBureauTab(tab)}
        onOpenAdmin={() => handleNavigate('admin')}
        onLogout={() => {
          logoutUser();
          setAndPersistUser(null);
          setLetters(INITIAL_ARCHIVE_LETTERS);
          handleNavigate('landing');
        }}
        onWriteClick={() => handleStartWriting()}
        isRecipientMode={isRecipientMode}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'profile' && (
          <BureauDashboard
            initialTab={bureauTab}
            currentUser={currentUser}
            onOpenAuth={() => {
              setAuthInitialMode('login');
              setShowAuthModal(true);
            }}
            onNavigateHome={() => handleNavigate('landing')}
            onNavigateWrite={() => handleStartWriting('LOVE')}
            onNavigateTerms={() => handleNavigate('terms')}
            onNavigatePrivacy={() => handleNavigate('privacy')}
            onOpenRecipientMode={(letter, token) => {
              if (token) setRecipientDeliveryToken(token);
              handleOpenRecipientView(letter);
            }}
            onLogout={() => {
              logoutUser();
              setAndPersistUser(null);
              setLetters(INITIAL_ARCHIVE_LETTERS);
              handleNavigate('landing');
            }}
          />
        )}

        {currentView === 'landing' && (
          <div className="space-y-0">
            <LandingHero
              onStartWriting={() => handleStartWriting('LOVE')}
              onExploreHowItWorks={() => {
                const el = document.getElementById('how-it-works-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  handleNavigate('how-it-works');
                }
              }}
              onNavigate={(view) => {
                if (view === 'recipient') {
                  handleOpenRecipientView();
                } else if (view === 'archive') {
                  handleOpenArchive();
                } else {
                  handleNavigate(view);
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
                  handleNavigate('how-it-works');
                }
              }}
              onNavigateLegal={handleNavigate}
              onOpenCookiePreferences={() => setShowCookiePreferencesModal(true)}
            />
          </div>
        )}

        {currentView === 'cookies' && (
          <CookiePolicyView
            onBack={() => handleNavigate('landing')}
            onOpenPreferences={() => setShowCookiePreferencesModal(true)}
          />
        )}

        {currentView === 'privacy' && (
          <PrivacyPolicyView onBack={() => handleNavigate('landing')} />
        )}

        {currentView === 'terms' && (
          <TermsOfServiceView onBack={() => handleNavigate('landing')} />
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
            metadata={recipientMetadata}
            deliveryToken={recipientDeliveryToken}
            onExit={() => {
              window.history.pushState(null, '', '/');
              setCurrentView('landing');
            }}
            onReply={handleReplyToLetter}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboardView
            currentUser={currentUser}
            onNavigateHome={() => handleNavigate('landing')}
            onOpenAuth={() => {
              setAuthInitialMode('login');
              setShowAuthModal(true);
            }}
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
        initialError={authNotice}
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
          setAndPersistUser(null);
          setLetters(INITIAL_ARCHIVE_LETTERS);
          setCurrentView('landing');
        }}
      />

      {/* First-Visit Cookie Consent Banner */}
      <CookieConsentBanner
        onOpenPreferences={() => setShowCookiePreferencesModal(true)}
        onViewPolicy={() => handleNavigate('cookies')}
      />

      {/* Cookie Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showCookiePreferencesModal}
        onClose={() => setShowCookiePreferencesModal(false)}
        onViewPolicy={() => handleNavigate('cookies')}
      />
    </div>
  );
}
