import React, { useState, useRef, useEffect } from 'react';

export type AppView = 'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient' | 'cookies' | 'privacy' | 'terms';

interface NavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAdmin?: () => void;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
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
  currentUser,
  onLogout,
  onWriteClick,
  isRecipientMode = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 w-full bg-[#faf9f7]/95 backdrop-blur-md border-b border-[#eae4da] transition-colors">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
        {/* Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="text-lg font-normal tracking-[0.14em] text-teal-900 hover:text-teal-800 transition-colors cursor-pointer select-none text-left"
          style={{ fontFamily: 'sans-serif', letterSpacing: '0.06em' }}
        >
          OLD-LETTERS
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
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-xs font-sans text-stone-800 bg-[#f4efe8] hover:bg-[#ede5da] px-3.5 py-2 rounded-full border border-[#eae4da] transition-all cursor-pointer shadow-xs select-none"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                <span className="font-serif tracking-wide text-stone-900 font-medium">Hi, {firstName}</span>
                <span className="text-[10px] text-stone-400">▾</span>
              </button>

              {/* Editorial Account Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-md bg-[#faf9f7] shadow-xl border border-[#eae4da] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans text-xs">
                  <div className="px-3 py-2 border-b border-stone-200/60 mb-1">
                    <p className="font-serif text-sm font-medium text-stone-900 truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] text-stone-500 truncate">{currentUser.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigate('archive');
                    }}
                    className="w-full text-left px-3 py-2 text-stone-700 hover:bg-stone-100/80 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Archive</span>
                    <span className="text-[10px] font-mono text-stone-400">⌘A</span>
                  </button>

                  {onOpenProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3 py-2 text-stone-700 hover:bg-stone-100/80 transition-colors cursor-pointer"
                    >
                      Profile
                    </button>
                  )}

                  {currentUser.role === 'ADMIN' && onOpenAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full text-left px-3 py-2 text-amber-800 hover:bg-amber-50/80 transition-colors cursor-pointer"
                    >
                      Bureau Desk
                    </button>
                  )}

                  <div className="border-t border-stone-200/60 my-1"></div>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50/80 transition-colors cursor-pointer"
                    >
                      Logout
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex min-h-10 items-center text-xs font-medium text-stone-700 hover:text-teal-900 px-3 py-1.5 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )
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
            className="flex min-h-10 items-center rounded-sm bg-teal-900 px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-teal-800 hover:shadow-[0_2px_4px_rgba(20,83,45,0.25),0_6px_18px_rgba(20,83,45,0.22)] active:scale-[0.96] cursor-pointer"
            style={{ fontFamily: 'sans-serif' }}
          >
            Write a Letter
          </button>
        </div>
      </div>
    </header>
  );
};
