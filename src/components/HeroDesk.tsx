import { useState, useEffect } from 'react';
import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { Clock, Feather, Compass } from 'lucide-react';

interface HeroDeskProps {
  onStartWriting: () => void;
  onSelectCategory: (categoryId: string) => void;
}

export function HeroDesk({ onStartWriting }: HeroDeskProps) {
  const [lampOn, setLampOn] = useState(true);
  const [timeStr, setTimeStr] = useState('');
  const [arrivalEstimate, setArrivalEstimate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      // 2 days later calculation
      const future = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      setArrivalEstimate(
        future.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      id="vintage-writing-desk"
      className="relative w-full rounded-2xl overflow-hidden border border-[#D8C4A9]/70 bg-[#241D18] text-[#FAF8F5] shadow-2xl transition-all"
    >
      {/* Wooden Desk Surface texture background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, #3A2E25, #3A2E25 40px, #2F241C 40px, #2F241C 80px)`,
        }}
      />

      {/* Brass Lamp Light Cone effect */}
      <div
        className={`absolute -top-32 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          lampOn ? 'opacity-35 bg-amber-400' : 'opacity-5 bg-amber-600'
        }`}
      />

      <div className="relative p-6 sm:p-10 lg:p-12 z-10 flex flex-col justify-between min-h-[460px] lg:min-h-[520px]">
        {/* Top desk metadata & lamp switch */}
        <div className="flex items-center justify-between border-b border-stone-700/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A88955] animate-pulse" />
            <span className="font-mono text-xs tracking-widest uppercase text-stone-300">
              OLD-LETTERS • DESK NO. 04
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock ticker */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-200/80 bg-stone-900/60 px-2.5 py-1 rounded-full border border-stone-700">
              <Clock className="w-3.5 h-3.5 text-[#A88955]" />
              <span>{timeStr || '10:45:00'}</span>
            </div>

            {/* Brass lamp switch */}
            <button
              id="lamp-toggle-btn"
              onClick={() => setLampOn(!lampOn)}
              className="flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full border border-amber-900/50 bg-[#352A22] text-amber-200 hover:bg-[#46362B] transition-colors cursor-pointer"
              title="Toggle desk reading lamp"
            >
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  lampOn ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-stone-500'
                }`}
              />
              <span>LAMP {lampOn ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Center: The Tactile Desk Elements Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 items-center">
          {/* Left: The Manuscript Paper Sheet */}
          <div className="md:col-span-7 relative group">
            <div
              className="relative bg-[#FAF6EE] text-[#2C241F] p-6 sm:p-8 rounded-xl shadow-xl transform rotate-[-1.5deg] hover:rotate-0 transition-transform duration-500 border border-[#D8C4A9]"
              style={{
                boxShadow: lampOn
                  ? '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 40px rgba(251, 191, 36, 0.15)'
                  : '0 20px 40px -10px rgba(0,0,0,0.5)',
              }}
            >
              {/* Paper Watermark */}
              <div className="absolute top-4 right-4 text-[9px] font-mono tracking-widest text-[#7E6E62]/40 uppercase select-none">
                OLD-LETTERS ARCHIVAL STOCK
              </div>

              {/* Fountain Pen resting */}
              <div className="flex items-center gap-2 mb-3 text-[#5A2528]">
                <Feather className="w-4 h-4" />
                <span className="font-mono text-[11px] uppercase tracking-widest">
                  Drafting Room • Letter in Progress
                </span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl text-[#241D18] italic font-normal leading-snug mb-3">
                "Some things are worth waiting for."
              </h3>

              <p className="font-serif text-[#423730] text-sm sm:text-base leading-relaxed line-clamp-3 mb-4">
                To sit quietly before a blank sheet of paper, to think of someone across the
                distance, and to grant them the gift of anticipation. A letter is a piece of time
                preserved in ink.
              </p>

              <div className="flex items-center justify-between border-t border-[#D8C4A9]/60 pt-3 text-xs font-mono text-[#7E6E62]">
                <span className="tracking-wider">DISPATCH: 2 DAYS TRANSIT</span>
                <span className="text-[#5A2528] font-semibold">FREE CUSTOM DELAY</span>
              </div>
            </div>

            {/* Stack shadow sheet beneath */}
            <div className="absolute inset-0 bg-[#E8DCBF] rounded-xl transform rotate-[1.5deg] -z-10 translate-y-1.5 border border-[#C4AC8D]" />
          </div>

          {/* Right: Envelopes, Stamps, Wax Seal, Dispatch Gauge */}
          <div className="md:col-span-5 flex flex-col gap-4">
            {/* Postal Envelope Preview */}
            <div
              onClick={onStartWriting}
              className="relative p-5 rounded-xl bg-[#F4ECDC] text-[#2C241F] border border-[#C4AC8D] shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <PostageStamp denomination="15c" accentColor="#5A2528" />
                <Postmark date="21 SEP 2026" city="OLD-LETTERS" />
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="text-[#7E6E62] text-[10px] tracking-wider uppercase">Addressed to:</div>
                <div className="font-serif text-lg text-[#241D18] italic font-medium">Someone Special</div>
                <div className="text-[11px] text-[#5C4F45]">Waiting for delivery across the miles</div>
              </div>

              <div className="absolute -bottom-3 right-5">
                <WaxSeal size="sm" color="#5A2528" initial="OL" />
              </div>
            </div>

            {/* Dispatch Estimate Card */}
            <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-700/80 text-xs font-mono flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-stone-400 tracking-wider text-[10px] uppercase">
                  Traditional Transit
                </div>
                <div className="text-amber-200 font-serif text-sm font-medium">
                  {arrivalEstimate || 'In 48 Hours'}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-[#5A2528] text-amber-100 text-[10px] rounded-full uppercase tracking-wider font-semibold">
                  Deliberate Delay
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom desk bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-800 pt-4 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#A88955]" />
              PHYSICAL POSTAL PHILOSOPHY
            </span>
            <span className="hidden sm:inline text-stone-600">•</span>
            <span className="hidden sm:inline text-stone-400">
              TIME-LOCKED PRIVATE ENCRYPTED SEALS
            </span>
          </div>

          <button
            id="desk-begin-btn"
            onClick={onStartWriting}
            className="text-amber-300 hover:text-amber-100 underline underline-offset-4 tracking-widest uppercase transition-colors font-semibold"
          >
            Take a seat at the desk →
          </button>
        </div>
      </div>
    </div>
  );
}
