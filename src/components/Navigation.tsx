import React from 'react';

interface NavigationProps {
  currentView: 'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient';
  onNavigate: (view: 'landing' | 'composer' | 'archive' | 'how-it-works' | 'recipient') => void;
  isRecipientMode?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  isRecipientMode = false,
}) => {
  if (isRecipientMode) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-[#faf9f7]/90 backdrop-blur-md border-b border-[#eae4da]/70 transition-colors">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="font-serif text-xl tracking-[0.14em] text-[#141618] hover:text-[#5c1d24] transition-colors cursor-pointer select-none text-left"
        >
          OLD-LETTERS
        </button>

        {/* Clean nav links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-sans tracking-wider uppercase text-stone-600">
          <button
            type="button"
            onClick={() => onNavigate('composer')}
            className={`cursor-pointer transition-colors py-1 hover:text-[#141618] ${
              currentView === 'composer' ? 'text-[#141618] border-b border-[#5c1d24] font-medium' : ''
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => onNavigate('archive')}
            className={`cursor-pointer transition-colors py-1 hover:text-[#141618] ${
              currentView === 'archive' ? 'text-[#141618] border-b border-[#5c1d24] font-medium' : ''
            }`}
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => onNavigate('how-it-works')}
            className={`cursor-pointer transition-colors py-1 hover:text-[#141618] ${
              currentView === 'how-it-works' ? 'text-[#141618] border-b border-[#5c1d24] font-medium' : ''
            }`}
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => onNavigate('recipient')}
            className={`cursor-pointer transition-colors py-1 hover:text-[#141618] ${
              currentView === 'recipient' ? 'text-[#141618] border-b border-[#5c1d24] font-medium' : ''
            }`}
          >
            Delivery
          </button>
        </nav>

        {/* Primary CTA */}
        <div>
          <button
            type="button"
            onClick={() => onNavigate('composer')}
            className="px-4 py-2 text-xs font-sans font-medium text-white bg-[#141618] hover:bg-[#5c1d24] rounded-xs transition-colors duration-200 cursor-pointer whitespace-nowrap tracking-wider uppercase"
          >
            Write a Letter →
          </button>
        </div>
      </div>
    </header>
  );
};
