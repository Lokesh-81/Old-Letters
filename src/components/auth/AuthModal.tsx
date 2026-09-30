import React from 'react';
import Auth7 from '../../../components/ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string; fullName: string }) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#faf9f7] rounded-none md:rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
        <Auth7
          initialMode={initialMode}
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
