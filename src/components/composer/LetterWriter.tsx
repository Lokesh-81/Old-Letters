import React, { useState, useEffect } from 'react';
import { LetterAttachment, LetterTemplate } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';
import { PaperSheet } from '../common/PaperSheet';

interface LetterWriterProps {
  templateId: string;
  letterDate: string;
  greeting: string;
  content: string;
  signoff: string;
  senderName: string;
  recipientName: string;
  attachments: LetterAttachment[];
  onChange: (fields: {
    letterDate?: string;
    greeting?: string;
    content?: string;
    signoff?: string;
    senderName?: string;
    recipientName?: string;
    attachments?: LetterAttachment[];
  }) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const LetterWriter: React.FC<LetterWriterProps> = ({
  templateId,
  letterDate,
  greeting,
  content,
  signoff,
  senderName,
  recipientName,
  attachments,
  onChange,
  onContinue,
  onBack,
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [phase2Notice, setPhase2Notice] = useState<string | null>(null);

  const template: LetterTemplate =
    TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];

  // Word and character count calculations
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  // Simulated ink autosave indicator
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      setSaveStatus('saved');
    }, 600);
    return () => clearTimeout(timer);
  }, [content, greeting, signoff, senderName, letterDate]);

  // Handle image upload from user's local disk
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          const newAtt: LetterAttachment = {
            id: `photo-${Date.now()}`,
            type: 'photo',
            url: result,
            caption: photoCaption || file.name.replace(/\.[^/.]+$/, ''),
            date: letterDate,
          };
          onChange({ attachments: [...attachments, newAtt] });
          setShowPhotoModal(false);
          setPhotoCaption('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Curated keepsake photo presets (inline SVG data URIs, completely independent of external CDNs)
  const addPresetPhoto = (presetName: string, svgUri: string) => {
    const newAtt: LetterAttachment = {
      id: `preset-${Date.now()}`,
      type: 'photo',
      url: svgUri,
      caption: photoCaption || presetName,
      date: letterDate,
    };
    onChange({ attachments: [...attachments, newAtt] });
    setShowPhotoModal(false);
    setPhotoCaption('');
  };

  const removeAttachment = (id: string) => {
    onChange({ attachments: attachments.filter((a) => a.id !== id) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Top Utility & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-4 gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] font-mono text-[#dec183] mb-1">
            STEP 03 OF 06 · COMPOSITION
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-stone-100 font-light">
            Write Your Letter
          </h2>
        </div>

        {/* Autosave and Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === 'saved' ? 'bg-emerald-500/80' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{saveStatus === 'saved' ? 'Ink dried · Saved' : 'Inscribing...'}</span>
          </div>
          <span>·</span>
          <span>{wordCount} words</span>
          <span>·</span>
          <span>~{readingTimeMinutes} min read</span>
        </div>
      </div>

      {/* Mode Toggle & Attachments Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-900/60 p-3 rounded-xs border border-stone-800">
        {/* Left: View mode segmented buttons */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-sm border border-stone-800">
          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
              !isPreviewMode
                ? 'bg-stone-800 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Drafting Mode
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewMode(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
              isPreviewMode
                ? 'bg-stone-800 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Reading Preview
          </button>
        </div>

        {/* Right: Enclosure Tools (Photo, Voice cylinder, Video reel) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className="px-3 py-1.5 text-xs font-sans text-stone-300 hover:text-stone-100 bg-stone-800 hover:bg-stone-700/80 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>📷</span>
            <span>Enclose Photo ({attachments.length})</span>
          </button>

          {/* Voice cylinder (Phase 2 honest indicator) */}
          <button
            type="button"
            onClick={() =>
              setPhase2Notice(
                'Audio Wax Cylinders are scheduled for Phase 2. In the upcoming release, you will be able to record spoken prose that plays upon unsealing.'
              )
            }
            className="px-3 py-1.5 text-xs font-sans text-stone-400 hover:text-stone-200 bg-stone-950 border border-stone-800 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Phase 2 Feature"
          >
            <span>🎙</span>
            <span>Voice Reel (Phase 2)</span>
          </button>

          {/* Video reel (Phase 2 honest indicator) */}
          <button
            type="button"
            onClick={() =>
              setPhase2Notice(
                'Live Video Parlours and 8mm Video Reels are scheduled for Phase 2. They will connect correspondents face-to-face as the seal breaks.'
              )
            }
            className="px-3 py-1.5 text-xs font-sans text-stone-400 hover:text-stone-200 bg-stone-950 border border-stone-800 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Phase 2 Feature"
          >
            <span>📼</span>
            <span>Video (Phase 2)</span>
          </button>
        </div>
      </div>

      {/* Phase 2 Explanatory Banner if clicked */}
      {phase2Notice && (
        <div className="p-4 bg-stone-900 border border-[#c5a059]/40 rounded-xs text-xs text-stone-300 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#dec183] text-sm">✦</span>
            <span>{phase2Notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPhase2Notice(null)}
            className="text-stone-400 hover:text-stone-100 cursor-pointer font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Physical Paper Writing Desk */}
      <div className="relative py-4 flex justify-center">
        {/* Paper Sheet Component in Editable or Preview state */}
        <div className="w-full">
          <PaperSheet
            template={template}
            date={letterDate}
            greeting={greeting}
            content={content}
            signoff={signoff}
            senderName={senderName}
            recipientName={recipientName}
            attachments={attachments}
            isEditing={!isPreviewMode}
            onContentChange={(val) => onChange({ content: val })}
            onGreetingChange={(val) => onChange({ greeting: val })}
            onSignoffChange={(val) => onChange({ signoff: val })}
            onSenderChange={(val) => onChange({ senderName: val })}
            onDateChange={(val) => onChange({ letterDate: val })}
          />
        </div>
      </div>

      {/* Attached Keepsakes Management Strip (if any attached) */}
      {attachments.length > 0 && (
        <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xs space-y-3">
          <div className="text-xs font-mono text-stone-400 uppercase tracking-wider">
            ENCLOSED KEEPSAKES ({attachments.length})
          </div>
          <div className="flex flex-wrap gap-4">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 p-2 bg-stone-950 border border-stone-800 rounded-xs text-xs text-stone-300"
              >
                <img
                  src={att.url}
                  alt={att.caption || 'Enclosure'}
                  className="w-10 h-10 object-cover rounded-xs"
                />
                <span className="truncate max-w-[150px]">{att.caption || 'Photo'}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="text-stone-500 hover:text-rose-400 p-1 cursor-pointer font-mono"
                  title="Remove attachment"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-stone-800">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 border border-stone-700 text-stone-300 hover:text-stone-100 text-xs font-sans rounded-sm transition-colors cursor-pointer"
        >
          ← Back to Template
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={!content.trim()}
          className={`px-7 py-3 font-sans font-medium text-xs tracking-wider rounded-sm transition-all duration-200 cursor-pointer shadow-md ${
            content.trim()
              ? 'bg-[#c5a059] hover:bg-[#dec183] text-stone-950'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          Address Recipient →
        </button>
      </div>

      {/* Photo Enclosure Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#14191c] border border-stone-700 p-6 rounded-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-serif text-xl text-stone-100">Enclose an Archival Photograph</h3>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="text-stone-400 hover:text-stone-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-stone-400 mb-2 uppercase">
                  Caption / Handwritten Note
                </label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="e.g., By the river at dusk, September 2026"
                  className="w-full bg-stone-900 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              {/* Upload from file */}
              <div>
                <label className="block text-xs font-mono text-stone-400 mb-2 uppercase">
                  Upload From Your Device
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-700 hover:border-[#c5a059] p-6 rounded-xs cursor-pointer transition-colors bg-stone-900/40">
                  <span className="text-2xl mb-1">🖼</span>
                  <span className="text-xs text-stone-300">Click to choose image file</span>
                  <span className="text-[10px] text-stone-500 font-mono mt-1">PNG, JPG, WEBP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or Pick Curated Archival Postal Presets */}
              <div className="pt-2">
                <div className="text-xs font-mono text-stone-400 mb-2 uppercase">
                  Or Select An Archival Keepsake
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      addPresetPhoto(
                        'Ponte Vecchio at dusk',
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="p1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233a2e2b"/><stop offset="100%" stop-color="%23191514"/></linearGradient></defs><rect width="600" height="400" fill="url(%23p1)"/><circle cx="300" cy="180" r="80" fill="%23c5a059" opacity="0.2"/><path d="M60 360 L220 250 L340 330 L460 220 L560 360 Z" fill="%23100e0d" opacity="0.85"/><text x="300" y="380" font-family="Georgia,serif" font-size="13" fill="%23e8e0d0" text-anchor="middle">PONTE VECCHIO · AUTUMN 2026</text></svg>'
                      )
                    }
                    className="p-3 border border-stone-800 hover:border-stone-600 bg-stone-900/60 rounded-xs text-left cursor-pointer transition-colors"
                  >
                    <div className="font-serif text-sm text-stone-200">Florence Bridge</div>
                    <div className="text-[10px] font-mono text-stone-400">Sepia twilight silhouette</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      addPresetPhoto(
                        'The Silent Shoreline',
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="p2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%23223038"/><stop offset="100%" stop-color="%230e1418"/></linearGradient></defs><rect width="600" height="400" fill="url(%23p2)"/><circle cx="450" cy="120" r="50" fill="%23eae5db" opacity="0.3"/><path d="M0 280 Q150 250 300 280 T600 280 L600 400 L0 400 Z" fill="%23162025"/><text x="300" y="380" font-family="Georgia,serif" font-size="13" fill="%23dec183" text-anchor="middle">THE NORTH COAST · OCTOBER 2026</text></svg>'
                      )
                    }
                    className="p-3 border border-stone-800 hover:border-stone-600 bg-stone-900/60 rounded-xs text-left cursor-pointer transition-colors"
                  >
                    <div className="font-serif text-sm text-stone-200">Coastal Solitude</div>
                    <div className="text-[10px] font-mono text-stone-400">Nocturnal tide & moon</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
