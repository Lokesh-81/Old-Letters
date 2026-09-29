import React from 'react';
import { LETTER_TYPES } from '../../data/mockData';
import { LetterType } from '../../types/letter';

interface TypeSelectorProps {
  selectedType: LetterType;
  onSelect: (type: LetterType) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({
  selectedType,
  onSelect,
  onContinue,
  onBack,
}) => {
  const current = LETTER_TYPES.find((t) => t.type === selectedType) || LETTER_TYPES[0];

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-800 pb-6 gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-mono text-[#dec183] mb-1">
            STEP 01 OF 06 · INTENT
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-stone-100 font-light">
            Choose Letter Type
          </h2>
        </div>
        <div className="text-xs font-mono text-stone-500">
          ALL TYPES ARE COMPLIMENTARY & FREE
        </div>
      </div>

      {/* Grid of types */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {LETTER_TYPES.map((item) => {
          const isSelected = selectedType === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => onSelect(item.type)}
              className={`p-4 sm:p-5 text-left border rounded-xs transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[#182124] border-[#c5a059] shadow-lg shadow-[#c5a059]/10 text-stone-100'
                  : 'bg-stone-900/40 border-stone-800/80 text-stone-400 hover:text-stone-200 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className={isSelected ? 'text-[#dec183]' : 'text-stone-500'}>
                  {isSelected ? 'SELECTED' : 'TYPE'}
                </span>
                {isSelected && <span className="text-xs text-[#dec183]">✦</span>}
              </div>
              <div className="font-serif text-lg font-medium tracking-tight mb-1 text-stone-100">
                {item.type}
              </div>
              <div className="text-xs font-sans text-stone-400 line-clamp-2">
                {item.tagline}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Type Atmosphere Banner */}
      <div className="p-6 sm:p-8 bg-[#121618] border border-stone-800 rounded-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-mono text-[#c5a059] uppercase tracking-wider">
            ATMOSPHERE · {current.type}
          </div>
          <div className="font-serif italic text-lg sm:text-xl text-stone-200">
            "{current.excerpt}"
          </div>
          <div className="text-xs text-stone-400">{current.tagline}</div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 border border-stone-700 text-stone-400 hover:text-stone-200 text-xs font-sans tracking-wide rounded-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-3 bg-[#c5a059] hover:bg-[#dec183] text-stone-950 font-sans font-medium text-xs tracking-wider rounded-sm transition-all duration-200 cursor-pointer shadow-md flex-1 md:flex-initial text-center"
          >
            Continue to Template →
          </button>
        </div>
      </div>
    </div>
  );
};
