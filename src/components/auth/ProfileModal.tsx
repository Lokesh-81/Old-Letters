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
    googleLinked?: boolean;
    lettersCount?: number;
  } | null;
  lettersCount?: number;
  onLogout: () => void;
  onOpenArchive?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  lettersCount = 0,
  onLogout,
  onOpenArchive,
}) => {
  if (!isOpen || !user) return null;

  const count = user.lettersCount !== undefined ? user.lettersCount : lettersCount;
  const isGoogle = user.googleLinked || user.authProvider === 'GOOGLE' || user.authProvider === 'BOTH';

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'March 2026';

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
              Bureau Registry ID · #{user.id.slice(-6).toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-widest font-sans text-stone-400 hover:text-stone-800 transition-colors p-1 cursor-pointer"
          >
            Close [✕]
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 space-y-4 font-sans text-sm">
          <div className="flex items-center gap-4 pb-4 border-b border-stone-200">
            <div className="w-14 h-14 rounded-full bg-teal-900 text-amber-100 flex items-center justify-center font-serif text-2xl border border-teal-800 shadow-xs shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()
              )}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-serif text-lg font-medium text-stone-900 truncate">
                {user.fullName}
              </h3>
              <p className="text-xs text-stone-500 font-mono truncate">{user.email}</p>
              {isGoogle && (
                <span className="inline-flex items-center gap-1 text-[10px] font-sans text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full mt-1 border border-stone-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Google Linked
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
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
                Letters Sent
              </span>
              <span className="font-serif text-base font-medium text-teal-950 mt-0.5 block">
                {count} {count === 1 ? 'dispatch' : 'dispatches'}
              </span>
            </div>

            <div className="p-3 bg-white rounded border border-[#eae4da]">
              <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-sans">
                Bureau Enrolled
              </span>
              <span className="font-medium text-stone-800 mt-1 block">
                {joinedDate}
              </span>
            </div>

            <div className="p-3 bg-white rounded border border-[#eae4da]">
              <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-sans">
                Role
              </span>
              <span className="font-medium text-stone-800 mt-1 block">
                {user.role || 'USER'}
              </span>
            </div>
          </div>

          {/* Archive Action */}
          {onOpenArchive && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenArchive();
              }}
              className="w-full rounded-sm bg-stone-100 border border-stone-200 py-2.5 px-4 text-xs tracking-wider uppercase text-teal-950 font-medium hover:bg-stone-200/80 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>View Correspondence Archive</span>
              <span className="font-mono text-stone-400">→</span>
            </button>
          )}

          {/* Logout Action */}
          <div className="pt-2">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full rounded-sm border border-stone-300 bg-white py-2 text-xs uppercase tracking-wider text-stone-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors font-sans cursor-pointer"
            >
              Sign Out of Bureau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
