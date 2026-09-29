import React from 'react';

interface HowItWorksViewProps {
  onStartWriting: () => void;
  onBack: () => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({
  onStartWriting,
  onBack,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-12 py-16 space-y-20 bg-[#faf8f5] text-[#141618]">
      {/* Header */}
      <div className="space-y-4 text-center">
        <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
          THE PHILOSOPHY
        </span>
        <h1 className="font-serif text-5xl sm:text-7xl text-[#141618] font-light">
          On Taking Time
        </h1>
        <p className="font-serif italic text-stone-600 text-xl max-w-lg mx-auto leading-relaxed">
          "The emotional resonance of a letter lives in the interval between writing and receiving."
        </p>
      </div>

      {/* Editorial Sections */}
      <div className="space-y-16 border-t border-[#eae4da] pt-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 text-[11px] font-mono uppercase text-stone-500">
            01 / THE VELOCITY PROBLEM
          </div>
          <div className="md:col-span-8 space-y-4 font-serif text-xl text-stone-800 leading-relaxed">
            <p>
              When conversations happen in real-time text bubbles, we optimize for speed over reflection. We reply before we have digested what the other person has said.
            </p>
            <p className="text-stone-600 font-sans text-sm leading-relaxed">
              OLD-LETTERS introduces deliberate friction: an intentional waiting duration that allows your words to arrive when they matter most.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-t border-[#eae4da] pt-12">
          <div className="md:col-span-4 text-[11px] font-mono uppercase text-stone-500">
            02 / THE 48-HOUR VAULT
          </div>
          <div className="md:col-span-8 space-y-4 font-serif text-xl text-stone-800 leading-relaxed">
            <p>
              When you post a letter to someone, it enters an encrypted transit vault. Neither the sender can recall it impulsively, nor can the recipient break the seal before the scheduled hour.
            </p>
            <p className="text-stone-600 font-sans text-sm leading-relaxed">
              Waiting transforms reading from a casual glance into an event.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-t border-[#eae4da] pt-12">
          <div className="md:col-span-4 text-[11px] font-mono uppercase text-stone-500">
            03 / CEREMONY & PRIVACY
          </div>
          <div className="md:col-span-8 space-y-4 font-serif text-xl text-stone-800 leading-relaxed">
            <p>
              When the arrival moment comes, the recipient opens a private salon. The wax seal breaks, the paper unfolds, and they read your words without notifications, likes, or comments.
            </p>
            <p className="text-stone-600 font-sans text-sm leading-relaxed">
              It is as personal as traditional post, reimagined for the digital era.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Box */}
      <div className="p-10 bg-white border border-[#eae4da] shadow-paper-sm rounded-xs text-center space-y-6">
        <h3 className="font-serif text-3xl text-stone-900 font-light">
          Write something worth waiting for.
        </h3>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onStartWriting}
            className="px-8 py-3.5 bg-[#141618] hover:bg-[#5c1d24] text-white font-sans font-medium text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
          >
            Compose Letter →
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3.5 border border-stone-300 text-stone-700 font-sans text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
