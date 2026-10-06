import React, { useState, useRef, useEffect } from 'react';
import { isAdminEmail, isUserAdminRole } from '../lib/admin';
import { OldLettersHorizontalLogo } from '../assets/OldLettersHorizontalLogo';

export type AppView = 'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient' | 'cookies' | 'privacy' | 'terms' | 'profile' | 'admin';

interface NavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAdmin?: () => void;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onNavigateBureauTab?: (tab: 'overview' | 'sent' | 'received' | 'payments' | 'settings' | 'legal') => void;
  currentUser?: { id: string; email: string; fullName: string; role?: string } | null;
  onLogout?: () => void;
  onWriteClick?: () => void;
  isRecipientMode?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  onOpenAdmin,
  onOpenAuth,
  onOpenProfile,
  onNavigateBureauTab,
  currentUser,
  onLogout,
  onWriteClick,
  isRecipientMode = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isRecipientMode) {
    return null;
  }

  const firstName = currentUser?.fullName?.split(' ')[0] || currentUser?.email.split('@')[0] || 'Correspondent';
  const isUserAdmin = Boolean(currentUser && (isAdminEmail(currentUser.email) || isUserAdminRole(currentUser.role)));

  const handleSelectMenu = (action: () => void) => {
    setDropdownOpen(false);
    action();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#faf9f7]/95 backdrop-blur-md border-b border-[#eae4da] transition-colors">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
        {/* Official Brand Logo */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="transition-opacity hover:opacity-90 cursor-pointer select-none text-left py-0.5"
          aria-label="OLD-LETTERS Home"
        >
          <OldLettersHorizontalLogo height={38} />
        </button>

        {/* Clean nav links */}
        <nav
          className="hidden md:flex items-center gap-8"
          style={{ fontFamily: 'sans-serif' }}
        >
          {[
            { label: 'Write', view: 'composer' as const },
            { label: 'Archive', view: 'archive' as const },
            { label: 'How It Works', view: 'how-it-works' as const },
            { label: 'Delivery', view: 'recipient' as const },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.view === 'composer' && onWriteClick) {
                  onWriteClick();
                } else {
                  onNavigate(item.view);
                }
              }}
              className={`flex min-h-10 items-center text-sm font-normal transition-colors duration-200 cursor-pointer ${
                currentView === item.view
                  ? 'text-teal-900 border-b-2 border-teal-900 font-medium'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Primary CTA & User Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-xs font-sans text-stone-800 bg-[#f4efe8] hover:bg-[#ede5da] px-3 sm:px-3.5 py-2 rounded-full border border-[#eae4da] transition-all cursor-pointer shadow-xs select-none max-w-[160px] sm:max-w-[220px]"
                aria-label={`Account menu for ${currentUser.fullName || currentUser.email}`}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                <span className="font-serif tracking-wide text-stone-900 font-medium truncate">
                  Hi, {firstName}
                </span>
                <span className="text-[10px] text-stone-400 shrink-0">▾</span>
              </button>

              {/* Editorial Account Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-md bg-[#faf9f7] shadow-xl border border-[#eae4da] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans text-xs">
                  <div className="px-3.5 py-2.5 border-b border-stone-200/60 mb-1 bg-stone-50/50">
                    <p className="font-serif text-sm font-medium text-stone-900 truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] text-stone-500 font-mono truncate">{currentUser.email}</p>
                  </div>

                  {/* 1. My Bureau */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectMenu(() => {
                        onNavigateBureauTab?.('overview');
                        onNavigate('profile');
                      })
                    }
                    className="w-full text-left px-3.5 py-2 text-stone-800 hover:bg-stone-100/80 transition-colors flex items-center justify-between cursor-pointer font-medium"
                  >
                    <span>My Bureau</span>
                    <span className="text-[10px] font-mono text-stone-400">Overview</span>
                  </button>

                  {/* 2. My Letters */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectMenu(() => {
                        onNavigateBureauTab?.('sent');
                        onNavigate('profile');
                      })
                    }
                    className="w-full text-left px-3.5 py-2 text-stone-700 hover:bg-stone-100/80 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>My Letters</span>
                    <span className="text-[10px] font-mono text-stone-400">Sent & Rcvd</span>
                  </button>

                  {/* 3. Payment History */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectMenu(() => {
                        onNavigateBureauTab?.('payments');
                        onNavigate('profile');
                      })
                    }
                    className="w-full text-left px-3.5 py-2 text-stone-700 hover:bg-stone-100/80 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Payment History</span>
                    <span className="text-[10px] font-mono text-stone-400">UPI</span>
                  </button>

                  {/* 4. Settings */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectMenu(() => {
                        onNavigateBureauTab?.('settings');
                        onNavigate('profile');
                      })
                    }
                    className="w-full text-left px-3.5 py-2 text-stone-700 hover:bg-stone-100/80 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Settings</span>
                  </button>

                  {/* 5. Privacy & Security */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectMenu(() => {
                        onNavigateBureauTab?.('legal');
                        onNavigate('profile');
                      })
                    }
                    className="w-full text-left px-3.5 py-2 text-stone-700 hover:bg-stone-100/80 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Privacy & Security</span>
                  </button>

                  {/* 6. Terms & Privacy */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectMenu(() => {
                        onNavigate('terms');
                      })
                    }
                    className="w-full text-left px-3.5 py-2 text-stone-600 hover:bg-stone-100/80 transition-colors flex items-center justify-between cursor-pointer text-[11px]"
                  >
                    <span>Terms & Privacy</span>
                  </button>

                  {/* ADMIN BUREAU Desk for authenticated administrators only */}
                  {isUserAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectMenu(() => {
                          if (onOpenAdmin) onOpenAdmin();
                          onNavigate('admin');
                        })
                      }
                      className="w-full text-left px-3.5 py-2 text-teal-950 hover:bg-teal-50 transition-colors cursor-pointer font-medium flex items-center justify-between border-t border-teal-100/60"
                    >
                      <span className="font-semibold text-teal-900">ADMIN BUREAU</span>
                      <span className="text-[10px] font-mono text-teal-800 bg-teal-100/80 px-1.5 py-0.5 rounded-xs">
                        Admin Desk
                      </span>
                    </button>
                  )}

                  <div className="border-t border-stone-200/60 my-1"></div>

                  {/* 7. Sign Out */}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectMenu(() => {
                          onLogout();
                        })
                      }
                      className="w-full text-left px-3.5 py-2 text-red-700 hover:bg-red-50/80 transition-colors cursor-pointer font-medium"
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Public navigation when logged out */
            <>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="flex min-h-10 items-center text-xs font-medium text-stone-700 hover:text-teal-900 px-2.5 sm:px-3 py-1.5 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onWriteClick) {
                    onWriteClick();
                  } else {
                    onNavigate('composer');
                  }
                }}
                className="flex min-h-10 items-center rounded-sm bg-teal-900 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-teal-800 hover:shadow-[0_2px_4px_rgba(20,83,45,0.25),0_6px_18px_rgba(20,83,45,0.22)] active:scale-[0.96] cursor-pointer"
                style={{ fontFamily: 'sans-serif' }}
              >
                Write a Letter
              </button>
            </>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex min-h-10 min-w-10 items-center justify-center p-2 text-stone-700 hover:text-teal-900 rounded-md border border-[#eae4da] bg-[#faf9f7] transition-colors cursor-pointer select-none"
            aria-label="Toggle mobile navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <span className="text-base font-mono">✕</span>
            ) : (
              <span className="text-base font-mono">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#eae4da] bg-[#faf9f7] px-6 py-4 space-y-3 font-sans animate-in slide-in-from-top-2 duration-150 shadow-lg">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">Navigation</span>
            {[
              { label: 'Write a Letter', view: 'composer' as const, isWrite: true },
              { label: 'Public Archive', view: 'archive' as const },
              { label: 'How It Works', view: 'how-it-works' as const },
              { label: 'Delivery Tracking', view: 'recipient' as const },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (item.isWrite && onWriteClick) {
                    onWriteClick();
                  } else {
                    onNavigate(item.view);
                  }
                }}
                className={`flex min-h-10 items-center justify-between text-left text-sm py-2 px-3 rounded-md transition-colors ${
                  currentView === item.view
                    ? 'bg-teal-900/10 text-teal-950 font-medium'
                    : 'text-stone-700 hover:bg-stone-200/50'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs text-stone-400">→</span>
              </button>
            ))}
          </div>

          {currentUser ? (
            <div className="pt-2 border-t border-stone-200/60 flex flex-col space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1">
                Correspondent Account ({currentUser.fullName || currentUser.email})
              </span>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateBureauTab?.('overview');
                  onNavigate('profile');
                }}
                className="flex min-h-10 items-center justify-between text-left text-sm py-2 px-3 rounded-md text-stone-900 font-medium hover:bg-stone-200/50 cursor-pointer"
              >
                <span>My Bureau</span>
                <span className="text-[10px] font-mono text-stone-400">Overview</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateBureauTab?.('sent');
                  onNavigate('profile');
                }}
                className="flex min-h-10 items-center justify-between text-left text-sm py-2 px-3 rounded-md text-stone-800 hover:bg-stone-200/50 cursor-pointer"
              >
                <span>My Letters</span>
                <span className="text-[10px] font-mono text-stone-400">Sent & Rcvd</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateBureauTab?.('payments');
                  onNavigate('profile');
                }}
                className="flex min-h-10 items-center justify-between text-left text-sm py-2 px-3 rounded-md text-stone-800 hover:bg-stone-200/50 cursor-pointer"
              >
                <span>Payment History</span>
                <span className="text-[10px] font-mono text-stone-400">UPI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateBureauTab?.('settings');
                  onNavigate('profile');
                }}
                className="flex min-h-10 items-center text-left text-sm py-2 px-3 rounded-md text-stone-800 hover:bg-stone-200/50 cursor-pointer"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateBureauTab?.('legal');
                  onNavigate('profile');
                }}
                className="flex min-h-10 items-center text-left text-sm py-2 px-3 rounded-md text-stone-800 hover:bg-stone-200/50 cursor-pointer"
              >
                Privacy & Security
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('terms');
                }}
                className="flex min-h-10 items-center text-left text-xs py-2 px-3 rounded-md text-stone-600 hover:bg-stone-200/50 cursor-pointer"
              >
                Terms & Privacy
              </button>
              {isUserAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAdmin) onOpenAdmin();
                    onNavigate('admin');
                  }}
                  className="flex min-h-10 items-center justify-between text-left text-sm py-2 px-3 rounded-md text-teal-950 bg-teal-50 border border-teal-200/70 font-semibold hover:bg-teal-100/60 cursor-pointer"
                >
                  <span>ADMIN BUREAU</span>
                  <span className="text-[10px] font-mono text-teal-800">Admin Dashboard →</span>
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="flex min-h-10 items-center text-left text-sm py-2 px-3 rounded-md text-red-700 hover:bg-red-50 font-medium cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-stone-200/60 flex items-center gap-3">
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="flex-1 py-2 text-center text-xs font-medium text-stone-800 bg-[#ede6dc] hover:bg-[#e4dbce] rounded-sm transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
