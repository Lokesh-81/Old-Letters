import React from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    fullName: string;
    role?: string;
    avatarUrl?: string;
    authProvider?: string;
    emailVerified?: boolean;
    createdAt?: string;
  } | null;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#faf9f7] rounded-xl shadow-2xl overflow-hidden border border-[#eae4da] font-serif">
        {/* Header */}
        <div className="p-6 border-b border-[#eae4da] flex items-center justify-between bg-stone-50/50">
          <div>
            <span className="font-serif tracking-[0.2em] text-sm text-teal-900 font-medium">
              CORRESPONDENT SEAL
            </span>
            <span className="block text-[10px] tracking-widest uppercase text-stone-500 font-sans mt-0.5">
              Bureau Registry ID
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-widest font-sans text-stone-400 hover:text-stone-800 transition-colors p-1"
          >
            Close [✕]
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 space-y-4 font-sans text-sm">
          <div className="flex items-center gap-4 pb-4 border-b border-stone-200">
            <div className="w-12 h-12 rounded-full bg-teal-900 text-amber-100 flex items-center justify-center font-serif text-xl border border-teal-800 shadow-xs">
              {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-stone-900">
                {user.fullName}
              </h3>
              <p className="text-xs text-stone-500 font-mono">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded border border-[#eae4da]">
              <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-sans">
                Status
              </span>
              <span className="font-medium text-teal-900 mt-1 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Verified Correspondent
              </span>
            </div>

            <div className="p-3 bg-white rounded border border-[#eae4da]">
              <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-sans">
                Bureau Role
              </span>
              <span className="font-medium text-stone-800 mt-1 block">
                {user.role || 'USER'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full rounded-sm border border-stone-300 bg-white py-2 text-xs uppercase tracking-wider text-stone-700 hover:bg-stone-50 hover:text-red-700 transition-colors font-sans cursor-pointer"
            >
              Sign Out of Bureau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
