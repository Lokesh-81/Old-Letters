import { useState } from 'react';
import { ArchivedLetterSummary, LetterData } from '../types';
import { MOCK_ARCHIVE } from '../data/mockData';
import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { motion, AnimatePresence } from 'motion/react';
import {
  Inbox,
  Send,
  FileText,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  Search,
  Filter,
} from 'lucide-react';

interface PostalArchiveProps {
  onSelectLetterToView: (trackingCode: string) => void;
  onWriteNewLetter: () => void;
}

export function PostalArchive({
  onSelectLetterToView,
  onWriteNewLetter,
}: PostalArchiveProps) {
  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'drafts' | 'memories'>('sent');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLetters = MOCK_ARCHIVE.filter(
    (item) =>
      item.tab === activeTab &&
      (item.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: ArchivedLetterSummary['status']) => {
    switch (status) {
      case 'IN_TRANSIT':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono tracking-wider uppercase font-bold">
            IN TRANSIT
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-mono tracking-wider uppercase font-bold">
            DELIVERED
          </span>
        );
      case 'OPENED':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-[#5A2528] text-amber-100 text-[10px] font-mono tracking-wider uppercase font-bold">
            OPENED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-mono tracking-wider uppercase font-bold">
            DRAFT
          </span>
        );
      case 'POSTED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono tracking-wider uppercase font-bold">
            POSTED
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 animate-fade-in">
      {/* Archive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#E3D7C5] pb-8 mb-10 gap-6">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[#886C3E] mb-2">
            OLD-LETTERS ARCHIVAL LEDGER
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-light text-[#241D18]">
            Letters that have travelled.
          </h1>
          <p className="font-serif text-[#5E5046] text-base sm:text-lg mt-2 italic font-light max-w-xl">
            Some things are worth waiting for. A quiet ledger of words entrusted to time, distance, and patient hands.
          </p>
        </div>

        <button
          onClick={onWriteNewLetter}
          className="px-8 py-3.5 bg-[#5A2528] text-white text-xs font-mono tracking-widest uppercase rounded-full hover:bg-[#3F191B] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-semibold shrink-0"
        >
          <span>Write a New Letter</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {(['sent', 'received', 'drafts', 'memories'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 sm:px-5 py-2 text-xs font-mono tracking-widest uppercase rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-[#FAF8F5] font-semibold'
                  : 'text-[#7E6E62] hover:text-[#2C241F] hover:bg-[#EADBCE]/50'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="archive-tab-pill"
                  className="absolute inset-0 bg-[#2C241F] rounded-full shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E6E62]" />
          <input
            type="text"
            placeholder="Search by name, code, or intent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#FAF8F5] border border-[#D8C4A9] rounded-full font-serif text-[#2C241F] placeholder:text-stone-400 focus:outline-hidden focus:border-[#5A2528]"
          />
        </div>
      </div>

      {/* Archive Grid with Sliding Stagger */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredLetters.map((letter, idx) => (
            <motion.div
              key={letter.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              onClick={() => onSelectLetterToView(letter.trackingCode)}
              className="bg-[#FAF8F5] border border-[#D8C4A9] rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Code & Status */}
                <div className="flex items-start justify-between border-b border-[#E3D7C5] pb-3 mb-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono tracking-widest text-[#886C3E] uppercase block">
                      DISPATCH #{letter.trackingCode}
                    </span>
                    <span className="font-serif text-xs text-[#7E6E62]">{letter.category}</span>
                  </div>
                  {getStatusBadge(letter.status)}
                </div>

                {/* Recipient & Sender */}
                <div className="space-y-1 mb-4">
                  <div className="text-xs font-mono text-[#7E6E62]">
                    TO: <span className="font-serif text-base font-semibold text-[#241D18]">{letter.recipient}</span>
                  </div>
                  <div className="text-xs font-mono text-[#7E6E62]">
                    FROM: <span className="font-serif text-sm text-[#5C4F45]">{letter.sender}</span>
                  </div>
                </div>

                {/* Letter Excerpt */}
                <p className="font-serif italic text-sm text-[#5E5046] line-clamp-3 leading-relaxed bg-[#FAF6EE] p-3 rounded-lg border border-[#E3D7C5]/60 mb-4">
                  "{letter.excerpt}"
                </p>
              </div>

              {/* Card Footer: Dates & Inspect Link */}
              <div className="pt-3 border-t border-[#E3D7C5] flex items-center justify-between text-xs font-mono text-[#7E6E62]">
                <div className="space-y-0.5">
                  <div className="text-[10px]">ARRIVED: {letter.arrivalDate}</div>
                </div>

                <span className="text-[#5A2528] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  VIEW DISPATCH →
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {filteredLetters.length === 0 && (
        <div className="py-20 text-center space-y-3 font-serif">
          <div className="text-[#886C3E] font-mono text-xs uppercase tracking-widest">
            NO CORRESPONDENCE FOUND
          </div>
          <h3 className="text-2xl text-[#241D18]">This shelf of the registry is currently quiet.</h3>
          <p className="text-sm text-[#5E5046]">No letters match the selected tab or search query.</p>
        </div>
      )}
    </div>
  );
}
