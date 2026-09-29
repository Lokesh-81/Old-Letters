import React, { useState } from 'react';

interface DeliveryDateStepProps {
  scheduledDeliveryAt: string;
  waitingHours: number;
  onChange: (fields: { scheduledDeliveryAt: string; waitingHours: number }) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const DeliveryDateStep: React.FC<DeliveryDateStepProps> = ({
  scheduledDeliveryAt,
  waitingHours,
  onChange,
  onContinue,
  onBack,
}) => {
  const [activePreset, setActivePreset] = useState<'48h' | '7d' | '30d' | 'custom'>('48h');
  const [customDateInput, setCustomDateInput] = useState('');

  const postDate = new Date();

  const formatEditorialDate = (dateObj: Date) => {
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePresetSelect = (preset: '48h' | '7d' | '30d') => {
    setActivePreset(preset);
    const now = Date.now();
    let hours = 48;
    if (preset === '48h') hours = 48;
    if (preset === '7d') hours = 168;
    if (preset === '30d') hours = 720;

    const arrival = new Date(now + hours * 3600 * 1000);
    onChange({
      waitingHours: hours,
      scheduledDeliveryAt: arrival.toISOString(),
    });
  };

  const handleCustomDateChange = (val: string) => {
    setCustomDateInput(val);
    setActivePreset('custom');
    if (val) {
      const selected = new Date(val);
      const now = Date.now();
      const minMs = now + 48 * 3600 * 1000;
      const finalMs = Math.max(minMs, selected.getTime());
      const hours = Math.round((finalMs - now) / (3600 * 1000));
      onChange({
        waitingHours: hours,
        scheduledDeliveryAt: new Date(finalMs).toISOString(),
      });
    }
  };

  const arrivalDateObj = scheduledDeliveryAt
    ? new Date(scheduledDeliveryAt)
    : new Date(Date.now() + 48 * 3600 * 1000);

  const getRestrainedLanguage = () => {
    if (waitingHours <= 48) return '48 hours in transit';
    if (waitingHours <= 168) return '7 days in transit';
    if (waitingHours <= 720) return '30 days of waiting';
    const days = Math.round(waitingHours / 24);
    return `${days} days in transit`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6 text-teal-900 select-none">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#eae4da] pb-6 gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-mono text-stone-500 mb-1">
            DELIVERY PASSAGE · TRANSIT
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-teal-950 font-light">
            Choose Delivery Tempo
          </h2>
        </div>
        <div className="text-xs font-mono text-stone-400">
          FREE ARCHIVAL DISPATCH
        </div>
      </div>

      {/* Main Delivery Journey Card (Warm Ivory light card) */}
      <div className="p-8 bg-white border border-[#eae4da] shadow-[0_4px_16px_rgba(0,0,0,0.03)] rounded-xs space-y-8">
        {/* Core Timeline Visual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center border-b border-stone-100 pb-6">
          {/* Posted Block */}
          <div className="space-y-1 border-l-2 border-stone-300 pl-4">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
              POSTED TODAY
            </span>
            <div className="font-serif text-2xl text-stone-800">
              {formatEditorialDate(postDate)}
            </div>
            <div className="text-xs text-stone-500 font-mono">Immediate wax sealing</div>
          </div>

          {/* Arrives Block */}
          <div className="space-y-1 border-l-2 border-teal-800 pl-4">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
              APPOINTED ARRIVAL
            </span>
            <div className="font-serif text-2xl text-teal-950 font-medium">
              {formatEditorialDate(arrivalDateObj)}
            </div>
            <div className="text-xs text-teal-800 font-mono">
              {getRestrainedLanguage()} · Arrives {formatEditorialDate(arrivalDateObj)}
            </div>
          </div>
        </div>

        {/* Postal Options (Styled as postal choices, no prices) */}
        <div className="space-y-3">
          <label className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider">
            Select Postal Passage (Min. 48 Hours)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handlePresetSelect('48h')}
              className={`p-4 text-left border rounded-xs transition-all cursor-pointer ${
                activePreset === '48h'
                  ? 'bg-white border-[#141618] text-stone-900 shadow-sm'
                  : 'bg-[#faf8f5] border-[#eae4da] text-stone-600 hover:bg-white'
              }`}
            >
              <div className="text-[11px] font-mono tracking-widest uppercase text-stone-500 font-semibold mb-0.5">
                48 HOURS
              </div>
              <div className="font-serif text-lg text-teal-950 font-normal">
                STANDARD POST
              </div>
              <div className="text-[11px] text-stone-500 font-sans mt-2 pt-2 border-t border-stone-100">
                Default passage of patient correspondence
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('7d')}
              className={`p-4 text-left border rounded-xs transition-all cursor-pointer ${
                activePreset === '7d'
                  ? 'bg-white border-[#141618] text-stone-900 shadow-sm'
                  : 'bg-[#faf8f5] border-[#eae4da] text-stone-600 hover:bg-white'
              }`}
            >
              <div className="text-[11px] font-mono tracking-widest uppercase text-stone-500 font-semibold mb-0.5">
                7 DAYS
              </div>
              <div className="font-serif text-lg text-teal-950 font-normal">
                REFLECTIVE POST
              </div>
              <div className="text-[11px] text-stone-500 font-sans mt-2 pt-2 border-t border-stone-100">
                A quiet week for words to deepen
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('30d')}
              className={`p-4 text-left border rounded-xs transition-all cursor-pointer ${
                activePreset === '30d'
                  ? 'bg-white border-[#141618] text-stone-900 shadow-sm'
                  : 'bg-[#faf8f5] border-[#eae4da] text-stone-600 hover:bg-white'
              }`}
            >
              <div className="text-[11px] font-mono tracking-widest uppercase text-stone-500 font-semibold mb-0.5">
                30 DAYS
              </div>
              <div className="font-serif text-lg text-teal-950 font-normal">
                MEMORIAL POST
              </div>
              <div className="text-[11px] text-stone-500 font-sans mt-2 pt-2 border-t border-stone-100">
                A full month across the distance
              </div>
            </button>
          </div>
        </div>

        {/* Custom Date Picker (Minimum 48 hours enforced) */}
        <div className="pt-2 border-t border-[#eae4da]">
          <label className="block text-[11px] font-mono text-stone-600 uppercase tracking-wider mb-2">
            CUSTOM · CHOOSE YOUR DATE (MINIMUM 48 HOURS)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="date"
              value={customDateInput}
              min={new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0]}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              className="bg-[#faf9f7] border border-stone-300 focus:border-teal-900 p-2.5 text-xs font-mono text-stone-900 rounded-xs flex-1 outline-none"
            />
          </div>
          <span className="text-[10px] font-mono text-stone-400 mt-1.5 block">
            Letters cannot be dispatched in the past or under 48 hours.
          </span>
        </div>

        {/* Editorial Reflection */}
        <div className="p-4 bg-[#faf9f7] border border-[#eae4da] text-center font-serif italic text-stone-600 text-base rounded-xs">
          "Some things are worth waiting for."
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-[#eae4da]">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-mono text-stone-500 hover:text-stone-900 cursor-pointer"
        >
          ← Back to Recipient
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="px-7 py-3 bg-teal-900 hover:bg-teal-800 text-white font-sans font-medium text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] active:scale-[0.96]"
        >
          Review & Seal Letter →
        </button>
      </div>
    </div>
  );
};
