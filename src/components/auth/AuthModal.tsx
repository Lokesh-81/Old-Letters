import React, { useEffect } from 'react';
import Auth7 from '../../../components/ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string; fullName: string }) => void;
  initialMode?: 'login' | 'signup';
  initialError?: string | null;
  promptTitle?: string;
  promptSubtitle?: string;
  onGuestPreview?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  initialError,
  promptTitle,
  promptSubtitle,
  onGuestPreview,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-5xl bg-[#faf9f7] rounded-none md:rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
        {/* Visible, high-contrast Close [X] Button at top right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in modal"
          title="Close sign-in modal"
          className="absolute top-3.5 right-3.5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-950 font-sans text-xs font-semibold uppercase tracking-wider transition-all shadow-md cursor-pointer border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-800"
        >
          <span>Close</span>
          <svg className="w-3.5 h-3.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <Auth7
          initialMode={initialMode}
          initialError={initialError}
          promptTitle={promptTitle}
          promptSubtitle={promptSubtitle}
          onGuestPreview={onGuestPreview}
          onSuccess={(u) => {
            onSuccess(u);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};
