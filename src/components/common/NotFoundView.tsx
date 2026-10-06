import React from 'react';

interface NotFoundViewProps {
  onBackToHome: () => void;
  onNavigate?: (view: any) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onBackToHome, onNavigate }) => {
  return (
    <main
      className="min-h-[75vh] flex items-center justify-center px-6 py-20 bg-[#faf9f7] text-[#141618]"
      role="main"
      aria-labelledby="not-found-heading"
    >
      <div className="max-w-xl w-full text-center space-y-8 p-8 sm:p-12 bg-white border border-[#eae4da] rounded-xs shadow-paper-md">
        {/* Postal Seal Cachet */}
        <div className="mx-auto w-20 h-20 rounded-full border-2 border-dashed border-stone-400 flex flex-col items-center justify-center text-stone-500 font-mono text-[9px] uppercase tracking-wider select-none rotate-[-6deg]">
          <span>CENTRAL</span>
          <span className="text-base font-serif font-bold text-stone-700">404</span>
          <span>DISPATCH</span>
        </div>

        <div className="space-y-3">
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-400">
            POSTAL ERROR · LEDGER NOT FOUND
          </span>
          <h1
            id="not-found-heading"
            className="text-3xl sm:text-4xl text-teal-950 font-normal tracking-tight font-serif"
          >
            Archival Record Not Found
          </h1>
          <p className="text-stone-600 text-sm sm:text-base font-sans leading-relaxed max-w-md mx-auto">
            The correspondence ledger or postal route you requested does not exist or has been relocated within the registry.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full sm:w-auto rounded-sm bg-teal-900 px-8 py-3 text-xs uppercase tracking-wider font-medium text-white shadow-xs hover:bg-teal-800 transition-colors cursor-pointer"
          >
            Return to Correspondence Desk →
          </button>
        </div>

        {/* Informative Directory Links */}
        <div className="pt-6 border-t border-stone-200 text-xs text-stone-500 font-sans space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
            Helpful Postal Destinations
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
            <button
              type="button"
              onClick={() => onNavigate?.('how-it-works')}
              className="hover:text-teal-900 underline underline-offset-4 cursor-pointer"
            >
              How It Works & FAQ
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate?.('privacy')}
              className="hover:text-teal-900 underline underline-offset-4 cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate?.('terms')}
              className="hover:text-teal-900 underline underline-offset-4 cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
