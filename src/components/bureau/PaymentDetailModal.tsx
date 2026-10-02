import React from 'react';
import { BureauPaymentItem } from '../../types/backend';

interface PaymentDetailModalProps {
  isOpen: boolean;
  payment: BureauPaymentItem | null;
  onClose: () => void;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  isOpen,
  payment,
  onClose,
}) => {
  if (!isOpen || !payment) return null;

  const formattedDate = new Date(payment.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#faf9f7] rounded-xl shadow-2xl overflow-hidden border border-[#eae4da] my-8 font-serif">
        {/* Receipt Header */}
        <div className="p-6 border-b border-[#eae4da] bg-stone-50/70 flex items-center justify-between">
          <div>
            <span className="font-serif tracking-[0.2em] text-sm text-teal-900 font-medium">
              BUREAU DISPATCH RECEIPT
            </span>
            <span className="block text-[10px] tracking-widest uppercase text-stone-500 font-sans mt-0.5 font-mono">
              Ref · {payment.paymentId}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-widest font-sans text-stone-400 hover:text-stone-800 transition-colors p-1 cursor-pointer"
          >
            [✕]
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6 space-y-5 font-sans text-sm text-stone-800">
          {/* Amount Badge */}
          <div className="text-center py-4 bg-white rounded-lg border border-[#eae4da]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block">
              Dispatched Amount
            </span>
            <h3 className="font-serif text-3xl font-medium text-teal-950 mt-1">
              ₹{payment.amount} <span className="text-sm font-sans text-stone-500">{payment.currency}</span>
            </h3>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase border">
              {payment.status === 'APPROVED' ? (
                <span className="text-emerald-700 bg-emerald-50 border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Verified & Paid
                </span>
              ) : payment.status === 'PENDING' ? (
                <span className="text-amber-800 bg-amber-50 border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Awaiting Postal Verification
                </span>
              ) : payment.status === 'REFUNDED' ? (
                <span className="text-purple-800 bg-purple-50 border-purple-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  Refunded
                </span>
              ) : (
                <span className="text-red-700 bg-red-50 border-red-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  Rejected / Failed
                </span>
              )}
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-3 bg-white p-4 rounded-lg border border-[#eae4da] text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Service / Feature</span>
              <span className="font-medium text-stone-900 text-right">{payment.description}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Letter Reference</span>
              <span className="font-mono font-medium text-teal-900">{payment.trackingCode || 'OL-BUREAU'}</span>
            </div>

            {payment.recipientName && (
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Intended Recipient</span>
                <span className="font-medium text-stone-900">{payment.recipientName}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Payment Gateway / Method</span>
              <span className="font-medium text-stone-900">Direct UPI Post Transfer</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">UPI Transaction ID / UTR</span>
              <span className="font-mono font-semibold text-stone-800 select-all">{payment.upiReference}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Transaction Timestamp</span>
              <span className="text-stone-700">{formattedDate}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-stone-500">Refund Eligibility</span>
              <span className="text-stone-600 font-mono">Non-refundable upon transit post</span>
            </div>
          </div>

          {payment.adminNote && (
            <div className="p-3 bg-amber-50/80 rounded border border-amber-200 text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-900 block font-semibold">
                Bureau Desk Note
              </span>
              <p className="text-amber-950 font-serif italic">{payment.adminNote}</p>
            </div>
          )}

          {/* Privacy & Security Guarantee */}
          <div className="p-3.5 bg-stone-100/70 rounded border border-stone-200 text-[11px] text-stone-600 space-y-1">
            <span className="font-mono uppercase text-[9px] tracking-wider text-stone-500 block font-semibold">
              🔒 Bureau Payment Security Guarantee
            </span>
            <p className="leading-relaxed">
              OLD-LETTERS uses manual UPI and bank-grade verification. We never store credit card numbers, CVVs, or payment gateway private credentials. Only cryptographic transaction hashes and safe postal verification metadata are retained in trust.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-sm bg-teal-900 py-2.5 text-xs uppercase tracking-wider font-medium text-white hover:bg-teal-800 transition-colors cursor-pointer"
          >
            Dismiss Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
