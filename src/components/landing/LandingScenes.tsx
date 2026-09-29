import React, { useState } from 'react';
import { LETTER_TYPES, TEMPLATES } from '../../data/mockData';
import { LetterType } from '../../types/letter';
import { PaperSheet } from '../common/PaperSheet';
import Footer23 from '../ui/index';
import ScrollTriggered from '../ui/scroll-triggered';

interface LandingScenesProps {
  onSelectLetterType: (type: LetterType) => void;
  onStartWriting: () => void;
  onExploreHowItWorks?: () => void;
}

export const LandingScenes: React.FC<LandingScenesProps> = ({
  onSelectLetterType,
  onStartWriting,
  onExploreHowItWorks,
}) => {
  const [selectedType, setSelectedType] = useState<LetterType>('LOVE');
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);

  const activeTypeObj =
    LETTER_TYPES.find((t) => t.type === selectedType) || LETTER_TYPES[0];

  const currentTemplate = TEMPLATES[activeTemplateIndex] || TEMPLATES[0];

  return (
    <div className="w-full bg-[#faf9f7] text-teal-900">
      {/* SCENE 02: "Why do we rush everything?" Floating Editorial Sheet */}
      <section
        id="how-it-works-section"
        className="py-28 px-6 sm:px-12 border-t border-[#eae4da] bg-[#f4f2ec] overflow-hidden"
      >
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
              01 · REFLECTION
            </span>
            <h2 className="text-4xl sm:text-6xl text-teal-900 font-extralight max-w-2xl mx-auto leading-[1.05]" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              Why do we rush everything?
            </h2>
          </div>

          {/* 3D Floating Paper Sheet Composition */}
          <div className="perspective-1500 py-6 flex justify-center">
            <div
              className="relative w-full max-w-3xl preserve-3d transition-transform duration-700 hover:rotate-x-2"
              style={{
                transform: 'rotateX(3deg)',
              }}
            >
              {/* Secondary background sheet passing behind */}
              <div
                className="absolute inset-0 bg-[#ebe5db] border border-[#ded5c6] rounded-xs shadow-paper-sm -z-10"
                style={{
                  transform: 'translate3d(18px, 18px, -40px) rotate(-1.5deg)',
                }}
              />

              {/* Primary foreground editorial sheet */}
              <div
                className="p-8 sm:p-14 bg-white border border-[#eae4da] rounded-xs shadow-paper-lg space-y-8"
                style={{
                  transform: 'translateZ(20px)',
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg sm:text-xl text-stone-700 leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                  <p>
                    Modern digital conversations happen in fractured milliseconds. We reply before we have digested what the other person wrote, and our words vanish into endless notification feeds.
                  </p>
                  <p className="text-teal-900 font-normal">
                    OLD-LETTERS restores the ceremony of waiting. When you choose a delivery date, your letter is sealed in transit, allowing anticipation to give your words permanence.
                  </p>
                </div>

                <div className="pt-6 border-t border-stone-200 grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-stone-400">INTERVAL</div>
                    <div className="text-xl sm:text-2xl text-teal-900 mt-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>48 Hours</div>
                    <div className="text-[11px] text-stone-500">Standard Transit</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-stone-400">PRIVACY</div>
                    <div className="text-xl sm:text-2xl text-teal-900 mt-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>Wax Seal</div>
                    <div className="text-[11px] text-stone-500">Unbroken Protection</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-stone-400">ACCESS</div>
                    <div className="text-xl sm:text-2xl text-teal-900 mt-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>Free</div>
                    <div className="text-[11px] text-stone-500">For Everyone</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCENE 03: WRITE → SEAL → WAIT → ARRIVE (4 Physical Correspondence Objects in 3D Depth) */}
      <section className="py-28 px-6 sm:px-12 border-t border-[#eae4da] bg-[#faf9f7]">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#eae4da] pb-8">
            <div>
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500 block mb-2">
                02 · THE CEREMONY
              </span>
              <h2 className="text-4xl sm:text-5xl text-teal-900 font-extralight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                The Four Movements
              </h2>
            </div>
            <div className="italic text-teal-900/80 max-w-sm text-base" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              The journey from a blank page to the moment an envelope is opened.
            </div>
          </div>

          {/* 3D Physical Cards Matrix */}
          <div className="perspective-1500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Movement 1: WRITE */}
            <div
              className="p-8 bg-white border border-[#eae4da] rounded-xs shadow-paper-md space-y-6 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-2 preserve-3d"
              style={{ transform: 'translateZ(10px)' }}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 uppercase">
                <span>PHASE 01</span>
                <span>LETTER SHEET</span>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-12 bg-[#f4f2ec] border border-[#ded5c6] shadow-xs rounded-xs flex items-center justify-center text-xs text-teal-900 font-serif">
                  ❦
                </div>
                <h3 className="text-2xl text-teal-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>WRITE</h3>
                <p className="text-xs font-sans text-stone-600 leading-relaxed">
                  Compose on curated digital stationery. Inscribe your thoughts, attach a photograph, and set your salutation.
                </p>
              </div>
              <div className="text-[10px] font-mono text-stone-400 pt-3 border-t border-stone-100">
                STATIONERY & PROSE
              </div>
            </div>

            {/* Movement 2: SEAL */}
            <div
              className="p-8 bg-white border border-[#eae4da] rounded-xs shadow-paper-md space-y-6 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-2 preserve-3d"
              style={{ transform: 'translateZ(25px)' }}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 uppercase">
                <span>PHASE 02</span>
                <span>ENVELOPE & WAX</span>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-teal-900 text-white flex items-center justify-center text-xs font-serif shadow-sm">
                  ❦
                </div>
                <h3 className="text-2xl text-teal-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>SEAL</h3>
                <p className="text-xs font-sans text-stone-600 leading-relaxed">
                  The letter folds into thirds and enters the envelope. A ceremonial wax seal closes the flap against early opening.
                </p>
              </div>
              <div className="text-[10px] font-mono text-stone-400 pt-3 border-t border-stone-100">
                PHYSICAL PROTECTION
              </div>
            </div>

            {/* Movement 3: WAIT */}
            <div
              className="p-8 bg-white border border-[#eae4da] rounded-xs shadow-paper-md space-y-6 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-2 preserve-3d"
              style={{ transform: 'translateZ(15px)' }}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 uppercase">
                <span>PHASE 03</span>
                <span>IN TRANSIT</span>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-8 bg-[#ebe5db] border border-stone-300 flex items-center justify-center font-mono text-[10px] text-teal-900 font-semibold">
                  48H
                </div>
                <h3 className="text-2xl text-teal-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>WAIT</h3>
                <p className="text-xs font-sans text-stone-600 leading-relaxed">
                  The envelope travels in the transit vault. Neither sender nor recipient may open it early. Anticipation deepens.
                </p>
              </div>
              <div className="text-[10px] font-mono text-stone-400 pt-3 border-t border-stone-100">
                MEASURED PASSAGE
              </div>
            </div>

            {/* Movement 4: ARRIVE */}
            <div
              className="p-8 bg-white border border-[#eae4da] rounded-xs shadow-paper-md space-y-6 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-2 preserve-3d"
              style={{ transform: 'translateZ(30px)' }}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 uppercase">
                <span>PHASE 04</span>
                <span>DELIVERY SALON</span>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 border border-teal-900 text-teal-900 flex items-center justify-center text-xs font-serif">
                  ✦
                </div>
                <h3 className="text-2xl text-teal-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>ARRIVE</h3>
                <p className="text-xs font-sans text-stone-600 leading-relaxed">
                  Upon arrival, the recipient breaks the seal. The paper unfolds for an intimate, distraction-free reading experience.
                </p>
              </div>
              <div className="text-[10px] font-mono text-stone-400 pt-3 border-t border-stone-100">
                PRIVATE UNSEALING
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCENE: SCROLL-TRIGGERED PAGES IN MOTION */}
      <section className="py-24 px-6 sm:px-12 border-t border-[#eae4da] bg-[#fbf9f5] overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
            03 · PHYSICAL SCROLL
          </span>
          <h2 className="text-4xl sm:text-6xl text-teal-900 font-extralight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            Letters That Rise With You
          </h2>
          <p className="text-teal-900/80 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            As you scroll, correspondence sheets rise from the postal archive with spring physical depth. Select any letter to inscribe your own words.
          </p>
        </div>

        <ScrollTriggered
          onSelectLetter={(item) => {
            onSelectLetterType(item.type as LetterType);
          }}
        />
      </section>

      {/* SCENE 04 & 05: LETTER TYPES (3D Stacked Archive Drawer) */}
      <section id="letter-types" className="py-28 px-6 sm:px-12 border-t border-[#eae4da] bg-[#f4f2ec]">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="space-y-3">
            <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
              04 · INTENTION & OCCASION
            </span>
            <h2 className="text-4xl sm:text-6xl text-teal-900 font-extralight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              What will you say?
            </h2>
            <p className="text-teal-900/80 text-lg sm:text-xl max-w-xl" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              Select an intention. Each correspondence category carries its own emotional cadence.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: 3D Stacked Card Drawer */}
            <div className="lg:col-span-5 space-y-3 perspective-1000">
              {LETTER_TYPES.slice(0, 6).map((item, idx) => {
                const isSelected = selectedType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSelectedType(item.type)}
                    className={`w-full p-5 text-left rounded-xs transition-all duration-300 cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'bg-white border-teal-900 shadow-paper-md translate-x-2'
                        : 'bg-[#faf9f7]/90 border-[#eae4da] text-stone-600 hover:bg-white hover:text-teal-900'
                    }`}
                    style={{
                      transform: isSelected
                        ? 'translateZ(25px) scale(1.02)'
                        : `translateZ(${10 - idx * 4}px)`,
                    }}
                  >
                    <div>
                      <div className="text-2xl text-teal-900 font-normal" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                        {item.type}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">{item.tagline}</div>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-mono text-teal-800 font-semibold">
                        ACTIVE ✦
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Active Type Physical Display Sheet */}
            <div className="lg:col-span-7 sticky top-28 p-10 sm:p-12 bg-white border border-[#eae4da] shadow-paper-lg rounded-xs space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-xs font-mono text-stone-500">
                  <span className="uppercase text-teal-900 font-medium">
                    INTENTION: {activeTypeObj.type}
                  </span>
                  <span>CADENCE</span>
                </div>

                <blockquote className="text-2xl sm:text-3xl text-teal-900 leading-relaxed italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                  "{activeTypeObj.excerpt}"
                </blockquote>

                <p className="text-sm font-sans text-stone-600">
                  {activeTypeObj.tagline}
                </p>
              </div>

              <div className="pt-6 border-t border-stone-200 flex items-center justify-between">
                <span className="text-xs font-mono text-stone-500">FREE CORRESPONDENCE</span>
                <button
                  type="button"
                  onClick={() => onSelectLetterType(activeTypeObj.type)}
                  className="rounded-sm bg-teal-900 px-6 py-2.5 text-xs uppercase tracking-wider font-medium text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-teal-800 hover:shadow-[0_2px_4px_rgba(20,83,45,0.25),0_6px_18px_rgba(20,83,45,0.22)] active:scale-[0.96] cursor-pointer"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  Write a {activeTypeObj.type} Letter →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCENE 06: 3D STATIONERY CAROUSEL */}
      <section id="stationery" className="py-28 px-6 sm:px-12 border-t border-[#eae4da] bg-[#faf9f7] overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#eae4da] pb-8">
            <div>
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500 block mb-2">
                04 · STATIONERY STUDIO
              </span>
              <h2 className="text-4xl sm:text-5xl text-teal-900 font-extralight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                Curated Stationery
              </h2>
            </div>
            <div className="italic text-teal-900/80 max-w-sm text-base" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              Explore 8 bespoke paper finishes with realistic deckled depth.
            </div>
          </div>

          {/* 3D Stationery Stage */}
          <div className="perspective-2000 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Selector List */}
              <div className="lg:col-span-5 space-y-2">
                {TEMPLATES.map((tpl, i) => {
                  const isCurrent = activeTemplateIndex === i;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setActiveTemplateIndex(i)}
                      className={`w-full p-4 text-left rounded-xs transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                        isCurrent
                          ? 'bg-white border-teal-900 shadow-paper-md'
                          : 'bg-transparent border-[#eae4da] text-stone-600 hover:bg-white hover:text-teal-900'
                      }`}
                    >
                      <div>
                        <div className="text-xl text-teal-900" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>{tpl.name}</div>
                        <div className="text-xs text-stone-500">{tpl.tagline}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-xs"
                          style={{ backgroundColor: tpl.paperColor }}
                        />
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tpl.sealColor }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right 3D Paper Sheet View */}
              <div className="lg:col-span-7 flex justify-center preserve-3d">
                <div
                  className="w-full max-w-lg transition-transform duration-500 shadow-paper-3d rounded-xs overflow-hidden"
                  style={{
                    transform: 'rotateY(-4deg) rotateX(2deg) translateZ(30px)',
                  }}
                >
                  <PaperSheet
                    template={currentTemplate}
                    date="29 September 2026"
                    greeting="Dear Vasantha,"
                    content="I am writing this on the balcony as the evening cools down over the city. I wanted to tell you how much I admire the way you pay attention to people."
                    signoff="Yours,"
                    senderName="Lokesh"
                    isEditing={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER 23: Complete Animated Footer */}
      <Footer23
        brandName="OLD-LETTERS"
        ctaHeading="Some things are easier to write than say."
        ctaSubtitle="A digital correspondence service restoring intentional tempo, physical wax unsealing, and meaningful connection."
        getDemoLabel="HOW IT WORKS"
        signInLabel="WRITE A LETTER"
        onWriteClick={onStartWriting}
        onHowItWorksClick={onExploreHowItWorks}
      />
    </div>
  );
};
