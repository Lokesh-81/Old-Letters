import { useState, useId } from 'react';
import { LetterData } from '../types';
import { STATIONERY_TEMPLATES } from '../data/mockData';
import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { motion } from 'motion/react';
import {
  Calendar,
  Clock,
  Send,
  ShieldCheck,
  Lock,
  ArrowRight,
  Bookmark,
  Sliders,
} from 'lucide-react';

interface DeliverySchedulerProps {
  letterData: LetterData;
  onChangeLetter: (data: Partial<LetterData>) => void;
  onPostLetter: () => void;
  onSaveDraft: () => void;
  onBack: () => void;
}

export function DeliveryScheduler({
  letterData,
  onChangeLetter,
  onPostLetter,
  onSaveDraft,
  onBack,
}: DeliverySchedulerProps) {
  const customDateInputId = useId();
  const passphraseHintInputId = useId();
  const passphraseAnswerInputId = useId();
  const [selectedPreset, setSelectedPreset] = useState<'standard' | 'week' | 'month' | 'year' | 'custom'>('standard');
  const [transitDays, setTransitDays] = useState(2);
  const [customDate, setCustomDate] = useState('2026-09-28');
  const [isPosting, setIsPosting] = useState(false);

  const template =
    STATIONERY_TEMPLATES.find((t) => t.id === letterData.templateId) ||
    STATIONERY_TEMPLATES[0];

  const applyDays = (days: number, preset: 'standard' | 'week' | 'month' | 'year' | 'custom') => {
    setTransitDays(days);
    setSelectedPreset(preset);

    const now = new Date();
    const arrival = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const arrivalStr = arrival.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    onChangeLetter({
      deliveryOption: preset === 'month' ? 'solstice' : preset,
      arrivalDate: arrivalStr,
    });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value, 10);
    setTransitDays(days);

    let preset: 'standard' | 'week' | 'month' | 'year' | 'custom' = 'custom';
    if (days <= 2) preset = 'standard';
    else if (days === 7) preset = 'week';
    else if (days === 30) preset = 'month';
    else if (days >= 365) preset = 'year';

    setSelectedPreset(preset);

    const now = new Date();
    const arrival = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const arrivalStr = arrival.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    onChangeLetter({
      deliveryOption: preset === 'month' ? 'solstice' : preset,
      arrivalDate: arrivalStr,
    });
  };

  const handleCustomDateChange = (dateVal: string) => {
    setCustomDate(dateVal);
    setSelectedPreset('custom');
    if (dateVal) {
      const parsed = new Date(dateVal);
      const diffMs = parsed.getTime() - new Date().getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
      setTransitDays(diffDays);

      const arrivalStr = parsed.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      onChangeLetter({
        deliveryOption: 'custom',
        customDate: dateVal,
        arrivalDate: arrivalStr,
      });
    }
  };

  const triggerPost = () => {
    setIsPosting(true);
    setTimeout(() => {
      onPostLetter();
    }, 700);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 animate-fade-in">
      {/* Header breadcrumb & step indicator */}
      <div className="flex items-center justify-between border-b border-[#E3D7C5] pb-4 mb-8">
        <button
          onClick={onBack}
          className="text-xs font-mono tracking-wider uppercase text-[#7E6E62] hover:text-[#2C241F] flex items-center gap-1 transition-colors"
        >
          ← Back to Writing Desk
        </button>

        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#886C3E] uppercase">
          <span className="font-bold text-[#5A2528]">STEP 04</span>
          <span className="text-stone-400">/ 05</span>
          <span className="text-stone-400">• DISPATCH & TRANSIT</span>
        </div>
      </div>

      {/* Main Title & Editorial Subtitle */}
      <div className="max-w-2xl mb-8">
        <div className="text-xs font-mono uppercase tracking-widest text-[#886C3E] mb-2">
          THE ART OF DELIBERATE SLOWNESS
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-light text-[#241D18] leading-tight">
          When should it arrive?
        </h1>
        <p className="font-serif text-[#5E5046] text-base sm:text-lg mt-3 italic font-light">
          A physical delay restores anticipation. Some things are worth waiting for. Select how long your correspondence will travel
          through the OLD-LETTERS digital vault.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN: Folded Sealed Envelope Specimen */}
        <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">
          <div className="text-xs font-mono text-[#7E6E62] uppercase tracking-widest flex items-center justify-between">
            <span>SEALED DISPATCH SPECIMEN</span>
            <span className="text-[#5A2528] font-bold">#{letterData.trackingCode}</span>
          </div>

          {/* Realistic Postal Envelope with Slide Entrance */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`relative rounded-xl border-2 border-[#D8C4A9] p-8 shadow-xl bg-[#FAF8F5] overflow-hidden ${
              isPosting ? 'scale-95 opacity-50 transition-all duration-700' : ''
            }`}
          >
            {/* Airmail border decoration if applicable */}
            {template.borderStyle === 'airmail' && (
              <div className="absolute inset-0 airmail-border pointer-events-none opacity-80" />
            )}

            {/* Top Row: Sender & Postage */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="text-[9px] font-mono tracking-widest text-[#7E6E62] uppercase">
                  FROM:
                </div>
                <div className="font-serif text-lg text-[#241D18] font-medium">
                  {letterData.fromName || 'Lokesh'}
                </div>
                <div className="text-[11px] font-mono text-[#5C4F45]">
                  {letterData.fromLocation || 'Postal Station No. 4'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Postmark date={letterData.postedDate} city="OLD-LETTERS" />
                <PostageStamp
                  stampId={letterData.stampId || 'airmail-1928'}
                  accentColor={template.sealColor}
                />
              </div>
            </div>

            {/* Center: Recipient Address Typography */}
            <div className="my-8 pl-6 sm:pl-10 border-l-2 border-[#5A2528]/40">
              <div className="text-[9px] font-mono tracking-widest text-[#7E6E62] uppercase">
                DELIVER TO:
              </div>
              <div className="font-serif text-2xl sm:text-3xl text-[#241D18] font-normal italic">
                {letterData.toName || 'Someone Special'}
              </div>
              <div className="text-xs font-serif text-[#5C4F45] mt-0.5">
                {letterData.toAddress || 'The Old Quarter, Florence'}
              </div>
            </div>

            {/* Bottom: Transit Dates & Wax Seal Stamp */}
            <div className="flex items-end justify-between border-t border-[#D8C4A9] pt-4">
              <div className="space-y-1 text-xs font-mono">
                <div className="text-[#7E6E62] text-[10px]">
                  POSTED: <span className="text-[#2C241F]">{letterData.postedDate}</span>
                </div>
                <div className="text-[#5A2528] font-semibold">
                  ARRIVAL: <span>{letterData.arrivalDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#7E6E62]">
                  TIME-LOCKED
                </span>
                <WaxSeal size="md" color={template.sealColor} initial="OL" />
              </div>
            </div>
          </motion.div>

          {/* Deliberate Delay Principle Note */}
          <div className="p-4 rounded-lg bg-[#FAF6EE] border border-[#E3D7C5] text-xs font-serif text-[#5E5046] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#886C3E] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#241D18] block font-mono text-[11px] uppercase tracking-wider mb-0.5">
                Vault Security & Privacy
              </span>
              During transit, your letter is securely held in an unreadable state. Neither party can open it until
              the agreed date arrives.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Transit Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#FAF8F5] border border-[#D8C4A9] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-mono tracking-widest text-[#886C3E] uppercase block mb-1">
                TRANSIT CALIBRATION
              </span>
              <h2 className="font-serif text-2xl text-[#241D18]">Select Delay Duration</h2>
            </div>

            {/* SLIDING TRANSIT DURATION RANGE SLIDER */}
            <div className="p-5 rounded-xl bg-[#F5EFE6] border border-[#D8C4A9] space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#7E6E62] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#5A2528]" />
                  TRANSIT DURATION:
                </span>
                <span className="text-[#5A2528] font-bold text-sm">
                  {transitDays} {transitDays === 1 ? 'DAY' : 'DAYS'}
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="90"
                value={transitDays}
                onChange={handleSliderChange}
                className="w-full accent-[#5A2528] cursor-pointer h-2 bg-[#D8C4A9] rounded-lg"
              />

              <div className="flex justify-between text-[10px] font-mono text-[#7E6E62]">
                <span>48 Hours</span>
                <span>1 Week</span>
                <span>1 Month</span>
                <span>3 Months</span>
              </div>
            </div>

            {/* Preset Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Standard 48 Hours */}
              <button
                id="preset-standard-btn"
                type="button"
                onClick={() => applyDays(2, 'standard')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedPreset === 'standard'
                    ? 'bg-[#FAF6EE] border-2 border-[#5A2528] shadow-sm'
                    : 'bg-[#FAF8F5] border-[#D8C4A9] hover:border-[#886C3E]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold text-[#5A2528] uppercase">STANDARD</span>
                  <span className="text-[10px] font-mono text-[#7E6E62]">48 HOURS</span>
                </div>
                <div className="font-serif text-lg text-[#241D18] mt-1 font-medium">Classic Delivery</div>
                <div className="text-xs text-[#5E5046] mt-1 font-sans">
                  The classic postal cadence. Enough time to spark anticipation.
                </div>
              </button>

              {/* Option 2: 1 Week */}
              <button
                id="preset-week-btn"
                type="button"
                onClick={() => applyDays(7, 'week')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedPreset === 'week'
                    ? 'bg-[#FAF6EE] border-2 border-[#5A2528] shadow-sm'
                    : 'bg-[#FAF8F5] border-[#D8C4A9] hover:border-[#886C3E]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold text-[#5A2528] uppercase">SLOW TRANSIT</span>
                  <span className="text-[10px] font-mono text-[#7E6E62]">7 DAYS</span>
                </div>
                <div className="font-serif text-lg text-[#241D18] mt-1 font-medium">Next Week</div>
                <div className="text-xs text-[#5E5046] mt-1 font-sans">
                  For thoughts that should settle and arrive on a quiet weekend.
                </div>
              </button>

              {/* Option 3: 1 Month */}
              <button
                id="preset-month-btn"
                type="button"
                onClick={() => applyDays(30, 'month')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedPreset === 'month'
                    ? 'bg-[#FAF6EE] border-2 border-[#5A2528] shadow-sm'
                    : 'bg-[#FAF8F5] border-[#D8C4A9] hover:border-[#886C3E]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold text-[#5A2528] uppercase">SEASONAL SHIFT</span>
                  <span className="text-[10px] font-mono text-[#7E6E62]">30 DAYS</span>
                </div>
                <div className="font-serif text-lg text-[#241D18] mt-1 font-medium">In 1 Month</div>
                <div className="text-xs text-[#5E5046] mt-1 font-sans">
                  A surprise from an earlier season arriving without warning.
                </div>
              </button>

              {/* Option 4: A Year Later */}
              <button
                id="preset-year-btn"
                type="button"
                onClick={() => applyDays(365, 'year')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedPreset === 'year'
                    ? 'bg-[#FAF6EE] border-2 border-[#5A2528] shadow-sm'
                    : 'bg-[#FAF8F5] border-[#D8C4A9] hover:border-[#886C3E]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold text-[#5A2528] uppercase">TIME CAPSULE</span>
                  <span className="text-[10px] font-mono text-[#7E6E62]">1 YEAR</span>
                </div>
                <div className="font-serif text-lg text-[#241D18] mt-1 font-medium">Next Year</div>
                <div className="text-xs text-[#5E5046] mt-1 font-sans">
                  Sent to a future version of them, preserving this exact moment.
                </div>
              </button>
            </div>

            {/* Custom Exact Date Input */}
            <div className="pt-2">
              <label htmlFor={customDateInputId} className="block text-xs font-mono text-[#7E6E62] uppercase mb-1">
                OR SPECIFY AN EXACT DATE:
              </label>
              <input
                type="date"
                id={customDateInputId}
                value={customDate}
                onChange={(e) => handleCustomDateChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF6EE] border border-[#D8C4A9] rounded-lg font-serif text-sm text-[#2C241F]"
              />
            </div>

            {/* Passphrase protection settings */}
            <div className="p-4 rounded-xl bg-[#FAF6EE] border border-[#D8C4A9] space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-[#5A2528] font-bold uppercase">
                <Lock className="w-3.5 h-3.5" />
                <span>OPTIONAL: SHARED MEMORY UNSEALING LOCK</span>
              </div>
              <p className="text-xs font-serif text-[#5E5046]">
                Only someone who knows this private memory will be permitted to break the wax seal.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor={passphraseHintInputId} className="block text-[10px] font-mono text-[#7E6E62] uppercase mb-1">
                    MEMORY HINT (PUBLIC)
                  </label>
                  <input
                    type="text"
                    id={passphraseHintInputId}
                    placeholder="e.g. The autumn river walk"
                    value={letterData.passphraseHint || ''}
                    onChange={(e) => onChangeLetter({ passphraseHint: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF6EE] border border-[#D8C4A9] rounded-lg font-serif text-[#2C241F]"
                  />
                </div>
                <div>
                  <label htmlFor={passphraseAnswerInputId} className="block text-[10px] font-mono text-[#7E6E62] uppercase mb-1">
                    PASSPHRASE ANSWER
                  </label>
                  <input
                    type="text"
                    id={passphraseAnswerInputId}
                    placeholder="e.g. Florence"
                    value={letterData.passphraseAnswer || ''}
                    onChange={(e) => onChangeLetter({ passphraseAnswer: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF6EE] border border-[#D8C4A9] rounded-lg font-serif text-[#2C241F]"
                  />
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-[#E3D7C5]">
              <button
                id="post-letter-btn"
                type="button"
                onClick={triggerPost}
                disabled={isPosting}
                className="w-full sm:flex-1 py-3.5 bg-[#5A2528] text-white text-xs font-mono tracking-widest uppercase rounded-full hover:bg-[#3F191B] transition-all flex items-center justify-center gap-2 font-semibold shadow-md active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>Post This Letter (05) →</span>
              </button>

              <button
                id="save-draft-btn"
                type="button"
                onClick={onSaveDraft}
                className="w-full sm:w-auto px-5 py-3.5 border border-[#C4AC8D] text-xs font-mono tracking-widest uppercase text-[#5C4F45] hover:text-[#2C241F] rounded-full hover:bg-[#EADBCE]/40 transition-colors flex items-center justify-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
