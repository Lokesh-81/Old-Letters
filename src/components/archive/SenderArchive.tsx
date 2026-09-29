import React, { useState } from 'react';
import { Letter } from '../../types/letter';

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
    <div className="max-w-5xl mx-auto px-6 sm:px-12 py-16 space-y-16 bg-[#faf8f5] text-[#141618]">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#eae4da] pb-8 gap-6">
        <div className="space-y-3">
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
            REGISTRY OF LETTERS
          </span>
          <h1 className="font-serif text-5xl sm:text-6xl text-[#141618] font-light">
            Your Correspondence
          </h1>
          <p className="font-serif italic text-stone-600 text-lg">
            Letters written, sealed, and delivered across time.
          </p>
        </div>

        <button
          type="button"
          onClick={onWriteNew}
          className="px-6 py-3.5 bg-[#141618] hover:bg-[#5c1d24] text-white font-sans font-medium text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
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
                filter === tab ? 'text-[#141618] border-b-2 border-[#141618] pb-1 font-semibold' : 'text-stone-400 hover:text-stone-700'
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

          return (
            <div
              key={ltr.id}
              className="py-10 group flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors hover:bg-stone-50 px-4 -mx-4 rounded-xs"
            >
              {/* Left Column: Recipient & Excerpt */}
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-3 text-xs font-mono text-stone-500 uppercase tracking-wider">
                  <span>TO {ltr.recipientName}</span>
                  <span>·</span>
                  <span className="text-stone-700 font-medium">{ltr.type}</span>
                  <span>·</span>
                  <span>{ltr.letterDate}</span>
                </div>

                <h3 className="font-serif text-3xl sm:text-4xl text-[#141618] font-light group-hover:text-[#5c1d24] transition-colors">
                  To {ltr.recipientName}
                </h3>

                <p className="font-serif italic text-stone-600 text-base leading-relaxed line-clamp-2">
                  "{ltr.content}"
                </p>
              </div>

              {/* Right Column: Status & Action */}
              <div className="flex flex-col md:items-end gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                    {isDelivered ? 'STATUS' : 'EXPECTED ARRIVAL'}
                  </div>
                  <div className="font-serif text-lg text-stone-900 font-medium">
                    {isDelivered ? (
                      <span className="text-emerald-700">Delivered & Opened</span>
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
