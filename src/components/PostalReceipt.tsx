import { useState } from 'react';
import { LetterData } from '../types';
import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { motion } from 'motion/react';
import {
  Copy,
  Check,
  Share2,
  Eye,
  ArrowRight,
  Clock,
  Printer,
} from 'lucide-react';

interface PostalReceiptProps {
  letterData: LetterData;
  onOpenRecipientExperience: () => void;
  onReturnToArchive: () => void;
  onWriteAnother: () => void;
}

export function PostalReceipt({
  letterData,
  onOpenRecipientExperience,
  onReturnToArchive,
  onWriteAnother,
}: PostalReceiptProps) {
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const deliveryUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://old-letters.app'}/deliver/${letterData.trackingCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(deliveryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'OLD-LETTERS — Some things are worth waiting for.',
          text: `A sealed correspondence from ${letterData.fromName} is travelling to you. Expected arrival: ${letterData.arrivalDate}.`,
          url: deliveryUrl,
        })
        .catch(() => copyLink());
    } else {
      copyLink();
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 animate-fade-in">
      {/* Top Banner Notice */}
      <div className="text-center max-w-lg mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#886C3E]/40 bg-[#FAF6EE] text-[#5A2528] text-xs font-mono tracking-widest uppercase mb-4 shadow-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>OFFICIALLY DEPOSITED IN POSTAL TRANSIT</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-light text-[#241D18]">
          The letter is on its way.
        </h1>
        <p className="font-serif text-[#5E5046] text-base sm:text-lg mt-3 italic font-light">
          Your words have been wax-sealed into confidential transit. Share this private delivery ticket
          with your recipient so they may look forward to its unsealing.
        </p>
      </div>

      {/* THE POSTAL RECEIPT / DISPATCH TICKET */}
      <div
        id="postal-dispatch-receipt"
        className="relative max-w-xl mx-auto bg-[#FAF8F5] border-2 border-dashed border-[#D8C4A9] rounded-md p-8 sm:p-10 shadow-2xl text-[#2C241F]"
        style={{
          backgroundImage: `radial-gradient(rgba(44, 36, 31, 0.03) 1px, transparent 0)`,
          backgroundSize: '16px 16px',
        }}
      >
        {/* Receipt Header */}
        <div className="text-center border-b-2 border-black/10 pb-6 mb-6">
          <div className="flex justify-center mb-2">
            <span className="w-3 h-3 rounded-full bg-[#5A2528]" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl tracking-[0.2em] uppercase font-medium text-[#241D18]">
            OLD-LETTERS
          </h2>
          <div className="text-[11px] font-mono tracking-[0.16em] text-[#7E6E62] uppercase mt-1">
            Some things are worth waiting for.
          </div>
        </div>

        {/* Receipt Key-Value Rows */}
        <div className="space-y-4 font-mono text-xs border-b-2 border-black/10 pb-6 mb-6">
          <div className="flex justify-between items-center py-1 border-b border-black/5">
            <span className="text-[#7E6E62] tracking-wider uppercase">LETTER NO.</span>
            <span className="font-bold text-[#5A2528] text-sm tracking-widest">
              {letterData.trackingCode}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-black/5">
            <span className="text-[#7E6E62] tracking-wider uppercase">SENDER (FROM)</span>
            <span className="font-serif text-sm font-semibold text-[#241D18]">
              {letterData.fromName || 'Lokesh'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-black/5">
            <span className="text-[#7E6E62] tracking-wider uppercase">RECIPIENT (TO)</span>
            <span className="font-serif text-sm font-semibold text-[#241D18]">
              {letterData.toName || 'Someone Special'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-black/5">
            <span className="text-[#7E6E62] tracking-wider uppercase">DATE POSTED</span>
            <span className="text-[#2C241F]">{letterData.postedDate}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-black/5 bg-amber-50/60 px-2 -mx-2 rounded">
            <span className="text-[#5A2528] font-bold tracking-wider uppercase">
              EXPECTED ARRIVAL
            </span>
            <span className="font-serif text-sm font-bold text-[#5A2528]">
              {letterData.arrivalDate}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-[#7E6E62] tracking-wider uppercase">STATUS</span>
            <span className="px-2 py-0.5 rounded bg-[#5A2528] text-amber-100 font-mono text-[10px] tracking-widest uppercase font-bold">
              WAITING FOR DELIVERY
            </span>
          </div>
        </div>

        {/* Barcode & Stamps Stamp Impression */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Simulated vintage barcode */}
          <div className="flex flex-col items-center sm:items-start select-none">
            <div className="font-mono text-[18px] tracking-[0.3em] font-bold text-stone-800">
              ||||| | |||| ||| || ||||
            </div>
            <span className="text-[9px] font-mono text-[#7E6E62] tracking-widest mt-1">
              * PO-{letterData.trackingCode}-2026 *
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Postmark city="DISPATCH" date={letterData.postedDate} />
            <WaxSeal size="sm" color="#5A2528" initial="PO" />
          </div>
        </div>

        {/* Decorative perforated punch holes on sides */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F6F1EA] border border-[#D8C4A9]" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F6F1EA] border border-[#D8C4A9]" />
      </div>

      {/* SHARE THE PRIVATE DELIVERY LINK */}
      <div className="max-w-xl mx-auto mt-10 space-y-4">
        <div className="text-center">
          <div className="text-xs font-mono uppercase tracking-widest text-[#886C3E] mb-1">
            PRIVATE POSTAL TICKET
          </div>
          <h3 className="font-serif text-2xl text-[#241D18]">Share this delivery with them</h3>
          <p className="text-xs text-[#5E5046] mt-1 font-sans">
            They can open this link on their device to preview the sealed envelope and count down
            to arrival.
          </p>
        </div>

        {/* Link Bar & Copy Button */}
        <div className="flex items-center gap-2 p-2 bg-[#FAF6EE] border border-[#D8C4A9] rounded-lg shadow-sm">
          <input
            type="text"
            readOnly
            value={deliveryUrl}
            className="flex-1 bg-transparent px-3 py-1 font-mono text-xs text-[#2C241F] focus:outline-none"
          />
          <button
            id="copy-private-link-btn"
            onClick={copyLink}
            className="px-4 py-2 bg-[#2C241F] hover:bg-[#5A2528] text-white text-xs font-mono tracking-wider uppercase rounded transition-colors flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED' : 'COPY PRIVATE LINK'}</span>
          </button>
        </div>

        {/* Secondary Sharing Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            id="share-native-btn"
            onClick={handleShare}
            className="flex-1 py-3 border border-[#C4AC8D] rounded text-xs font-mono tracking-wider uppercase text-[#5C4F45] hover:text-[#2C241F] hover:bg-[#EADBCE]/30 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{shareSuccess ? 'Link Prepared!' : 'Share Delivery Notice'}</span>
          </button>

          {/* Recipient Experience Preview Simulator CTA */}
          <button
            id="preview-recipient-btn"
            onClick={onOpenRecipientExperience}
            className="flex-1 py-3 bg-[#5A2528] text-white rounded text-xs font-mono tracking-wider uppercase hover:bg-[#3F191B] transition-colors flex items-center justify-center gap-2 font-semibold shadow"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Recipient Experience →</span>
          </button>
        </div>

        {/* Auxiliary Links */}
        <div className="pt-6 border-t border-[#E3D7C5] flex items-center justify-between text-xs font-mono text-[#7E6E62]">
          <button
            onClick={onReturnToArchive}
            className="hover:text-[#2C241F] hover:underline"
          >
            View in Personal Archive →
          </button>

          <button
            onClick={onWriteAnother}
            className="text-[#5A2528] font-bold hover:underline"
          >
            + Write Another Letter
          </button>
        </div>
      </div>
    </div>
  );
}
