/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { fetchAdminPayments, verifyAdminPayment, triggerSchedulerTick, apiFetch } from '../../lib/api';
import { PaymentRecord } from '../../types/backend';
import { isAdminEmail, isUserAdminRole } from '../../lib/admin';

interface AdminDashboardViewProps {
  currentUser: {
    id: string;
    email: string;
    fullName: string;
    role?: string;
  } | null;
  onNavigateHome: () => void;
  onOpenAuth?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onNavigateHome,
  onOpenAuth,
}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' | 'AUDIT'>('PENDING');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [schedulerStatus, setSchedulerStatus] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isUserAdmin = Boolean(
    currentUser && (isAdminEmail(currentUser.email) || isUserAdminRole(currentUser.role))
  );

  const loadData = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setAccessDenied(false);

      const res = await apiFetch('/admin/payments');
      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.payments)) {
        setPayments(json.payments);
      } else {
        setPayments([]);
      }

      // Fetch audit logs if available
      try {
        const auditRes = await apiFetch('/admin/audit-logs');
        if (auditRes.ok) {
          const auditJson = await auditRes.json();
          if (auditJson.success && Array.isArray(auditJson.auditLogs)) {
            setAuditLogs(auditJson.auditLogs);
          }
        }
      } catch {
        // Audit log non-critical
      }
    } catch (err: any) {
      console.error('Failed to load admin ledger:', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to connect to Bureau Ledger.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleVerify = async (paymentId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionInProgress(paymentId);
      const note = adminNotes[paymentId] || undefined;
      const res = await verifyAdminPayment({ paymentId, status, adminNote: note });
      setFeedbackMsg({
        type: 'success',
        text: res.message || `Payment ${status.toLowerCase()} successfully.`,
      });
      // Clear specific note
      setAdminNotes((prev) => {
        const next = { ...prev };
        delete next[paymentId];
        return next;
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error updating payment status.' });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleRunScheduler = async () => {
    try {
      setSchedulerStatus('Dispatching letters due for arrival...');
      const res = await triggerSchedulerTick();
      setSchedulerStatus(`Delivered ${res.deliveredCount} letters due for arrival.`);
      setTimeout(() => setSchedulerStatus(null), 4000);
    } catch (err: any) {
      setSchedulerStatus(`Scheduler error: ${err.message}`);
      setTimeout(() => setSchedulerStatus(null), 4000);
    }
  };

  // Unauthenticated State
  if (!currentUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#faf9f7]">
        <div className="max-w-md w-full bg-white border border-[#eae4da] shadow-paper p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 mx-auto flex items-center justify-center font-serif text-teal-900 text-lg">
            ❦
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl text-teal-950 font-normal">
              Bureau Administration
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-stone-500">
              AUTHENTICATION REQUIRED
            </p>
          </div>
          <p className="font-serif text-sm text-stone-600 leading-relaxed">
            Administrative bureau controls require signing in with an authorized administrator identity.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-2.5 bg-teal-900 hover:bg-teal-800 text-white font-sans text-xs uppercase tracking-wider rounded-xs cursor-pointer shadow-xs transition-colors"
              >
                Sign In to Bureau
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full py-2 bg-transparent text-stone-600 hover:text-stone-900 font-sans text-xs cursor-pointer"
            >
              Return to Correspondence
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Non-Admin (Access Restricted)
  if (accessDenied || !isUserAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#faf9f7]">
        <div className="max-w-lg w-full bg-white border border-rose-200/80 shadow-paper p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center text-rose-700 font-mono text-base">
            ⚿
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl text-stone-900 font-normal">
              Access Restricted
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-rose-700 font-medium">
              HTTP 403 — ADMINISTRATIVE PRIVILEGES REQUIRED
            </p>
          </div>
          <p className="font-serif text-sm text-stone-600 leading-relaxed">
            You are currently signed in as <strong className="font-mono text-stone-800">{currentUser.email}</strong>, which does not have Bureau Administrative privileges.
          </p>
          <div className="p-4 bg-stone-50 border border-stone-200/80 text-left text-xs font-mono text-stone-600 space-y-1">
            <div className="text-[10px] uppercase text-stone-400 font-semibold tracking-wider">Bureau Notice</div>
            <p>Payment verification and audit registers are strictly restricted to authorized Post Office Bureau administrators.</p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateHome}
              className="px-6 py-2.5 bg-teal-900 hover:bg-teal-800 text-white font-sans text-xs uppercase tracking-wider rounded-xs cursor-pointer shadow-xs transition-colors"
            >
              Return to Public Bureau
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredPayments = payments.filter((p) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'AUDIT') return true;
    return p.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#faf9f7] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white border border-[#eae4da] shadow-paper p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-teal-900 text-white flex items-center justify-center text-xs font-serif shadow-xs">
                ❦
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl text-teal-950 font-normal tracking-tight">
                ADMIN BUREAU — Postal Ledger Desk
              </h1>
            </div>
            <p className="font-mono text-xs text-stone-500 uppercase tracking-widest">
              Manual UPI Payment Verification · Audit Controls · Postal Dispatches
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs font-mono text-stone-600">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Authenticated Officer: <strong>{currentUser.email}</strong></span>
              <span className="text-stone-300">·</span>
              <span className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-200 rounded-xs uppercase text-[10px] font-semibold">
                ADMIN ROLE VERIFIED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRunScheduler}
              className="px-3.5 py-2 bg-white border border-stone-300 hover:border-teal-900 text-teal-900 text-xs font-mono rounded-xs transition-colors cursor-pointer shadow-2xs"
            >
              ⚡ Run Scheduler Tick
            </button>
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 bg-teal-900 hover:bg-teal-800 text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-xs"
            >
              Refresh Ledger ⟳
            </button>
          </div>
        </div>

        {/* Status Notices */}
        {schedulerStatus && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 text-xs font-mono rounded-xs animate-fade-in">
            {schedulerStatus}
          </div>
        )}
        {feedbackMsg && (
          <div
            className={`p-3 text-xs font-mono rounded-xs border animate-fade-in flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-stone-400 hover:text-stone-800 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Controls */}
        <div className="bg-white border border-[#eae4da] shadow-paper p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL', 'AUDIT'] as const).map((tab) => {
              const count =
                tab === 'AUDIT'
                  ? auditLogs.length
                  : tab === 'ALL'
                  ? payments.length
                  : payments.filter((p) => p.status === tab).length;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xs transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-teal-900 text-white font-medium shadow-xs'
                      : 'text-stone-600 hover:text-teal-900 hover:bg-stone-100'
                  }`}
                >
                  {tab === 'AUDIT' ? 'Audit Register' : tab} ({count})
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-stone-500 font-serif italic">
            {payments.filter((p) => p.status === 'PENDING').length} payment(s) awaiting verification
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white border border-[#eae4da] shadow-paper overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center space-y-3 font-mono text-xs text-stone-500 uppercase tracking-widest">
              <div className="animate-spin w-6 h-6 border-2 border-teal-900 border-t-transparent rounded-full mx-auto"></div>
              <p>Inspecting Bureau Ledger...</p>
            </div>
          ) : activeTab === 'AUDIT' ? (
            /* Audit Log View */
            <div className="divide-y divide-[#eae4da]">
              <div className="p-4 bg-stone-50 border-b border-[#eae4da] font-mono text-xs text-stone-600 flex items-center justify-between">
                <span>Administrative Actions & Payment Audit Trails</span>
                <span className="text-[10px] text-stone-400">Total Logs: {auditLogs.length}</span>
              </div>
              {auditLogs.length === 0 ? (
                <div className="py-16 text-center text-sm font-serif text-stone-500">
                  No administrative audit records logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#faf9f7] text-[10px] uppercase tracking-wider text-stone-500 border-b border-[#eae4da]">
                      <tr>
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-4">Action</th>
                        <th className="py-2.5 px-4">Admin Officer</th>
                        <th className="py-2.5 px-4">Entity ID</th>
                        <th className="py-2.5 px-4">Details / Metadata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {auditLogs.map((log) => (
                        <tr key={log._id || log.id} className="hover:bg-stone-50/60">
                          <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-teal-950">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 text-stone-700">
                            {log.adminId || 'System'}
                          </td>
                          <td className="py-3 px-4 text-stone-500 font-mono">
                            {log.paymentId || log.entityId || '—'}
                          </td>
                          <td className="py-3 px-4 text-stone-600 max-w-xs truncate">
                            {log.metadata ? JSON.stringify(log.metadata) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <span className="font-serif text-2xl text-stone-400">No {activeTab.toLowerCase()} payments found.</span>
              <p className="text-xs text-stone-500 font-sans max-w-md mx-auto">
                When senders enclose Voice Notes or Parlour rendezvous, their UPI reference and payment details will appear here for verification.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eae4da]">
              {filteredPayments.map((item) => {
                const noteInput = adminNotes[item.id] ?? '';

                return (
                  <div key={item.id} className="p-6 space-y-4 hover:bg-[#faf9f7]/40 transition-colors">
                    {/* Top Row: Amount, Feature, Status, Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-2xl text-teal-950 font-medium">
                          ₹{item.amount}
                        </span>
                        <span className="text-xs font-mono uppercase bg-stone-100 px-2.5 py-1 border border-stone-200 text-stone-800 rounded-xs">
                          {item.featureCode ? item.featureCode.replace('_', ' ') : (item.mediaType || 'ENCLOSURE')}
                        </span>
                        <span
                          className={`text-xs font-mono uppercase px-2.5 py-1 rounded-xs font-semibold ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-stone-500">
                        Submitted: {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-stone-50/70 p-3.5 border border-stone-200/70 text-xs font-mono">
                      <div>
                        <span className="text-[10px] uppercase text-stone-400 block">UTR / Transaction ID</span>
                        <strong className="text-stone-900 select-all">{item.upiReference}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-stone-400 block">Payment ID</span>
                        <span className="text-teal-900 font-semibold select-all">{item.paymentId || item.id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-stone-400 block">Sender Email</span>
                        <span className="text-stone-700 truncate block select-all">{item.userEmail || item.senderEmail || item.userId || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-stone-400 block">Recipient</span>
                        <span className="text-stone-700 truncate block select-all">{item.recipientEmail || item.recipientName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-stone-400 block">Media Type</span>
                        <span className="text-stone-900 font-medium">{item.mediaType || (item.featureCode?.includes('VIDEO') ? 'VIDEO' : 'VOICE')}</span>
                      </div>
                    </div>

                    {/* Media Preview & Playback Player */}
                    {item.mediaStorageKey || item.hasMediaAttachment ? (
                      <div className="p-4 bg-stone-100/80 border border-stone-300/80 rounded-xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-teal-950 font-semibold uppercase tracking-wider flex items-center gap-2">
                            <span>{item.mediaType === 'VIDEO' ? '🎥' : '🎙️'}</span>
                            <span>PERSONAL MESSAGE PREVIEW ({item.mediaType || 'AUDIO'})</span>
                          </span>
                          <span className="text-[11px] font-mono text-stone-500">
                            VAULT KEY: {item.mediaStorageKey}
                          </span>
                        </div>
                        {item.mediaType === 'VIDEO' ? (
                          <video
                            src={`/api/admin/media/${item.mediaStorageKey}`}
                            controls
                            playsInline
                            className="w-full max-w-md max-h-56 rounded-xs bg-black"
                          />
                        ) : (
                          <audio
                            src={`/api/admin/media/${item.mediaStorageKey}`}
                            controls
                            className="w-full"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-stone-400 italic">
                        No audio/video recording attached
                      </div>
                    )}

                    {/* Screenshots & Verification Information */}
                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                      {item.paymentScreenshotPath ? (
                        <div className="flex items-center gap-2">
                          <span className="text-stone-500">Payment Screenshot:</span>
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshot(item.paymentScreenshotPath || null)}
                            className="px-2 py-1 bg-white border border-teal-900/30 text-teal-900 rounded-xs hover:bg-teal-50 cursor-pointer"
                          >
                            View Screenshot ↗
                          </button>
                        </div>
                      ) : null}

                      {item.verifiedBy && (
                        <div className="text-stone-600">
                          Verified by: <strong className="text-teal-950">{item.verifiedBy}</strong> on{' '}
                          {item.verifiedAt ? new Date(item.verifiedAt).toLocaleString() : '—'}
                        </div>
                      )}
                    </div>

                    {/* Verification Note (Saved or Input) */}
                    {item.adminNote && (
                      <div className="p-3 bg-stone-100/70 border border-stone-200 text-xs font-mono text-stone-700">
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 block mb-0.5">
                          Verification Note
                        </span>
                        {item.adminNote}
                      </div>
                    )}

                    {/* Action Controls for Pending Payments */}
                    {item.status === 'PENDING' && (
                      <div className="pt-2 border-t border-stone-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Verification note (optional, e.g. UTR confirmed via bank ledger)..."
                            value={noteInput}
                            onChange={(e) =>
                              setAdminNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-full text-xs font-mono px-3 py-2 border border-stone-300 rounded-xs bg-white focus:outline-none focus:border-teal-900"
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={actionInProgress === item.id}
                            onClick={() => handleVerify(item.id, 'APPROVED')}
                            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-xs"
                          >
                            Approve & Confirm
                          </button>
                          <button
                            type="button"
                            disabled={actionInProgress === item.id}
                            onClick={() => handleVerify(item.id, 'REJECTED')}
                            className="px-3.5 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 text-xs font-mono uppercase rounded-xs transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal Viewer */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-4 max-w-xl w-full border border-stone-300 shadow-2xl rounded-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-stone-600">
                Payment Screenshot
              </span>
              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="text-stone-400 hover:text-stone-900 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-stone-100 p-2">
              <img
                src={selectedScreenshot}
                alt="Payment proof screenshot"
                className="max-h-[65vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardView;
