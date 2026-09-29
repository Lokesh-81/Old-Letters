import React from 'react';
import { LetterAttachment, LetterTemplate } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';

interface PaperSheetProps {
  templateId?: string;
  template?: LetterTemplate;
  date?: string;
  greeting?: string;
  content: string;
  signoff?: string;
  senderName?: string;
  recipientName?: string;
  attachments?: LetterAttachment[];
  className?: string;
  isEditing?: boolean;
  onContentChange?: (val: string) => void;
  onGreetingChange?: (val: string) => void;
  onSignoffChange?: (val: string) => void;
  onSenderChange?: (val: string) => void;
  onRecipientChange?: (val: string) => void;
  onDateChange?: (val: string) => void;
}

export const PaperSheet: React.FC<PaperSheetProps> = ({
  templateId = 'ivory',
  template: customTemplate,
  date = 'September 29, 2026',
  greeting = 'Dear friend,',
  content,
  signoff = 'With warm regards,',
  senderName = '',
  attachments = [],
  className = '',
  isEditing = false,
  onContentChange,
  onGreetingChange,
  onSignoffChange,
  onSenderChange,
  onDateChange,
}) => {
  const t = customTemplate || TEMPLATES.find((tpl) => tpl.id === templateId) || TEMPLATES[0];

  const fontClass = {
    serif: 'font-serif',
    display: 'font-serif',
    editorial: 'font-serif italic',
    typewriter: 'font-mono tracking-tight',
    sans: 'font-sans',
  }[t.fontFamily];

  // Template specific decorative border motifs
  const isAirMail = t.id === 'air-mail';
  const isBurgundy = t.id === 'burgundy';
  const isDiary = t.id === 'diary';
  const isMidnight = t.id === 'midnight';
  const isTypewriter = t.id === 'typewritten';

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto rounded-sm transition-all duration-300 ${t.paperBg} ${t.textColor} ${className}`}
      style={{
        boxShadow: isMidnight
          ? '0 20px 50px -10px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.1)'
          : '0 1px 3px rgba(0,0,0,0.08), 0 20px 45px -15px rgba(0,0,0,0.3)',
      }}
    >
      {/* Air Mail classic chevron edge */}
      {isAirMail && (
        <div
          className="absolute inset-x-0 top-0 h-2"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, #dc2626, #dc2626 12px, #f8f9fa 12px, #f8f9fa 18px, #2563eb 18px, #2563eb 30px, #f8f9fa 30px, #f8f9fa 36px)',
          }}
        />
      )}
      {isAirMail && (
        <div
          className="absolute inset-x-0 bottom-0 h-2"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, #dc2626, #dc2626 12px, #f8f9fa 12px, #f8f9fa 18px, #2563eb 18px, #2563eb 30px, #f8f9fa 30px, #f8f9fa 36px)',
          }}
        />
      )}

      {/* Diary vermilion left margin line */}
      {isDiary && (
        <div className="absolute top-0 bottom-0 left-12 sm:left-20 w-[1px] bg-rose-300/40 pointer-events-none" />
      )}

      {/* Inner letter sheet padding */}
      <div className={`p-8 sm:p-14 lg:p-16 ${fontClass} flex flex-col min-h-[580px]`}>
        {/* Header / Date */}
        <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-8">
          <div className="flex items-center gap-2 text-xs tracking-widest uppercase opacity-60">
            <span>CORRESPONDENCE</span>
            <span>·</span>
            <span className="font-mono">{t.name}</span>
          </div>

          {isEditing ? (
            <input
              type="text"
              value={date}
              onChange={(e) => onDateChange?.(e.target.value)}
              placeholder="Date"
              className="text-right text-xs tracking-wider uppercase opacity-75 bg-transparent border-b border-dashed border-current/30 focus:outline-none focus:border-current"
            />
          ) : (
            <span className="text-xs tracking-wider uppercase opacity-75 font-mono">{date}</span>
          )}
        </div>

        {/* Salutation */}
        <div className="mb-6">
          {isEditing ? (
            <input
              type="text"
              value={greeting}
              onChange={(e) => onGreetingChange?.(e.target.value)}
              placeholder="Dear [Name],"
              className="w-full text-xl sm:text-2xl font-medium bg-transparent border-b border-transparent hover:border-current/20 focus:border-current/40 focus:outline-none transition-colors"
            />
          ) : (
            <h2 className="text-xl sm:text-2xl font-medium tracking-tight">{greeting}</h2>
          )}
        </div>

        {/* Letter Body */}
        <div className="flex-1 my-2">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => onContentChange?.(e.target.value)}
              placeholder="Write your letter here without haste. Some things are worth taking the time to say..."
              rows={12}
              className={`w-full bg-transparent resize-y text-base sm:text-lg leading-relaxed focus:outline-none transition-colors ${
                isDiary ? 'leading-8' : 'leading-relaxed'
              }`}
              style={{
                lineHeight: isTypewriter ? '1.8' : '1.85',
              }}
            />
          ) : (
            <div
              className={`whitespace-pre-wrap text-base sm:text-lg select-text ${
                isBurgundy ? 'text-[#f5ead8]' : ''
              }`}
              style={{
                lineHeight: isTypewriter ? '1.8' : '1.85',
              }}
            >
              {content || (
                <span className="opacity-40 italic">This letter sheet awaits your words...</span>
              )}
            </div>
          )}
        </div>

        {/* Attached Photos / Keepsakes */}
        {attachments.length > 0 && (
          <div className="my-8 pt-6 border-t border-black/5">
            <div className="text-[11px] uppercase tracking-widest opacity-50 mb-3 font-mono">
              Enclosed Keepsake
            </div>
            <div className="flex flex-wrap gap-4">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="relative p-2.5 bg-white shadow-md border border-stone-200/80 rounded-xs rotate-[-1deg] max-w-xs transition-transform hover:rotate-0"
                >
                  <div className="w-full h-44 bg-stone-100 overflow-hidden relative">
                    <img
                      src={att.url}
                      alt={att.caption || 'Attached photo'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {/* Simulated archival photo corner mounts */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-stone-400" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-stone-400" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-stone-400" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-stone-400" />
                  </div>
                  {att.caption && (
                    <div className="pt-2 text-center text-xs font-serif italic text-stone-700">
                      {att.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Valediction / Signoff */}
        <div className="mt-8 pt-4 flex flex-col items-end text-right">
          {isEditing ? (
            <div className="w-64 space-y-1">
              <input
                type="text"
                value={signoff}
                onChange={(e) => onSignoffChange?.(e.target.value)}
                placeholder="From,"
                className="w-full text-right text-base sm:text-lg bg-transparent border-b border-transparent hover:border-current/20 focus:border-current/40 focus:outline-none"
              />
              <input
                type="text"
                value={senderName}
                onChange={(e) => onSenderChange?.(e.target.value)}
                placeholder="Your name"
                className="w-full text-right text-lg sm:text-xl font-medium bg-transparent border-b border-dashed border-current/30 focus:border-current focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-base sm:text-lg opacity-85 italic">{signoff}</div>
              <div className="text-lg sm:text-xl font-medium tracking-tight">
                {senderName || 'Anonymous'}
              </div>
            </div>
          )}
        </div>

        {/* Subtle bottom watermark / seal emblem */}
        <div className="mt-12 pt-6 border-t border-black/5 flex items-center justify-between text-[11px] opacity-40 font-mono">
          <span>OLD-LETTERS ARCHIVE</span>
          <span className="text-base opacity-80">{t.sealEmblem}</span>
          <span>DISPATCH NO. 2026</span>
        </div>
      </div>
    </div>
  );
};
