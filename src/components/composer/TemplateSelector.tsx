import React, { useState } from 'react';
import { TEMPLATES } from '../../data/mockData';
import { LetterTemplate, TemplateCategory } from '../../types/letter';
import { PaperSheet } from '../common/PaperSheet';

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const CATEGORIES: { label: string; value: TemplateCategory | 'ALL' }[] = [
  { label: 'All Templates', value: 'ALL' },
  { label: 'Classic', value: 'CLASSIC' },
  { label: 'Romantic', value: 'ROMANTIC' },
  { label: 'Personal', value: 'PERSONAL' },
  { label: 'Celebration', value: 'CELEBRATION' },
  { label: 'Minimal', value: 'MINIMAL' },
];

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  onContinue,
  onBack,
}) => {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'ALL'>('ALL');

  const filteredTemplates = TEMPLATES.filter((tpl) => {
    if (activeCategory === 'ALL') return true;
    return tpl.category === activeCategory;
  });

  const activeTemplate =
    TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-mono text-[#dec183] mb-1">
            STEP 02 OF 06 · PARCHMENT & PRESS
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-stone-100 font-light">
            Choose Your Letter Template
          </h2>
        </div>
        <div className="text-xs font-mono text-stone-500">
          ALL 10 BESPOKE TEMPLATES ARE COMPLIMENTARY
        </div>
      </div>

      {/* Filter Tabs (Interactive filter control per Frontend Constitution) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-stone-800/60">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 text-xs font-sans font-medium whitespace-nowrap rounded-sm transition-colors cursor-pointer ${
              activeCategory === cat.value
                ? 'bg-[#c5a059] text-stone-950 shadow-sm'
                : 'bg-stone-900/40 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Layout: Template Catalog & Active Large Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Template Cards list */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto pr-2">
          {filteredTemplates.map((tpl: LetterTemplate) => {
            const isSelected = tpl.id === selectedTemplateId;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl.id)}
                className={`p-5 text-left border rounded-xs transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#182124] border-[#c5a059] ring-1 ring-[#c5a059]/40 text-stone-100'
                    : 'bg-stone-900/30 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                    <span className="text-[#c5a059] uppercase">{tpl.category}</span>
                    <span className="opacity-60">{tpl.sealEmblem}</span>
                  </div>
                  <h3 className="font-serif text-lg font-medium text-stone-100 mb-1">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed line-clamp-2 mb-3">
                    {tpl.description}
                  </p>
                </div>

                {/* Swatch preview strip */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-800/60 mt-auto">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-stone-700 inline-block shadow-inner"
                      style={{ backgroundColor: tpl.paperColor }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block shadow-xs"
                      style={{ backgroundColor: tpl.sealColor }}
                    />
                    <span className="text-[11px] font-mono text-stone-500">
                      {tpl.fontFamily}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-mono text-[#dec183] font-semibold">
                      SELECTED
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Large Interactive Preview */}
        <div className="lg:col-span-6 sticky top-24 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-stone-400 px-2">
            <span>PREVIEW · {activeTemplate.name.toUpperCase()}</span>
            <span>{activeTemplate.tagline}</span>
          </div>

          <div className="p-4 sm:p-6 bg-stone-950/80 border border-stone-800/80 rounded-xs overflow-hidden flex justify-center">
            <div className="w-full max-w-md transform scale-[0.88] origin-top">
              <PaperSheet
                template={activeTemplate}
                date="29 September 2026"
                greeting="Dear friend,"
                content={`I am writing to you on ${activeTemplate.name} parchment. Take your time to read this. The world moves too fast, but this letter is patient.`}
                signoff="Faithfully yours,"
                senderName="A Patient Sender"
                isEditing={false}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 border border-stone-700 text-stone-300 hover:text-stone-100 text-xs font-sans rounded-sm transition-colors cursor-pointer"
            >
              ← Back to Type
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="px-7 py-3 bg-[#c5a059] hover:bg-[#dec183] text-stone-950 font-sans font-medium text-xs tracking-wider rounded-sm transition-all duration-200 cursor-pointer shadow-md"
            >
              Compose Letter →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
