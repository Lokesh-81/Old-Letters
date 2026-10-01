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
        {/* Visible, accessible Close [X] Button at top right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in modal"
          className="absolute top-3.5 right-3.5 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-stone-100/90 hover:bg-stone-200 text-stone-600 hover:text-stone-950 transition-all shadow-xs cursor-pointer border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
