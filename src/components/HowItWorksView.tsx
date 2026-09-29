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
    <div className="max-w-4xl mx-auto px-6 sm:px-12 py-16 space-y-20 bg-[#faf9f7] text-teal-900">
      {/* Header */}
      <div className="space-y-4 text-center">
        <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
          THE PHILOSOPHY
        </span>
        <h1 className="text-5xl sm:text-7xl text-teal-900 font-extralight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          On Taking Time
        </h1>
        <p className="italic text-teal-900/80 text-xl max-w-lg mx-auto leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          "The emotional resonance of a letter lives in the interval between writing and receiving."
        </p>
      </div>

      {/* Editorial Sections */}
      <div className="space-y-16 border-t border-[#eae4da] pt-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 text-[11px] font-mono uppercase text-stone-500">
            THE VELOCITY PROBLEM
          </div>
          <div className="md:col-span-8 space-y-4 text-xl text-stone-800 leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
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
            THE 48-HOUR VAULT
          </div>
          <div className="md:col-span-8 space-y-4 text-xl text-stone-800 leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
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
            CEREMONY & PRIVACY
          </div>
          <div className="md:col-span-8 space-y-4 text-xl text-stone-800 leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
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
        <h3 className="text-3xl text-teal-900 font-light" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          Write something worth waiting for.
        </h3>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onStartWriting}
            className="rounded-sm bg-teal-900 px-8 py-3 text-xs uppercase tracking-wider font-medium text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-teal-800 hover:shadow-[0_2px_4px_rgba(20,83,45,0.25),0_6px_18px_rgba(20,83,45,0.22)] active:scale-[0.96] cursor-pointer"
            style={{ fontFamily: 'sans-serif' }}
          >
            Compose Letter →
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-stone-300 text-stone-700 hover:text-teal-900 font-sans text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
