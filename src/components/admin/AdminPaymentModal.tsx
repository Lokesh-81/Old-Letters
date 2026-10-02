import React, { useState, useEffect } from 'react';
import { fetchAdminPayments, verifyAdminPayment, triggerSchedulerTick } from '../../lib/api';
import { PaymentRecord } from '../../types/backend';

interface AdminPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentUpdated?: () => void;
}

export const AdminPaymentModal: React.FC<AdminPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentUpdated,
}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<string | null>(null);

  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAdminPayments();
      setPayments(data);
    } catch (err) {
      console.error('Failed to load admin payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPayments();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (paymentId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionInProgress(paymentId);
      const note = adminNotes[paymentId] || undefined;
      await verifyAdminPayment({ paymentId, status, adminNote: note });
      setAdminNotes((prev) => {
        const next = { ...prev };
        delete next[paymentId];
        return next;
      });
      await loadPayments();
      onPaymentUpdated?.();
    } catch (err: any) {
      alert(`Error updating payment: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRunScheduler = async () => {
    try {
      setSchedulerStatus('Running delivery checks...');
      const res = await triggerSchedulerTick();
      setSchedulerStatus(`Delivered ${res.deliveredCount} letters due for arrival.`);
      setTimeout(() => setSchedulerStatus(null), 3500);
    } catch (err: any) {
      setSchedulerStatus(`Error: ${err.message}`);
    }
  };

  const filtered = payments.filter((p) => {
    if (activeTab === 'ALL') return true;
    return p.status === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-white border border-[#eae4da] shadow-paper-lg rounded-xs overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
        {/* Header */}
        <div className="bg-[#faf9f7] px-6 py-4 border-b border-[#eae4da] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-900 text-white flex items-center justify-center text-xs font-serif">
              ❦
            </span>
            <div>
              <h2 className="font-serif text-lg text-teal-950 font-normal">
                Post Office Bureau — Administration
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
                MANUAL UPI PAYMENT VERIFICATION & DISPATCH
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-800 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Action Controls & Tabs */}
        <div className="px-6 py-3 border-b border-[#eae4da] flex flex-wrap items-center justify-between gap-4 bg-stone-50 text-xs font-mono">
          <div className="flex items-center gap-2">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-teal-900 text-white font-medium'
                    : 'text-stone-600 hover:text-teal-900 hover:bg-stone-200/50'
                }`}
              >
                {tab} ({payments.filter((p) => tab === 'ALL' || p.status === tab).length})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {schedulerStatus && (
              <span className="text-[11px] text-teal-800 italic font-serif animate-pulse">
                {schedulerStatus}
              </span>
            )}
            <button
              type="button"
              onClick={handleRunScheduler}
              className="px-3 py-1.5 bg-white border border-stone-300 hover:border-teal-900 text-teal-900 text-xs font-mono rounded-xs transition-colors cursor-pointer shadow-2xs"
            >
              ⚡ Run Scheduler Tick
            </button>
          </div>
        </div>

        {/* Payments List */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-[#eae4da]">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-mono text-stone-400 uppercase tracking-widest">
              Checking Bureau Ledger...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <span className="font-serif text-xl text-stone-400">No {activeTab.toLowerCase()} payments found.</span>
              <p className="text-xs text-stone-500 font-sans">
                When senders enclose Voice Notes or Parlour rendezvous, their UPI reference will appear here for verification.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-serif text-lg text-teal-950 font-medium">
                      ₹{item.amount}
                    </span>
                    <span className="text-[11px] font-mono uppercase bg-[#faf9f7] px-2 py-0.5 border border-stone-200 text-stone-700 rounded-xs">
                      {item.featureCode.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-stone-600 flex flex-wrap items-center gap-3">
                    <span>UTR / Ref: <strong>{item.upiReference}</strong></span>
                    <span>·</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    {item.userId && (
                      <>
                        <span>·</span>
                        <span className="text-stone-400">User: {item.userId}</span>
                      </>
                    )}
                    {item.letterId && (
                      <>
                        <span>·</span>
                        <span className="text-stone-400">Letter: {item.letterId}</span>
                      </>
                    )}
                  </div>

                  {item.adminNote && (
                    <div className="text-[11px] font-mono text-stone-500 bg-stone-50 p-1.5 border border-stone-200 rounded-xs">
                      Note: {item.adminNote}
                    </div>
                  )}

                  {item.status === 'PENDING' && (
                    <input
                      type="text"
                      placeholder="Verification note (optional)..."
                      value={adminNotes[item.id] || ''}
                      onChange={(e) =>
                        setAdminNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="w-full text-xs font-mono px-2.5 py-1.5 border border-stone-200 rounded-xs bg-[#faf9f7] focus:outline-none focus:border-teal-900 mt-1"
                    />
                  )}
                </div>

                {/* Actions */}
                {item.status === 'PENDING' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={actionInProgress === item.id}
                      onClick={() => handleVerify(item.id, 'APPROVED')}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors cursor-pointer shadow-xs"
                    >
                      Approve & Confirm
                    </button>
                    <button
                      type="button"
                      disabled={actionInProgress === item.id}
                      onClick={() => handleVerify(item.id, 'REJECTED')}
                      className="px-3 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-mono uppercase rounded-xs transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#faf9f7] px-6 py-3 border-t border-[#eae4da] text-[11px] font-mono text-stone-500 flex items-center justify-between">
          <span>Manual UPI payments remain PENDING until explicitly verified.</span>
          <button
            type="button"
            onClick={loadPayments}
            className="text-teal-900 hover:underline cursor-pointer"
          >
            Refresh Ledger ⟳
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentModal;
