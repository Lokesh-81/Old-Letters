import React, { useState, useEffect } from 'react';
import { Letter } from '../../types/letter';
import { BureauPaymentItem, BureauStats, NotificationPreferences, ReceivedLetterSummary } from '../../types/backend';
import {
  fetchBureauSummary,
  fetchSentLetters,
  fetchReceivedLetters,
  fetchUserPayments,
  updateUserProfile,
  updateNotificationPreferences,
  changeUserPassword,
  downloadBureauArchive,
  deleteBureauAccount,
} from '../../lib/api';
import { LetterDetailModal } from './LetterDetailModal';
import { PaymentDetailModal } from './PaymentDetailModal';

export type BureauTab = 'overview' | 'sent' | 'received' | 'payments' | 'settings' | 'legal';

interface BureauDashboardProps {
  initialTab?: BureauTab;
  currentUser: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role?: string;
    authProvider?: string;
    emailVerified?: boolean;
    googleLinked?: boolean;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
    termsVersion?: string;
    privacyVersion?: string;
    legalConsentAt?: string;
    createdAt?: string;
  } | null;
  onNavigateHome: () => void;
  onNavigateWrite: () => void;
  onNavigateTerms: () => void;
  onNavigatePrivacy: () => void;
  onOpenRecipientMode: (letter: Letter, deliveryToken?: string) => void;
  onOpenAuth?: () => void;
  onLogout: () => void;
}

export const BureauDashboard: React.FC<BureauDashboardProps> = ({
  initialTab = 'overview',
  currentUser,
  onNavigateHome,
  onNavigateWrite,
  onNavigateTerms,
  onNavigatePrivacy,
  onOpenRecipientMode,
  onOpenAuth,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<BureauTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Real MongoDB data states
  const [stats, setStats] = useState<BureauStats>({
    sentCount: 0,
    receivedCount: 0,
    inTransitCount: 0,
    deliveredCount: 0,
    totalSpent: 0,
  });

  const [userProfile, setUserProfile] = useState<any>(currentUser);
  const [sentLetters, setSentLetters] = useState<Letter[]>([]);
  const [receivedLetters, setReceivedLetters] = useState<ReceivedLetterSummary[]>([]);
  const [payments, setPayments] = useState<BureauPaymentItem[]>([]);

  // Search & Filter controls for Sent Letters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_TRANSIT' | 'DELIVERED' | 'DRAFT' | 'CANCELLED'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'DELIVERY' | 'RECIPIENT'>('NEWEST');

  // Modals
  const [selectedSentLetter, setSelectedSentLetter] = useState<Letter | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<BureauPaymentItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Settings form states
  const [editFullName, setEditFullName] = useState(currentUser?.fullName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    letterDispatched: true,
    deliveryUpdates: true,
    preArrival: true,
    arrival: true,
    paymentUpdates: true,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Load all actual data from MongoDB on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBureauData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [bureauSummary, sent, received, paymentHistory] = await Promise.all([
          fetchBureauSummary().catch(() => null),
          fetchSentLetters().catch(() => []),
          fetchReceivedLetters().catch(() => []),
          fetchUserPayments().catch(() => []),
        ]);

        if (!isMounted) return;

        if (bureauSummary?.success) {
          setStats(bureauSummary.stats);
          setUserProfile(bureauSummary.user);
          setEditFullName(bureauSummary.user.fullName);
          if (bureauSummary.user.notificationPreferences) {
            setNotificationPreferences(bureauSummary.user.notificationPreferences);
          }
        }
        setSentLetters(sent);
        setReceivedLetters(received);
        setPayments(paymentHistory);
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Could not load Bureau records.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBureauData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Message dismissals
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) return;
    setSavingProfile(true);
    setErrorMsg(null);
    try {
      const res = await updateUserProfile({ fullName: editFullName.trim() });
      setUserProfile((prev: any) => ({ ...prev, fullName: editFullName.trim() }));
      setSuccessMsg('Correspondent profile name updated in Bureau records.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile name.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Notification Preferences Change
  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    const updated = {
      ...notificationPreferences,
      [key]: !notificationPreferences[key],
    };
    setNotificationPreferences(updated);
    setSavingPreferences(true);
    try {
      await updateNotificationPreferences(updated);
      setSuccessMsg('Notification preferences updated.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to persist preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    setErrorMsg(null);
    try {
      await changeUserPassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setSuccessMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput !== 'DELETE MY BUREAU') return;
    setDeletingAccount(true);
    try {
      await deleteBureauAccount('DELETE MY BUREAU');
      onLogout();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to close Bureau account.');
      setDeletingAccount(false);
    }
  };

  // Filtered & Sorted Sent Letters
  const filteredSentLetters = sentLetters.filter((ltr) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ltr.recipientName?.toLowerCase().includes(q) ||
      ltr.trackingCode?.toLowerCase().includes(q) ||
      ltr.type?.toLowerCase().includes(q) ||
      ltr.greeting?.toLowerCase().includes(q) ||
      ltr.content?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'IN_TRANSIT') {
      return ltr.status === 'IN TRANSIT' || (ltr.status as string) === 'IN_TRANSIT' || ltr.status === 'SCHEDULED';
    }
    if (statusFilter === 'DELIVERED') {
      return ltr.status === 'DELIVERED' || ltr.status === 'OPENED';
    }
    if (statusFilter === 'DRAFT') {
      return ltr.status === 'DRAFT';
    }
    if (statusFilter === 'CANCELLED') {
      return ltr.status === 'CANCELLED';
    }
    return true;
  });

  const sortedSentLetters = [...filteredSentLetters].sort((a, b) => {
    if (sortBy === 'NEWEST') {
      return new Date(b.createdAt || b.postedAt || 0).getTime() - new Date(a.createdAt || a.postedAt || 0).getTime();
    }
    if (sortBy === 'OLDEST') {
      return new Date(a.createdAt || a.postedAt || 0).getTime() - new Date(b.createdAt || b.postedAt || 0).getTime();
    }
    if (sortBy === 'DELIVERY') {
      return new Date(a.scheduledDeliveryAt || 0).getTime() - new Date(b.scheduledDeliveryAt || 0).getTime();
    }
    if (sortBy === 'RECIPIENT') {
      return (a.recipientName || '').localeCompare(b.recipientName || '');
    }
    return 0;
  });

  const enrolledDateStr = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'October 2026';

  const consentDateStr = userProfile?.legalConsentAt
    ? new Date(userProfile.legalConsentAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : enrolledDateStr;

  const isGoogle = userProfile?.googleLinked || userProfile?.authProvider === 'GOOGLE' || userProfile?.authProvider === 'BOTH';
  const initialLetter = userProfile?.fullName?.charAt(0) || userProfile?.email?.charAt(0).toUpperCase() || 'C';

  if (!currentUser && !userProfile && !loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] text-teal-900 font-sans flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-md w-full bg-white border border-[#eae4da] rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#f5efe6] flex items-center justify-center text-teal-900 border border-[#eae4da]">
            <span className="font-serif text-2xl">✉</span>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-stone-500">
              CORRESPONDENCE BUREAU ARCHIVE
            </span>
            <h2 className="font-serif text-2xl text-stone-900">Bureau Access Required</h2>
            <p className="text-xs text-stone-600 leading-relaxed font-serif italic">
              Your Correspondence Bureau is a private registry of dispatched letters, arriving deliveries, and sealed records. Please sign in to open your desk.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex-1 min-h-10 bg-teal-900 hover:bg-teal-800 text-white rounded-md text-xs font-medium py-2.5 px-4 transition-colors cursor-pointer"
              >
                Sign In to My Bureau
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex-1 min-h-10 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-xs font-medium py-2.5 px-4 transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-teal-900 font-sans pb-24 selection:bg-stone-300/50">
      {/* Toast Messages */}
      {errorMsg && (
        <div className="sticky top-16 z-50 bg-red-900 text-amber-50 px-6 py-3 text-xs flex items-center justify-between shadow-md">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-amber-200 hover:text-white uppercase font-mono text-[10px] ml-4 cursor-pointer"
          >
            [Dismiss]
          </button>
        </div>
      )}

      {successMsg && (
        <div className="sticky top-16 z-50 bg-emerald-900 text-amber-50 px-6 py-3 text-xs flex items-center justify-between shadow-md">
          <span>✓ {successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-200 hover:text-white uppercase font-mono text-[10px] ml-4 cursor-pointer"
          >
            [Dismiss]
          </button>
        </div>
      )}

      {/* Bureau Header */}
      <div className="border-b border-[#eae4da] bg-[#f5efe6]/70 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 sm:py-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-800"></span>
                <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500 font-medium">
                  POSTAL BUREAU ARCHIVES · SECURE CORRESPONDENT DESK
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light text-teal-950 tracking-tight">
                MY CORRESPONDENCE BUREAU
              </h1>
              <p className="font-serif italic text-stone-600 text-base sm:text-lg">
                Your private record of letters sent, received, and kept in trust.
              </p>
            </div>

            {/* Correspondent Badge */}
            <div className="flex items-center gap-4 bg-white/80 p-3.5 sm:p-4 rounded-xl border border-[#eae4da] shadow-xs shrink-0 max-w-sm">
              <div className="w-13 h-13 rounded-full bg-teal-900 text-amber-100 flex items-center justify-center font-serif text-xl border border-teal-800 shadow-xs shrink-0 select-none">
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initialLetter
                )}
              </div>
              <div className="overflow-hidden space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base font-medium text-stone-900 truncate">
                    {userProfile?.fullName || 'Correspondent'}
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Active Account"></span>
                </div>
                <p className="text-xs text-stone-500 font-mono truncate">{userProfile?.email}</p>
                <div className="flex items-center gap-2 text-[10px] text-stone-500 pt-0.5">
                  <span>Enrolled {enrolledDateStr}</span>
                  {isGoogle && (
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                      Google Linked
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bureau Navigation Tabs */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto border-b border-[#eae4da]/80 pb-px scrollbar-none text-xs font-mono uppercase tracking-wider">
            {[
              { id: 'overview' as const, label: 'Overview', icon: '📜' },
              { id: 'sent' as const, label: `Sent Letters (${stats.sentCount})`, icon: '✉️' },
              { id: 'received' as const, label: `Received Letters (${stats.receivedCount})`, icon: '📬' },
              { id: 'payments' as const, label: `Payment History (${payments.length})`, icon: '💳' },
              { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
              { id: 'legal' as const, label: 'Privacy & Security', icon: '⚖️' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 border-b-2 font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-teal-900 text-teal-950 font-bold bg-white/40 rounded-t'
                    : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-8 h-8 border-2 border-teal-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-serif italic text-stone-500">Opening your private correspondence ledger...</p>
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* 1. OVERVIEW TAB */}
            {/* ============================================================ */}
            {activeTab === 'overview' && (
              <div className="space-y-10">
                {/* Summary Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-[#eae4da] shadow-xs space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                      Letters Sent
                    </span>
                    <span className="font-serif text-3xl font-medium text-teal-950 block">
                      {stats.sentCount}
                    </span>
                    <span className="text-[11px] text-stone-500 block">penned in trust</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#eae4da] shadow-xs space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                      Letters Received
                    </span>
                    <span className="font-serif text-3xl font-medium text-teal-950 block">
                      {stats.receivedCount}
                    </span>
                    <span className="text-[11px] text-stone-500 block">addressed to you</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#eae4da] shadow-xs space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 block">
                      In Transit
                    </span>
                    <span className="font-serif text-3xl font-medium text-amber-900 block">
                      {stats.inTransitCount}
                    </span>
                    <span className="text-[11px] text-stone-500 block">traveling across time</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#eae4da] shadow-xs space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 block">
                      Delivered
                    </span>
                    <span className="font-serif text-3xl font-medium text-emerald-950 block">
                      {stats.deliveredCount}
                    </span>
                    <span className="text-[11px] text-stone-500 block">safely arrived</span>
                  </div>

                  <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-xl border border-[#eae4da] shadow-xs space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 block">
                      Dispatched Value
                    </span>
                    <span className="font-serif text-3xl font-medium text-teal-950 block">
                      ₹{stats.totalSpent}
                    </span>
                    <span className="text-[11px] text-stone-500 block">wax seals & premium post</span>
                  </div>
                </div>

                {/* Quick Desk Action Row */}
                <div className="bg-[#f5efe6] p-6 rounded-xl border border-[#eae4da] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-medium text-teal-950">
                      Write a New Letter to Any Recipient
                    </h3>
                    <p className="text-xs text-stone-600 font-serif italic">
                      Every dispatch is held in quiet waiting for at least 48 hours before delivery.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onNavigateWrite}
                      className="rounded-sm bg-teal-900 px-5 py-2.5 text-xs uppercase tracking-wider font-medium text-white hover:bg-teal-800 transition-colors shadow-xs cursor-pointer"
                    >
                      Write a Letter →
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadBureauArchive()}
                      className="rounded-sm bg-white border border-[#eae4da] px-4 py-2.5 text-xs uppercase tracking-wider font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      Download Records
                    </button>
                  </div>
                </div>

                {/* Recent Dispatches Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#eae4da] pb-3">
                    <h2 className="font-serif text-xl font-medium text-teal-950">
                      Recent Dispatches & Correspondence
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sent')}
                      className="text-xs font-mono uppercase text-teal-800 hover:text-teal-950 hover:underline cursor-pointer"
                    >
                      View All Dispatches ({sentLetters.length}) →
                    </button>
                  </div>

                  {sentLetters.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-xl border border-[#eae4da] space-y-3">
                      <p className="font-serif text-stone-600 italic">No correspondence sent yet.</p>
                      <button
                        type="button"
                        onClick={onNavigateWrite}
                        className="rounded-sm bg-teal-900 px-4 py-2 text-xs uppercase tracking-wider font-medium text-white hover:bg-teal-800 transition-colors cursor-pointer"
                      >
                        Pen Your First Letter
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sentLetters.slice(0, 4).map((ltr) => (
                        <div
                          key={ltr.id}
                          onClick={() => setSelectedSentLetter(ltr)}
                          className="bg-white p-5 rounded-xl border border-[#eae4da] hover:border-teal-700/50 hover:shadow-md transition-all cursor-pointer space-y-3"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">
                              REF · {ltr.trackingCode}
                            </span>
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                              ltr.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {ltr.status}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-serif text-base font-medium text-stone-900">
                              To {ltr.recipientName}
                            </h4>
                            <p className="text-xs text-stone-500 font-serif italic truncate mt-0.5">
                              {ltr.greeting || `Dear ${ltr.recipientName},`} {ltr.content?.slice(0, 60)}...
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-100 font-mono">
                            <span>{ltr.letterDate || 'Recent'}</span>
                            <span className="text-teal-800 font-medium">Inspect Record →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 2. SENT LETTERS TAB */}
            {/* ============================================================ */}
            {activeTab === 'sent' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eae4da] pb-4">
                  <div>
                    <h2 className="font-serif text-2xl font-medium text-teal-950">
                      MY SENT LETTERS
                    </h2>
                    <p className="text-xs text-stone-500 font-serif italic">
                      Every dispatch penned and posted under your correspondent authority.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onNavigateWrite}
                    className="rounded-sm bg-teal-900 px-4 py-2 text-xs uppercase tracking-wider font-medium text-white hover:bg-teal-800 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    + Write New Letter
                  </button>
                </div>

                {/* Controls: Search, Filter, Sort */}
                <div className="bg-white p-4 rounded-xl border border-[#eae4da] space-y-4 shadow-xs">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search letters by recipient, subject, tracking code..."
                        className="w-full bg-[#faf9f7] border border-[#eae4da] rounded-md px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-teal-900"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-stone-400 uppercase text-[10px]">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="bg-[#faf9f7] border border-[#eae4da] rounded px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-teal-900 cursor-pointer"
                      >
                        <option value="NEWEST">Newest First</option>
                        <option value="OLDEST">Oldest First</option>
                        <option value="DELIVERY">Delivery Date</option>
                        <option value="RECIPIENT">Recipient Name</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono uppercase tracking-wider pt-1">
                    <span className="text-stone-400 text-[10px] mr-1">Filter:</span>
                    {[
                      { id: 'ALL' as const, label: 'All Dispatches' },
                      { id: 'IN_TRANSIT' as const, label: 'In Transit' },
                      { id: 'DELIVERED' as const, label: 'Delivered' },
                      { id: 'DRAFT' as const, label: 'Drafts' },
                      { id: 'CANCELLED' as const, label: 'Cancelled' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-3 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                          statusFilter === tab.id
                            ? 'bg-teal-900 text-white border-teal-900'
                            : 'bg-white text-stone-600 border-[#eae4da] hover:border-stone-400'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sent Letters List */}
                {sortedSentLetters.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-xl border border-[#eae4da] space-y-3">
                    <p className="font-serif text-stone-500 italic">No sent letters match your search and filter criteria.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('ALL');
                      }}
                      className="text-xs font-mono uppercase text-teal-900 underline cursor-pointer"
                    >
                      Clear Search & Filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedSentLetters.map((ltr) => {
                      const deliveryDateFormatted = ltr.scheduledDeliveryAt
                        ? new Date(ltr.scheduledDeliveryAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Scheduled in 48h';

                      const paymentStatus = (ltr as any).paymentStatus || 'COMPLIMENTARY';
                      const amountPaid = (ltr as any).amountPaid;

                      return (
                        <div
                          key={ltr.id}
                          className="bg-white p-5 rounded-xl border border-[#eae4da] hover:border-teal-800/40 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono text-xs font-semibold text-teal-950">
                                {ltr.trackingCode}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-600 uppercase border border-stone-200">
                                {ltr.type}
                              </span>
                              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                                ltr.status === 'DELIVERED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {ltr.status}
                              </span>
                              {amountPaid > 0 ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                                  ₹{amountPaid} · {paymentStatus}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-50 text-stone-500 border border-stone-200 uppercase">
                                  Complimentary Post
                                </span>
                              )}
                            </div>

                            <h3 className="font-serif text-lg font-medium text-stone-900 truncate">
                              To: {ltr.recipientName}
                              <span className="text-xs font-sans text-stone-400 font-normal ml-2">
                                ({(ltr as any).recipientEmailMasked || ltr.recipientEmail})
                              </span>
                            </h3>

                            <p className="text-xs text-stone-600 font-serif italic truncate max-w-xl">
                              "{ltr.content?.slice(0, 90)}..."
                            </p>

                            <div className="flex items-center gap-4 text-[11px] text-stone-400 font-mono pt-1">
                              <span>Sent: {ltr.letterDate || 'Recent'}</span>
                              <span>•</span>
                              <span>Expected: {deliveryDateFormatted}</span>
                              {ltr.postmarkCity && (
                                <>
                                  <span>•</span>
                                  <span>{ltr.postmarkCity}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                            <button
                              type="button"
                              onClick={() => setSelectedSentLetter(ltr)}
                              className="rounded-sm bg-teal-900 px-4 py-2 text-xs uppercase tracking-wider font-medium text-white hover:bg-teal-800 transition-colors cursor-pointer"
                            >
                              Inspect Letter & Timeline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* 3. RECEIVED LETTERS TAB */}
            {/* ============================================================ */}
            {activeTab === 'received' && (
              <div className="space-y-6">
                <div className="border-b border-[#eae4da] pb-4">
                  <h2 className="font-serif text-2xl font-medium text-teal-950">
                    MY RECEIVED LETTERS
                  </h2>
                  <p className="text-xs text-stone-500 font-serif italic">
                    Letters addressed to your registered email ({userProfile?.email}).
                  </p>
                </div>

                {receivedLetters.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-xl border border-[#eae4da] space-y-4">
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-xl mx-auto text-stone-400">
                      📬
                    </div>
                    <div className="space-y-1">
                      <p className="font-serif text-lg text-stone-700">No letters in your postal pigeonhole yet.</p>
                      <p className="text-xs text-stone-500 font-serif italic">
                        When someone writes to {userProfile?.email}, their sealed letter will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {receivedLetters.map((rcv) => {
                      const deliveryDateFormatted = rcv.scheduledDeliveryAt
                        ? new Date(rcv.scheduledDeliveryAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Scheduled in 48 hours';

                      return (
                        <div
                          key={rcv.id}
                          className="bg-white rounded-xl border border-[#eae4da] p-6 space-y-4 shadow-xs relative overflow-hidden"
                        >
                          {/* Top Badges */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest">
                              TRACKING · {rcv.trackingCode}
                            </span>
                            <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                              rcv.canOpen
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                            }`}>
                              {rcv.canOpen ? 'Delivered & Kept in Trust' : 'Sealed in Transit'}
                            </span>
                          </div>

                          {/* Sender Info */}
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                              From Correspondent
                            </span>
                            <h3 className="font-serif text-xl font-medium text-teal-950 mt-0.5">
                              {rcv.senderName}
                            </h3>
                            <span className="text-xs font-mono text-stone-500">
                              Occasion: {rcv.letterType}
                            </span>
                          </div>

                          {/* Sealed Protection vs Opened Experience */}
                          {rcv.isSealed ? (
                            <div className="p-4 bg-[#f8f5ee] rounded-lg border border-amber-200/70 space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-amber-900 font-semibold font-mono text-[11px] uppercase">
                                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                SEALED IN TRANSIT
                              </div>
                              <p className="font-serif italic text-stone-700 leading-relaxed">
                                "Your letter is still making its way to you. The postal bureau preserves epistolary silence until the exact scheduled delivery moment."
                              </p>
                              <div className="text-[10px] font-mono text-stone-500 pt-1 border-t border-amber-200/50">
                                Expected Arrival: {deliveryDateFormatted}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200/80 space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-emerald-900 font-semibold font-mono text-[11px] uppercase">
                                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                DELIVERED & READY TO OPEN
                              </div>
                              <p className="font-serif italic text-stone-700">
                                This letter has fulfilled its mandatory waiting journey and is ready for your eyes.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  // Construct letter object to pass to RecipientExperience
                                  const letterObj: Letter = {
                                    id: rcv.id,
                                    trackingCode: rcv.trackingCode,
                                    type: rcv.letterType as any,
                                    templateId: rcv.templateId,
                                    senderName: rcv.senderName,
                                    senderEmail: 'correspondent@oldletters.in',
                                    recipientName: userProfile?.fullName || 'Recipient',
                                    recipientEmail: userProfile?.email || '',
                                    letterDate: rcv.letterDate,
                                    greeting: `Dear ${userProfile?.fullName || 'Recipient'},`,
                                    content: '',
                                    signoff: 'Yours in correspondence,',
                                    attachments: [],
                                    postedAt: rcv.postedAt || new Date().toISOString(),
                                    waitingHours: 48,
                                    verificationMethod: (rcv.verificationMethod as any) || 'open',
                                    status: 'DELIVERED',
                                    scheduledDeliveryAt: rcv.scheduledDeliveryAt || new Date().toISOString(),
                                  };
                                  onOpenRecipientMode(letterObj, rcv.deliveryToken);
                                }}
                                className="w-full mt-2 rounded-sm bg-teal-900 py-2 text-xs uppercase tracking-wider font-medium text-white hover:bg-teal-800 transition-colors cursor-pointer text-center"
                              >
                                Open Letter Experience →
                              </button>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-2 border-t border-stone-100">
                            <span>Dispatched: {rcv.letterDate}</span>
                            <span>{rcv.postmarkCity || 'Central Postal Archive'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* 4. PAYMENT HISTORY TAB */}
            {/* ============================================================ */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eae4da] pb-4">
                  <div>
                    <h2 className="font-serif text-2xl font-medium text-teal-950">
                      PAYMENT HISTORY
                    </h2>
                    <p className="text-xs text-stone-500 font-serif italic">
                      Actual payment records associated with your authenticated correspondent account.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                      Total Verified Outlay
                    </span>
                    <span className="font-serif text-2xl font-medium text-teal-950">
                      ₹{stats.totalSpent} INR
                    </span>
                  </div>
                </div>

                {payments.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-xl border border-[#eae4da] space-y-3">
                    <p className="font-serif text-stone-500 italic">No payment transactions recorded.</p>
                    <p className="text-xs text-stone-400">
                      Standard letter creation is complimentary; audio/video seals require optional UPI verification.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#eae4da] overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-[#f5efe6] text-stone-600 font-mono uppercase text-[10px] tracking-wider border-b border-[#eae4da]">
                          <tr>
                            <th className="py-3.5 px-4 font-medium">Date</th>
                            <th className="py-3.5 px-4 font-medium">Payment ID</th>
                            <th className="py-3.5 px-4 font-medium">Letter Ref</th>
                            <th className="py-3.5 px-4 font-medium">Recipient</th>
                            <th className="py-3.5 px-4 font-medium">Type</th>
                            <th className="py-3.5 px-4 font-medium">Amount</th>
                            <th className="py-3.5 px-4 font-medium">UPI UTR</th>
                            <th className="py-3.5 px-4 font-medium">Status</th>
                            <th className="py-3.5 px-4 font-medium text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-stone-800">
                          {payments.map((p) => (
                            <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                              <td className="py-3.5 px-4 whitespace-nowrap text-stone-500 font-mono text-[11px]">
                                {new Date(p.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-medium text-teal-950">
                                {p.paymentId}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-stone-600">
                                {p.trackingCode || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-stone-700 font-serif">
                                {p.recipientName || p.recipientEmail || 'Recipient'}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-stone-900">
                                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                  <span>{p.mediaType === 'VIDEO' || p.featureCode?.includes('VIDEO') ? '🎥' : '🎙️'}</span>
                                  <span>{p.mediaType === 'VIDEO' || p.featureCode?.includes('VIDEO') ? 'Video Note' : 'Voice Note'}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-semibold text-stone-900">
                                ₹{p.amount} {p.currency}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-stone-500 text-[11px] select-all">
                                {p.upiReference}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                                  p.status === 'APPROVED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : p.status === 'PENDING'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : p.status === 'REFUNDED'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-red-50 text-red-800 border-red-200'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPayment(p)}
                                  className="text-teal-800 hover:text-teal-950 font-mono text-[11px] uppercase hover:underline cursor-pointer"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* 5. SETTINGS TAB */}
            {/* ============================================================ */}
            {activeTab === 'settings' && (
              <div className="max-w-3xl space-y-10">
                <div className="border-b border-[#eae4da] pb-4">
                  <h2 className="font-serif text-2xl font-medium text-teal-950">
                    BUREAU SETTINGS & SECURITY
                  </h2>
                  <p className="text-xs text-stone-500 font-serif italic">
                    Manage your correspondent credentials, notification dispatches, and archival preferences.
                  </p>
                </div>

                {/* Section 1: Account Information */}
                <div className="bg-white p-6 rounded-xl border border-[#eae4da] space-y-5 shadow-xs">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal-900 font-semibold block">
                      SECTION 01
                    </span>
                    <h3 className="font-serif text-lg font-medium text-stone-900 mt-0.5">
                      Account Profile
                    </h3>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="text-xs font-mono uppercase text-stone-500 block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full bg-[#faf9f7] border border-[#eae4da] rounded-md px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-teal-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono uppercase text-stone-500 block mb-1">
                        Registered Email
                      </label>
                      <input
                        type="email"
                        value={userProfile?.email || ''}
                        disabled
                        className="w-full bg-stone-100 border border-stone-200 rounded-md px-3.5 py-2.5 text-sm text-stone-500 cursor-not-allowed font-mono"
                      />
                      <span className="text-[11px] text-stone-400 mt-1 block">
                        Email address is bound to your correspondence identity.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-3 bg-stone-50 rounded border border-stone-200 text-xs">
                        <span className="text-[10px] uppercase font-mono text-stone-400 block">Enrolled Date</span>
                        <span className="font-medium text-stone-800 mt-0.5 block">{enrolledDateStr}</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded border border-stone-200 text-xs">
                        <span className="text-[10px] uppercase font-mono text-stone-400 block">Auth Provider</span>
                        <span className="font-medium text-stone-800 mt-0.5 block">
                          {isGoogle ? 'Google OAuth' : 'Email & Password'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-sm bg-teal-900 px-5 py-2.5 text-xs uppercase tracking-wider font-medium text-white hover:bg-teal-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {savingProfile ? 'Updating...' : 'Save Profile Changes'}
                    </button>
                  </form>
                </div>

                {/* Section 2: Security & Credentials */}
                <div className="bg-white p-6 rounded-xl border border-[#eae4da] space-y-5 shadow-xs">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal-900 font-semibold block">
                      SECTION 02
                    </span>
                    <h3 className="font-serif text-lg font-medium text-stone-900 mt-0.5">
                      Security & Password
                    </h3>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {userProfile?.hasPassword && (
                      <div>
                        <label className="text-xs font-mono uppercase text-stone-500 block mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#faf9f7] border border-[#eae4da] rounded-md px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-teal-900 font-mono"
                          required
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-mono uppercase text-stone-500 block mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full bg-[#faf9f7] border border-[#eae4da] rounded-md px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-teal-900 font-mono"
                          required
                          minLength={8}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-mono uppercase text-stone-500 block mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full bg-[#faf9f7] border border-[#eae4da] rounded-md px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-teal-900 font-mono"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="rounded-sm bg-stone-800 px-5 py-2.5 text-xs uppercase tracking-wider font-medium text-white hover:bg-stone-900 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {changingPassword ? 'Updating Password...' : 'Change Password'}
                    </button>
                  </form>
                </div>

                {/* Section 3: Notification Preferences */}
                <div className="bg-white p-6 rounded-xl border border-[#eae4da] space-y-5 shadow-xs">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal-900 font-semibold block">
                      SECTION 03
                    </span>
                    <h3 className="font-serif text-lg font-medium text-stone-900 mt-0.5">
                      Postal Notification Dispatches
                    </h3>
                    <p className="text-xs text-stone-500 font-serif italic">
                      Actual dispatch notices stored in your Bureau account registry.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        key: 'letterDispatched' as const,
                        label: 'Letter Dispatched Notifications',
                        desc: 'Receive confirmation as soon as your penned letter is sealed into transit.',
                      },
                      {
                        key: 'deliveryUpdates' as const,
                        label: 'Delivery & Transit Updates',
                        desc: 'Notifications when correspondence reaches midway postmark checkpoints.',
                      },
                      {
                        key: 'preArrival' as const,
                        label: 'Pre-Arrival Notifications',
                        desc: 'Notice sent 24 hours prior to final letter unsealing.',
                      },
                      {
                        key: 'arrival' as const,
                        label: 'Arrival & Delivery Confirmations',
                        desc: 'Confirmation when your recipient unlocks and unseals your letter.',
                      },
                      {
                        key: 'paymentUpdates' as const,
                        label: 'Payment & Receipt Notifications',
                        desc: 'Receipts and verification confirmations for UPI postal features.',
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-[#eae4da] bg-[#fcfbf9]"
                      >
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium text-stone-900 block font-serif">
                            {item.label}
                          </span>
                          <p className="text-xs text-stone-500">{item.desc}</p>
                        </div>
                        <button
                          type="button"
                          disabled={savingPreferences}
                          onClick={() => handleTogglePreference(item.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 mt-0.5 ${
                            notificationPreferences[item.key] ? 'bg-teal-900' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 shadow-xs ${
                              notificationPreferences[item.key] ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Data Export & Archival */}
                <div className="bg-white p-6 rounded-xl border border-[#eae4da] space-y-4 shadow-xs">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal-900 font-semibold block">
                      SECTION 04
                    </span>
                    <h3 className="font-serif text-lg font-medium text-stone-900 mt-0.5">
                      Account Data Portability
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-serif italic">
                    Under global digital correspondence privacy and archival data protection standards, you may download a complete, cryptographic export of your sent correspondence records, received letters registry, legal consent timestamp, and payment transactions in standard JSON format.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadBureauArchive()}
                    className="rounded-sm bg-stone-100 border border-stone-300 px-4 py-2.5 text-xs uppercase tracking-wider font-medium text-teal-950 hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Download My Account Data (JSON Archive)
                  </button>
                </div>

                {/* Section 5: Account Actions & Termination */}
                <div className="bg-red-50/50 p-6 rounded-xl border border-red-200 space-y-4 shadow-xs">
                  <div className="border-b border-red-200/60 pb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-800 font-semibold block">
                      SECTION 05 · TERMINATION
                    </span>
                    <h3 className="font-serif text-lg font-medium text-red-950 mt-0.5">
                      Account Termination
                    </h3>
                  </div>
                  <p className="text-xs text-red-900/80 leading-relaxed">
                    Closing your Bureau account permanently cancels pending draft dispatches and locks your correspondent seal. Historical letters already delivered to recipients will be retained in accordance with recipient trust.
                  </p>
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="rounded-sm bg-red-800 px-4 py-2 text-xs uppercase tracking-wider font-medium text-white hover:bg-red-900 transition-colors cursor-pointer"
                    >
                      Delete Account...
                    </button>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="text-xs font-mono uppercase text-stone-600 hover:text-stone-900 underline cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 6. LEGAL & CONSENT TAB */}
            {/* ============================================================ */}
            {activeTab === 'legal' && (
              <div className="max-w-3xl space-y-8">
                <div className="border-b border-[#eae4da] pb-4">
                  <h2 className="font-serif text-2xl font-medium text-teal-950">
                    PRIVACY & LEGAL CONSENT REGISTRY
                  </h2>
                  <p className="text-xs text-stone-500 font-serif italic">
                    Authoritative record of agreements executed by this correspondent account.
                  </p>
                </div>

                {/* Consent Records Card */}
                <div className="bg-white p-6 rounded-xl border border-[#eae4da] space-y-6 shadow-xs">
                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal-900 font-semibold block">
                      RECORD OF CONSENT
                    </span>
                    <h3 className="font-serif text-lg font-medium text-stone-900 mt-0.5">
                      Binding Legal Consent Record
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                    <div className="p-4 bg-stone-50 rounded-lg border border-[#eae4da] space-y-1">
                      <span className="text-[10px] font-mono uppercase text-stone-400 block">Terms of Service</span>
                      <span className="font-semibold text-emerald-800 flex items-center gap-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        Accepted: YES
                      </span>
                      <span className="text-[11px] font-mono text-stone-500 block pt-1">
                        Version: {userProfile?.termsVersion || '2026-10-01'}
                      </span>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-lg border border-[#eae4da] space-y-1">
                      <span className="text-[10px] font-mono uppercase text-stone-400 block">Privacy Policy</span>
                      <span className="font-semibold text-emerald-800 flex items-center gap-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        Accepted: YES
                      </span>
                      <span className="text-[11px] font-mono text-stone-500 block pt-1">
                        Version: {userProfile?.privacyVersion || '2026-10-01'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#f8f5ee] rounded-lg border border-amber-200/60 text-xs space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-900 font-semibold block">
                      Cryptographic Consent Audit
                    </span>
                    <p className="text-stone-700 leading-relaxed font-serif italic">
                      Consent was recorded on <strong>{consentDateStr}</strong> under IP registry reference and account authorization. Legal consent cannot be revoked retroactively via frontend toggle, maintaining compliance with international privacy and archival statutes.
                    </p>
                  </div>

                  {/* Read Policies Links */}
                  <div className="pt-2 flex flex-wrap gap-4 text-xs">
                    <button
                      type="button"
                      onClick={onNavigateTerms}
                      className="rounded-sm bg-stone-100 border border-stone-200 px-4 py-2 text-xs uppercase font-mono tracking-wider text-teal-950 hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Read Terms of Service →
                    </button>
                    <button
                      type="button"
                      onClick={onNavigatePrivacy}
                      className="rounded-sm bg-stone-100 border border-stone-200 px-4 py-2 text-xs uppercase font-mono tracking-wider text-teal-950 hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Read Privacy Policy →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Letter Detail Modal */}
      <LetterDetailModal
        isOpen={!!selectedSentLetter}
        letter={selectedSentLetter}
        onClose={() => setSelectedSentLetter(null)}
        onOpenRecipientMode={(ltr) => {
          setSelectedSentLetter(null);
          onOpenRecipientMode(ltr);
        }}
      />

      {/* Payment Detail Modal */}
      <PaymentDetailModal
        isOpen={!!selectedPayment}
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-red-200 p-6 space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-800 font-bold block">
                TERMINATION CONFIRMATION
              </span>
              <h3 className="font-serif text-xl font-medium text-red-950">
                Close Your Correspondence Bureau?
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              This action cannot be undone. To prevent accidental closure, please type the exact phrase{' '}
              <strong className="font-mono text-red-900">DELETE MY BUREAU</strong> below:
            </p>

            <input
              type="text"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              placeholder="DELETE MY BUREAU"
              className="w-full bg-[#faf9f7] border border-red-300 rounded px-3 py-2 text-xs font-mono text-red-950 placeholder:text-stone-400 focus:outline-none focus:border-red-600"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationInput('');
                }}
                className="text-xs font-mono uppercase text-stone-500 hover:text-stone-800 px-3 py-1.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationInput !== 'DELETE MY BUREAU' || deletingAccount}
                onClick={handleDeleteAccount}
                className="rounded-sm bg-red-800 px-4 py-2 text-xs uppercase tracking-wider font-medium text-white hover:bg-red-900 transition-colors cursor-pointer disabled:opacity-40"
              >
                {deletingAccount ? 'Closing...' : 'Confirm Account Closure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
