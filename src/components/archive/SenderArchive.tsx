import React, { useState } from 'react';
import { Letter } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';

interface SenderArchiveProps {
  letters: Letter[];
  onOpenLetter: (letter: Letter) => void;
  onWriteNew: () => void;
}

export const SenderArchive: React.FC<SenderArchiveProps> = ({
  letters,
  onOpenLetter,
  onWriteNew,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'IN TRANSIT' | 'DELIVERED'>('ALL');

  const filtered = letters.filter((ltr) => {
    if (filter === 'ALL') return true;
    if (filter === 'IN TRANSIT') return ltr.status === 'IN TRANSIT' || ltr.status === 'SCHEDULED';
    if (filter === 'DELIVERED') return ltr.status === 'DELIVERED' || ltr.status === 'OPENED';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-12 py-16 space-y-16 bg-[#faf9f7] text-teal-900">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#eae4da] pb-8 gap-6">
        <div className="space-y-3">
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
            REGISTRY OF LETTERS
          </span>
          <h1 className="font-serif text-5xl sm:text-6xl text-teal-900 font-light">
            Your Correspondence
          </h1>
          <p className="font-serif italic text-stone-600 text-lg">
            Letters written, sealed, and delivered across time.
          </p>
        </div>

        <button
          type="button"
          onClick={onWriteNew}
          className="rounded-sm bg-teal-900 px-6 py-2.5 text-xs uppercase tracking-wider font-medium text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10),inset_0_-1px_0_2px_rgba(0,0,0,0.12)] transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-teal-800 hover:shadow-[0_2px_4px_rgba(20,83,45,0.25),0_6px_18px_rgba(20,83,45,0.22)] active:scale-[0.96] cursor-pointer self-start sm:self-auto"
          style={{ fontFamily: 'sans-serif' }}
        >
          Write a Letter →
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-[#eae4da] pb-4 text-xs font-mono">
        <div className="flex items-center gap-6 uppercase">
          {(['ALL', 'IN TRANSIT', 'DELIVERED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`transition-colors cursor-pointer ${
                filter === tab ? 'text-teal-900 border-b-2 border-teal-900 pb-1 font-semibold' : 'text-stone-400 hover:text-teal-900'
              }`}
            >
              {tab === 'ALL' ? 'All Letters' : tab}
            </button>
          ))}
        </div>

        <div className="text-stone-400">
          {filtered.length} {filtered.length === 1 ? 'ENTRY' : 'ENTRIES'}
        </div>
      </div>

      {/* Editorial List Layout */}
      <div className="divide-y divide-[#eae4da]">
        {filtered.map((ltr) => {
          const isDelivered = ltr.status === 'DELIVERED' || ltr.status === 'OPENED';
          const arrivalDate = new Date(ltr.scheduledDeliveryAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });

          const tpl = TEMPLATES.find((t) => t.id === ltr.templateId) || TEMPLATES[0];

          return (
            <div
              key={ltr.id}
              className="py-10 group flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors hover:bg-stone-50 px-4 -mx-4 rounded-xs"
            >
              {/* Left Column: Miniature Swatch + Recipient & Excerpt */}
              <div className="flex items-start gap-5 max-w-xl">
                {/* Miniature stationery paper swatch with wax seal badge */}
                <div
                  className="shrink-0 w-16 h-20 rounded-xs border shadow-sm p-1.5 flex flex-col justify-between select-none relative group-hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: tpl.paperColor,
                    borderColor: tpl.borderColor || '#cbbda5',
                    color: tpl.inkColor,
                  }}
                  title={`Stationery: ${tpl.name}`}
                >
                  <div className="text-[8px] font-mono uppercase tracking-tighter opacity-60 leading-none">
                    {tpl.name.split(' ')[0]}
                  </div>
                  <div className="flex justify-end">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-2xs"
                      style={{ backgroundColor: tpl.waxSealStyle.color, color: '#fef08a' }}
                    >
                      {tpl.waxSealStyle.emblem}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs font-mono text-stone-500 uppercase tracking-wider">
                    <span>TO {ltr.recipientName}</span>
                    <span>·</span>
                    <span className="text-teal-900 font-medium">{ltr.type}</span>
                    <span>·</span>
                    <span className="text-stone-400">{tpl.name}</span>
                  </div>

                  <h3 className="font-serif text-3xl sm:text-4xl text-teal-900 font-light group-hover:text-teal-800 transition-colors">
                    To {ltr.recipientName}
                  </h3>

                  <p className="font-serif italic text-stone-600 text-base leading-relaxed line-clamp-2">
                    "{ltr.content}"
                  </p>
                </div>
              </div>

              {/* Right Column: Status & Action */}
              <div className="flex flex-col md:items-end gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                    {isDelivered ? 'STATUS' : 'EXPECTED ARRIVAL'}
                  </div>
                  <div className="font-serif text-lg text-teal-900 font-medium">
                    {isDelivered ? (
                      <span className="text-teal-800">Delivered & Opened</span>
                    ) : (
                      <span>Arriving {arrivalDate}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenLetter(ltr)}
                    className="px-5 py-2.5 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 text-xs font-sans tracking-wider uppercase rounded-xs transition-colors cursor-pointer shadow-xs"
                  >
                    Open Experience →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

