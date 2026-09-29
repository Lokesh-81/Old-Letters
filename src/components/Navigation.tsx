import React from 'react';

interface NavigationProps {
  currentView: 'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient';
  onNavigate: (view: 'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient') => void;
  onOpenAdmin?: () => void;
  isRecipientMode?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  onOpenAdmin,
  isRecipientMode = false,
}) => {
  if (isRecipientMode) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-[#faf9f7]/95 backdrop-blur-md border-b border-[#eae4da] transition-colors">
      <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
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
              onClick={() => onNavigate(item.view)}
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

        {/* Primary CTA */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('composer')}
            className="flex min-h-10 items-center rounded-sm bg-teal-900 px-6 py-2.5 text-sm font-medium text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-teal-800 hover:shadow-[0_2px_4px_rgba(20,83,45,0.25),0_6px_18px_rgba(20,83,45,0.22)] active:scale-[0.96] cursor-pointer"
            style={{ fontFamily: 'sans-serif' }}
          >
            Write a Letter
          </button>
        </div>
      </div>
    </header>
  );
};
