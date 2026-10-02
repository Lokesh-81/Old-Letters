import React from 'react';
import { Letter } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';

interface LetterDetailModalProps {
  isOpen: boolean;
  letter: Letter | null;
  onClose: () => void;
  onOpenRecipientMode?: (letter: Letter) => void;
}

export const LetterDetailModal: React.FC<LetterDetailModalProps> = ({
  isOpen,
  letter,
  onClose,
  onOpenRecipientMode,
}) => {
  if (!isOpen || !letter) return null;

  const template = TEMPLATES.find((t) => t.id === letter.templateId) || TEMPLATES[0];

  // Derive real lifecycle timestamps from MongoDB document fields
  const createdAtDate = letter.createdAt ? new Date(letter.createdAt) : new Date(letter.postedAt || Date.now());
  const postedAtDate = letter.postedAt ? new Date(letter.postedAt) : createdAtDate;
  const deliveryDate = letter.scheduledDeliveryAt
    ? new Date(letter.scheduledDeliveryAt)
    : new Date(postedAtDate.getTime() + (letter.waitingHours || 48) * 3600 * 1000);
  const deliveredAtDate = letter.deliveredAt ? new Date(letter.deliveredAt) : undefined;

  const now = Date.now();
  const isDelivered = letter.status === 'DELIVERED' || letter.status === 'OPENED' || (now >= deliveryDate.getTime() && letter.status !== 'DRAFT' && (letter.status as string) !== 'CANCELLED');
  const isArriving = isDelivered || now >= deliveryDate.getTime() - 24 * 3600 * 1000;
  const isInTransit = letter.status === 'IN TRANSIT' || (letter.status as string) === 'IN_TRANSIT' || isDelivered || (letter.status === 'SCHEDULED' && now >= postedAtDate.getTime());
  const isDispatched = letter.status !== 'DRAFT';
  const isSealed = letter.status !== 'DRAFT';

  // Use timeline if provided by backend, else construct exact MongoDB lifecycle
  const timelineSteps = (letter as any).timeline || [
    {
      step: 'WRITTEN',
      label: 'Written',
      timestamp: createdAtDate.toISOString(),
      completed: true,
      current: letter.status === 'DRAFT',
    },
    {
      step: 'SEALED',
      label: 'Sealed',
      timestamp: isSealed ? postedAtDate.toISOString() : undefined,
      completed: isSealed,
      current: isSealed && !isInTransit,
    },
    {
      step: 'DISPATCHED',
      label: 'Dispatched',
      timestamp: isDispatched ? postedAtDate.toISOString() : undefined,
      completed: isDispatched,
      current: isDispatched && isInTransit && !isArriving,
    },
    {
      step: 'IN_TRANSIT',
      label: 'In Transit',
      timestamp: isInTransit ? postedAtDate.toISOString() : undefined,
      completed: isInTransit,
      current: isInTransit && !isArriving && !isDelivered,
    },
    {
      step: 'ARRIVING',
      label: 'Arriving',
      timestamp: isArriving ? new Date(deliveryDate.getTime() - 24 * 3600 * 1000).toISOString() : undefined,
      completed: isArriving,
      current: isArriving && !isDelivered,
    },
    {
      step: 'DELIVERED',
      label: 'Delivered',
      timestamp: isDelivered ? (deliveredAtDate ? deliveredAtDate.toISOString() : deliveryDate.toISOString()) : undefined,
      completed: isDelivered,
      current: isDelivered,
    },
  ];

  const paymentStatus = (letter as any).paymentStatus || 'COMPLIMENTARY';
  const amountPaid = (letter as any).amountPaid;
  const currency = (letter as any).currency || 'INR';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#faf9f7] rounded-xl shadow-2xl overflow-hidden border border-[#eae4da] my-8 flex flex-col max-h-[92vh]">
        {/* Postal Header Bar */}
        <div className="px-6 py-4 border-b border-[#eae4da] bg-[#f4efe8]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-800 shrink-0"></span>
            <div>
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-stone-500 block">
                CORRESPONDENCE RECORD · DISPATCH {letter.trackingCode}
              </span>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                {letter.type} Letter · To {letter.recipientName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono uppercase tracking-widest text-stone-500 hover:text-stone-900 px-2 py-1 rounded transition-colors cursor-pointer"
          >
            [Close ✕]
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8 font-sans text-stone-800">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-4 rounded-lg border border-[#eae4da]">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">
                Recipient
              </span>
              <span className="font-medium text-stone-900 mt-0.5 block truncate">
                {letter.recipientName}
              </span>
              <span className="text-[10px] text-stone-500 truncate block">
                {(letter as any).recipientEmailMasked || letter.recipientEmail}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">
                Occasion / Type
              </span>
              <span className="font-medium text-teal-900 mt-0.5 block">
                {letter.type}
              </span>
              <span className="text-[10px] text-stone-500 block">
                {template.name} Stationery
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">
                Dispatch Date
              </span>
              <span className="font-medium text-stone-900 mt-0.5 block">
                {postedAtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[10px] font-mono text-stone-400 block">
                {postedAtDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">
                Scheduled Delivery
              </span>
              <span className="font-medium text-teal-950 mt-0.5 block">
                {deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[10px] font-mono text-stone-500 block">
                {isDelivered ? 'Arrived & Kept in Trust' : 'In Transit (48h min)'}
              </span>
            </div>
          </div>

          {/* Delivery Lifecycle Timeline */}
          <div className="bg-[#fcfbf9] border border-[#eae4da] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#eae4da]/70 pb-3">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-teal-900 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                Official Postal Delivery Lifecycle
              </span>
              <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                isDelivered
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isDelivered ? 'Delivered' : 'In Transit'}
              </span>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-1 pt-2">
              {timelineSteps.map((stepItem: any, idx: number) => {
                const isStepCompleted = stepItem.completed;
                const isStepCurrent = stepItem.current;
                return (
                  <div key={stepItem.step} className="flex flex-col items-center text-center p-2 rounded relative">
                    {/* Circle */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-medium transition-all ${
                        isStepCompleted
                          ? 'bg-teal-900 text-amber-100 shadow-xs ring-2 ring-teal-800/30'
                          : isStepCurrent
                          ? 'bg-amber-500 text-white animate-pulse ring-2 ring-amber-400/50'
                          : 'bg-stone-200 text-stone-400'
                      }`}
                    >
                      {isStepCompleted ? '✓' : idx + 1}
                    </div>

                    {/* Step Label */}
                    <span className={`text-[11px] font-medium tracking-wide mt-2 font-serif ${
                      isStepCompleted ? 'text-teal-950 font-semibold' : 'text-stone-400'
                    }`}>
                      {stepItem.label}
                    </span>

                    {/* Date subtitle if available */}
                    {stepItem.timestamp && isStepCompleted && (
                      <span className="text-[9px] font-mono text-stone-500 mt-0.5 leading-tight">
                        {new Date(stepItem.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Letter Parchment Preview */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-500 block">
              Dispatched Epistolary Parchment
            </span>
            <div
              className="p-8 sm:p-10 rounded-lg shadow-sm border border-[#eae4da] relative overflow-hidden"
              style={{
                backgroundColor: template.paperBackground || '#fcfbf7',
                color: template.paperForeground || '#1c1917',
              }}
            >
              {/* Postmark stamp watermark */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 border-2 border-teal-900/30 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex flex-col items-center justify-center text-center rotate-12 pointer-events-none select-none">
                <span className="text-[8px] font-mono uppercase tracking-widest text-teal-900/70 font-semibold">
                  {letter.postmarkCity || 'HYDERABAD BUREAU'}
                </span>
                <span className="text-[10px] font-serif font-bold text-teal-900/80">
                  {postedAtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-[7px] font-mono text-teal-900/60 tracking-wider">
                  POSTAL TRUST
                </span>
              </div>

              {/* Salutation Greeting */}
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-stone-900 mb-6 italic">
                {letter.greeting || `Dearest ${letter.recipientName},`}
              </h3>

              {/* Body */}
              <div className="font-serif text-base sm:text-lg leading-relaxed text-stone-800 whitespace-pre-wrap max-w-xl pb-6">
                {letter.content}
              </div>

              {/* Signoff */}
              <div className="pt-4 border-t border-stone-300/40">
                <p className="font-serif italic text-stone-600 text-sm">{letter.signoff || 'Yours in correspondence,'}</p>
                <p className="font-serif text-base font-medium text-stone-900 mt-1">{letter.senderName}</p>
              </div>

              {/* Wax Seal Marker */}
              <div className="mt-8 flex items-center justify-between text-xs text-stone-500 pt-4 border-t border-stone-200/60 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-800/80 inline-block shadow-xs"></span>
                  Official Postal Seal Applied
                </span>
                <span>Ref: #{letter.trackingCode}</span>
              </div>
            </div>
          </div>

          {/* Payment & Security Metadata */}
          <div className="bg-stone-50 rounded-lg p-4 border border-[#eae4da] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block">
                Bureau Transaction Status
              </span>
              <p className="text-stone-700">
                Dispatch Fee: <strong className="text-stone-900">{amountPaid ? `₹${amountPaid} ${currency}` : 'Standard Bureau Post (Complimentary)'}</strong>
                {paymentStatus && (
                  <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-stone-200/80 text-stone-700">
                    Status: {paymentStatus}
                  </span>
                )}
              </p>
              {(letter as any).upiReference && (
                <p className="text-[10px] font-mono text-stone-500">
                  UPI UTR: {(letter as any).upiReference}
                </p>
              )}
            </div>

            {onOpenRecipientMode && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecipientMode(letter);
                }}
                className="rounded-sm bg-teal-900 px-4 py-2 text-xs uppercase tracking-wider font-medium text-white hover:bg-teal-800 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
              >
                Inspect Delivery Desk →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
