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
  const [activePreset, setActivePreset] = useState<'24h' | '48h' | '7d' | '30d' | 'custom'>('48h');
  const [customDateInput, setCustomDateInput] = useState('');

  // Current post date reference
  const postDate = new Date();

  // Helper to format date in luxurious editorial style (e.g. October 1, 2026 · 18:00)
  const formatEditorialDate = (dateObj: Date) => {
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePresetSelect = (preset: '24h' | '48h' | '7d' | '30d') => {
    setActivePreset(preset);
    const now = new Date();
    let hours = 48;
    if (preset === '24h') hours = 24;
    if (preset === '48h') hours = 48;
    if (preset === '7d') hours = 168;
    if (preset === '30d') hours = 720;

    const arrival = new Date(now.getTime() + hours * 60 * 60 * 1000);
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
      const now = new Date();
      const diffMs = Math.max(1000 * 60 * 60, selected.getTime() - now.getTime());
      const hours = Math.round(diffMs / (1000 * 60 * 60));
      onChange({
        waitingHours: hours,
        scheduledDeliveryAt: selected.toISOString(),
      });
    }
  };

  // Derive arrival date from state
  const arrivalDateObj = scheduledDeliveryAt ? new Date(scheduledDeliveryAt) : new Date(Date.now() + 48 * 3600 * 1000);

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-mono text-[#dec183] mb-1">
            STEP 05 OF 06 · ANTICIPATION
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-stone-100 font-light">
            Choose Delivery Passage
          </h2>
        </div>
        <div className="text-xs font-mono text-stone-500">
          DELIVERY SCHEDULING IS ALWAYS FREE
        </div>
      </div>

      {/* Main Delivery Journey Card */}
      <div className="p-8 bg-[#121618] border border-stone-800 rounded-xs space-y-8">
        {/* Core Timeline Visual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center border-b border-stone-800/80 pb-8">
          {/* Posted Block */}
          <div className="space-y-1 border-l-2 border-stone-700 pl-4">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
              POSTED IN TRANSIT
            </span>
            <div className="font-serif text-2xl text-stone-200">
              {formatEditorialDate(postDate)}
            </div>
            <div className="text-xs text-stone-500 font-mono">Today · Immediate Seal</div>
          </div>

          {/* Arrives Block */}
          <div className="space-y-1 border-l-2 border-[#c5a059] pl-4">
            <span className="text-[11px] font-mono text-[#dec183] uppercase tracking-wider">
              EXPECTED ARRIVAL
            </span>
            <div className="font-serif text-2xl text-[#dec183]">
              {formatEditorialDate(arrivalDateObj)}
            </div>
            <div className="text-xs text-stone-400 font-mono">
              Waiting Duration: {waitingHours >= 24 ? `${Math.round(waitingHours / 24)} Days (${waitingHours} hrs)` : `${waitingHours} hrs`}
            </div>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="space-y-3">
          <label className="block text-xs font-mono text-stone-400 uppercase tracking-wider">
            Select Transit Duration
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handlePresetSelect('24h')}
              className={`p-4 text-left border rounded-xs transition-all cursor-pointer ${
                activePreset === '24h'
                  ? 'bg-stone-900 border-[#c5a059] text-stone-100 shadow-sm'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="text-xs font-mono text-[#c5a059]">24 HOURS</div>
              <div className="font-serif text-lg text-stone-200">Express</div>
              <div className="text-[11px] text-stone-500">Tomorrow</div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('48h')}
              className={`p-4 text-left border rounded-xs transition-all cursor-pointer relative ${
                activePreset === '48h'
                  ? 'bg-stone-900 border-[#c5a059] text-stone-100 ring-1 ring-[#c5a059]/40'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <span className="absolute top-2 right-2 text-[8px] font-mono bg-[#c5a059]/20 text-[#dec183] px-1.5 py-0.5 rounded-xs">
                CLASSIC
              </span>
              <div className="text-xs font-mono text-[#dec183]">48 HOURS</div>
              <div className="font-serif text-lg text-stone-200">Standard Post</div>
              <div className="text-[11px] text-stone-400">Default Passage</div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('7d')}
              className={`p-4 text-left border rounded-xs transition-all cursor-pointer ${
                activePreset === '7d'
                  ? 'bg-stone-900 border-[#c5a059] text-stone-100 shadow-sm'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="text-xs font-mono text-[#c5a059]">7 DAYS</div>
              <div className="font-serif text-lg text-stone-200">Reflective</div>
              <div className="text-[11px] text-stone-500">Next Week</div>
            </button>

            <button
              type="button"
              onClick={() => handlePresetSelect('30d')}
              className={`p-4 text-left border rounded-xs transition-all cursor-pointer ${
                activePreset === '30d'
                  ? 'bg-stone-900 border-[#c5a059] text-stone-100 shadow-sm'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="text-xs font-mono text-[#c5a059]">1 MONTH</div>
              <div className="font-serif text-lg text-stone-200">The Long Wait</div>
              <div className="text-[11px] text-stone-500">Next Month</div>
            </button>
          </div>
        </div>

        {/* Custom Specific Date Picker */}
        <div className="pt-2 border-t border-stone-800/60">
          <label className="block text-xs font-mono text-stone-400 uppercase tracking-wider mb-2">
            Or Choose A Specific Future Date (Time Capsule)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="date"
              value={customDateInput}
              min={new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0]}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              className="bg-stone-950 border border-stone-700 focus:border-[#c5a059] px-4 py-2.5 text-stone-100 text-sm focus:outline-none flex-1"
            />
            {activePreset === 'custom' && (
              <span className="text-xs font-mono text-[#dec183] self-center">
                Custom date locked
              </span>
            )}
          </div>
          <span className="text-[11px] text-stone-500 mt-1.5 block">
            Ideal for birthdays, wedding anniversaries, or letters penned to be opened on New Year's Eve.
          </span>
        </div>

        {/* Soulful Editorial Reflection */}
        <div className="p-4 bg-stone-950/70 border border-stone-800 text-center font-serif italic text-stone-300 text-base">
          "Some things are worth waiting for."
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-stone-800">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 border border-stone-700 text-stone-300 hover:text-stone-100 text-xs font-sans rounded-sm transition-colors cursor-pointer"
        >
          ← Back to Recipient
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="px-7 py-3 bg-[#c5a059] hover:bg-[#dec183] text-stone-950 font-sans font-medium text-xs tracking-wider rounded-sm transition-all duration-200 cursor-pointer shadow-md"
        >
          Review & Seal Letter →
        </button>
      </div>
    </div>
  );
};
