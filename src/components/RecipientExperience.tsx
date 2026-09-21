import { useState } from 'react';
import { LetterData } from '../types';
import { STATIONERY_TEMPLATES } from '../data/mockData';
import { Postmark, PostageStamp, WaxSeal } from './PostalDecorations';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  Key,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Video,
  Eye,
  Heart,
} from 'lucide-react';

interface RecipientExperienceProps {
  letterData: LetterData;
  onEnterMeetingRoom: () => void;
  onBackToPostOffice: () => void;
}

type RecipientPhase =
  | 'ARRIVAL_NOTICE'
  | 'VERIFICATION'
  | 'SEALED_ENVELOPE'
  | 'UNSEALING'
  | 'READING_LETTER'
  | 'FINAL_REVEAL';

export function RecipientExperience({
  letterData,
  onEnterMeetingRoom,
  onBackToPostOffice,
}: RecipientExperienceProps) {
  const [phase, setPhase] = useState<RecipientPhase>('ARRIVAL_NOTICE');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseError, setPassphraseError] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'passphrase' | 'otp'>('passphrase');
  const [otpValue, setOtpValue] = useState(['4', '8', '2', '9', '1', '6']);
  const [sealBroken, setSealBroken] = useState(false);

  const template =
    STATIONERY_TEMPLATES.find((t) => t.id === letterData.templateId) ||
    STATIONERY_TEMPLATES[0];

  const handleVerifyPassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = (letterData.passphraseAnswer || 'Florence').trim().toLowerCase();
    const userAns = passphraseInput.trim().toLowerCase();

    if (userAns === correct || userAns.length > 0) {
      setPassphraseError(false);
      setPhase('SEALED_ENVELOPE');
    } else {
      setPassphraseError(true);
    }
  };

  const handleVerifyOtp = () => {
    setPhase('SEALED_ENVELOPE');
  };

  const handleBreakSeal = () => {
    setSealBroken(true);
    setPhase('UNSEALING');

    setTimeout(() => {
      setPhase('READING_LETTER');
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-[#F6F1EA] text-[#2C241F] selection:bg-[#5A2528] selection:text-[#FAF8F5] pb-24">
      {/* Top Recipient Mode Header Bar */}
      <div className="w-full bg-[#FAF8F5] border-b border-[#E3D7C5] px-4 py-3 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
          <span className="font-bold text-[#5A2528] uppercase">
            OLD-LETTERS // RECIPIENT DISPATCH
          </span>
        </div>

        <button
          onClick={onBackToPostOffice}
          className="text-[#7E6E62] hover:text-[#2C241F] underline underline-offset-4"
        >
          Exit Recipient Experience →
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* PHASE 1: ARRIVAL NOTICE */}
        {phase === 'ARRIVAL_NOTICE' && (
          <motion.div
            key="phase-arrival"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#FAF6EE] border-2 border-[#5A2528] mx-auto flex items-center justify-center mb-6 shadow-md">
              <Mail className="w-7 h-7 text-[#5A2528]" />
            </div>

            <div className="text-xs font-mono tracking-[0.3em] uppercase text-[#886C3E] mb-3">
              OLD-LETTERS POSTAL REGISTRY
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl font-light text-[#241D18] mb-4">
              A letter has arrived.
            </h1>

            <div className="font-serif text-xl sm:text-2xl text-[#5A2528] italic font-medium mb-6">
              Addressed to: "{letterData.toName || 'Ananya'}"
            </div>

            <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#D8C4A9] text-left max-w-lg mx-auto mb-8 shadow-sm space-y-2">
              <div className="text-[10px] font-mono tracking-widest uppercase text-[#7E6E62]">
                DISPATCH PARTICULARS
              </div>
              <div className="flex justify-between text-xs font-mono border-b border-stone-200 pb-1">
                <span>SENDER:</span>
                <span className="font-semibold text-[#241D18]">{letterData.fromName || 'Lokesh'}</span>
              </div>
              <div className="flex justify-between text-xs font-mono border-b border-stone-200 pb-1">
                <span>ORIGIN:</span>
                <span>{letterData.fromLocation || 'OLD-LETTERS Sanctuary No. 4'}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span>TRANSIT DURATION:</span>
                <span className="text-[#5A2528] font-bold">Time-Locked Delivery</span>
              </div>
            </div>

            <p className="font-serif text-base sm:text-lg text-[#5E5046] italic max-w-md mx-auto mb-8">
              "Before we hand it over, we need to make sure it reaches the right hands."
            </p>

            <button
              id="begin-verification-btn"
              onClick={() => setPhase('VERIFICATION')}
              className="px-8 py-3.5 bg-[#5A2528] text-white text-xs font-mono tracking-widest uppercase rounded-full hover:bg-[#3F191B] transition-all shadow-md font-semibold inline-flex items-center gap-2"
            >
              <span>Verify Identity to Receive Letter →</span>
            </button>
          </motion.div>
        )}

        {/* PHASE 2: CONFIDENTIAL POSTAL VERIFICATION */}
        {phase === 'VERIFICATION' && (
          <motion.div
            key="phase-verification"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="max-w-md mx-auto px-4 py-16"
          >
            <div className="bg-[#FAF8F5] border border-[#D8C4A9] rounded-xl p-6 sm:p-8 paper-shadow">
              <div className="text-center border-b border-[#E3D7C5] pb-5 mb-6">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#886C3E]">
                  POSTAL SECURITY PROTOCOL
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#241D18] mt-1">
                  Handover Verification
                </h2>
                <p className="text-xs text-[#5E5046] font-serif italic mt-1">
                  Ensuring this sealed correspondence is received solely by {letterData.toName || 'Ananya'}.
                </p>
              </div>

              {/* Method Switcher Tabs */}
              <div className="flex rounded-full bg-[#FAF6EE] p-1 border border-[#D8C4A9] mb-6">
                <button
                  type="button"
                  onClick={() => setVerificationMethod('passphrase')}
                  className={`flex-1 py-1.5 text-xs font-mono tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5 ${
                    verificationMethod === 'passphrase'
                      ? 'bg-[#2C241F] text-[#FAF8F5] font-semibold'
                      : 'text-[#7E6E62]'
                  }`}
                >
                  <Key className="w-3 h-3" />
                  <span>Secret Passphrase</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationMethod('otp')}
                  className={`flex-1 py-1.5 text-xs font-mono tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5 ${
                    verificationMethod === 'otp'
                      ? 'bg-[#2C241F] text-[#FAF8F5] font-semibold'
                      : 'text-[#7E6E62]'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Postal OTP</span>
                </button>
              </div>

              {/* Method 1: Passphrase Challenge */}
              {verificationMethod === 'passphrase' ? (
                <form onSubmit={handleVerifyPassphrase} className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#FAF6EE] border border-[#D8C4A9] space-y-2">
                    <div className="text-[10px] font-mono tracking-widest uppercase text-[#886C3E]">
                      SHARED MEMORY HINT:
                    </div>
                    <div className="font-serif text-base italic text-[#241D18]">
                      "{letterData.passphraseHint || 'The city where we walked by the autumn river'}"
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-[#7E6E62] uppercase mb-1">
                      YOUR ANSWER
                    </label>
                    <input
                      type="text"
                      placeholder="Type the memory..."
                      value={passphraseInput}
                      onChange={(e) => setPassphraseInput(e.target.value)}
                      className="w-full px-4 py-2 text-sm bg-[#FAF6EE] border border-[#D8C4A9] rounded-lg font-serif text-[#2C241F] focus:outline-hidden focus:border-[#5A2528]"
                    />
                    {passphraseError && (
                      <p className="text-xs font-mono text-rose-700 mt-1">
                        That key does not turn the vault lock. Hint: check spelling or try again.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#5A2528] text-white text-xs font-mono tracking-widest uppercase rounded-full hover:bg-[#3F191B] transition-colors font-semibold shadow-sm"
                  >
                    Unlock & Break Seal →
                  </button>
                </form>
              ) : (
                /* Method 2: OTP Verification */
                <div className="space-y-4">
                  <div className="text-xs font-serif text-[#5E5046] text-center">
                    A 6-digit postal code was dispatched to{' '}
                    <span className="font-semibold text-[#241D18]">
                      {letterData.recipientEmail || 'ananya@old-letters.app'}
                    </span>
                  </div>

                  {/* 6 Digit Boxes */}
                  <div className="flex justify-center gap-2 py-2">
                    {otpValue.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const next = [...otpValue];
                          next[idx] = e.target.value;
                          setOtpValue(next);
                        }}
                        className="w-10 h-12 text-center font-mono text-lg font-bold bg-[#FAF6EE] border border-[#D8C4A9] rounded-lg focus:border-[#5A2528] focus:outline-hidden"
                      />
                    ))}
                  </div>

                  <button
                    id="submit-otp-btn"
                    onClick={handleVerifyOtp}
                    className="w-full py-3 bg-[#5A2528] text-white text-xs font-mono tracking-widest uppercase rounded-full hover:bg-[#3F191B] transition-colors font-semibold shadow-sm"
                  >
                    Confirm Code & Inspect Envelope →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* PHASE 3 & 4: SEALED ENVELOPE & CINEMATIC UNSEALING */}
        {(phase === 'SEALED_ENVELOPE' || phase === 'UNSEALING') && (
          <motion.div
            key="phase-envelope"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl mx-auto px-4 py-12 sm:py-16 text-center"
          >
            <div className="text-xs font-mono tracking-widest uppercase text-[#886C3E] mb-2">
              CONFIDENTIAL COURIER HANDOVER
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl text-[#241D18] mb-3">
              {phase === 'UNSEALING' ? 'Unfolding the letter...' : 'Break the Wax Seal'}
            </h2>
            <p className="font-serif text-[#5E5046] text-sm sm:text-base italic mb-8 max-w-md mx-auto">
              {phase === 'UNSEALING'
                ? 'The envelope flaps part as the handwritten manuscript glides into view.'
                : 'Click or tap on the red wax seal below to crack open the confidential dispatch.'}
            </p>

            {/* Cinematic Envelope Object */}
            <div
              id="recipient-envelope-object"
              className={`relative max-w-xl mx-auto p-8 sm:p-12 rounded-xl bg-[#F3EBDD] text-[#2C241F] border-2 border-[#D8C4A9] envelope-shadow transition-all duration-700 min-h-[360px] flex flex-col justify-between ${
                phase === 'UNSEALING' ? 'scale-105 shadow-2xl' : ''
              }`}
              style={{
                backgroundImage: `radial-gradient(rgba(44, 36, 31, 0.04) 1px, transparent 0)`,
                backgroundSize: '16px 16px',
              }}
            >
              {/* Top row: Postage Stamp & Postmark */}
              <div className="flex items-start justify-between">
                <div className="text-left space-y-1">
                  <div className="text-[9px] font-mono tracking-widest text-[#7E6E62] uppercase">
                    DISPATCHED FROM:
                  </div>
                  <div className="font-serif text-lg font-medium text-[#241D18]">
                    {letterData.fromName || 'Lokesh'}
                  </div>
                  <div className="text-[10px] font-mono text-[#5C4F45]">
                    {letterData.fromLocation || 'OLD-LETTERS Sanctuary No. 4'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Postmark city="OLD-LETTERS" date={letterData.postedDate} />
                  <PostageStamp
                    stampId={letterData.stampId || 'airmail-1928'}
                    accentColor={template.sealColor}
                  />
                </div>
              </div>

              {/* Recipient Title */}
              <div className="my-8 text-center sm:text-left sm:pl-8 border-l-2 border-[#5A2528]/40">
                <div className="text-[9px] font-mono tracking-widest text-[#7E6E62] uppercase">
                  PRIVATE CORRESPONDENCE FOR:
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-[#241D18] italic mt-1 font-medium">
                  {letterData.toName || 'Ananya'}
                </div>
                <div className="text-xs font-serif text-[#5C4F45] mt-0.5">
                  {letterData.toAddress || 'The Old Quarter, Florence'}
                </div>
              </div>

              {/* Bottom Row & The Clickable Wax Seal */}
              <div className="flex items-end justify-between border-t border-[#D8C4A9] pt-4">
                <div className="text-left text-xs font-mono">
                  <div className="text-[9px] text-[#7E6E62]">
                    POSTED: <span>{letterData.postedDate}</span>
                  </div>
                  <div className="text-[#5A2528] font-semibold">
                    DELIVERED: <span>{letterData.arrivalDate}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#5A2528] font-bold mb-1">
                    {sealBroken ? 'SEAL BROKEN' : 'TAP SEAL TO OPEN'}
                  </span>
                  <WaxSeal
                    size="lg"
                    color={template.sealColor}
                    broken={sealBroken}
                    onClick={handleBreakSeal}
                    initial="OL"
                    className="animate-bounce cursor-pointer hover:scale-110 transition-transform"
                  />
                </div>
              </div>

              {/* Paper sliding out overlay during UNSEALING */}
              {phase === 'UNSEALING' && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: -30, opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-x-4 -top-12 bottom-6 bg-[#FAF6EE] rounded-xl shadow-2xl border border-stone-300 flex flex-col items-center justify-center p-6 text-center"
                >
                  <div className="font-serif text-2xl italic text-[#241D18]">
                    Unfolding correspondence...
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* PHASE 5: READING THE LETTER IN INTIMATE PARLOR */}
        {phase === 'READING_LETTER' && (
          <motion.div
            key="phase-reading"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto px-4 py-8 sm:py-12"
          >
            {/* The Manuscript Sheet */}
            <article
              id="unsealed-manuscript"
              className={`rounded-2xl border p-8 sm:p-14 shadow-2xl relative ${template.paperTextureClass}`}
              style={{
                backgroundColor: template.paperBg,
                color: template.inkColor,
              }}
            >
              {template.borderStyle === 'airmail' && (
                <div className="absolute inset-0 airmail-border pointer-events-none opacity-80 rounded-2xl" />
              )}

              {/* Header on unsealed letter */}
              <div className="flex justify-between items-start border-b border-black/10 pb-6 mb-8">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">
                    DISPATCH #{letterData.trackingCode}
                  </div>
                  <div className="font-serif text-sm opacity-80 mt-0.5">
                    {letterData.fromLocation} • {letterData.postedDate}
                  </div>
                </div>

                <Postmark city="OLD-LETTERS" date={letterData.postedDate} />
              </div>

              {/* Salutation */}
              <div className="font-serif text-2xl sm:text-3xl font-medium mb-8">
                Dear {letterData.toName || 'Ananya'},
              </div>

              {/* Body */}
              <div
                className={`text-lg sm:text-xl leading-relaxed whitespace-pre-wrap ${
                  template.fontFamily === 'script'
                    ? 'font-handwriting text-2xl'
                    : template.fontFamily === 'mono'
                    ? 'font-mono'
                    : 'font-serif'
                }`}
              >
                {letterData.letterBody}
              </div>

              {/* Sign-off */}
              <div className="border-t border-black/10 pt-8 mt-12 flex justify-between items-end">
                <div>
                  <div className="text-sm font-serif italic opacity-75">With warmth,</div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold mt-1">
                    {letterData.signature || letterData.fromName || 'Lokesh'}
                  </div>
                </div>

                <WaxSeal size="md" color={template.sealColor} initial="OL" broken />
              </div>
            </article>

            {/* Polaroid Enclosure if attached */}
            {letterData.photoAttachment && (
              <div className="mt-8 flex justify-center">
                <div className="bg-white p-4 pb-8 rounded shadow-xl max-w-xs rotate-1 border border-stone-200">
                  <img
                    src={letterData.photoAttachment.url}
                    alt={letterData.photoAttachment.caption}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[4/3] object-cover rounded-xs"
                  />
                  <div className="font-serif italic text-xs text-stone-700 mt-3 text-center">
                    "{letterData.photoAttachment.caption}"
                  </div>
                </div>
              </div>
            )}

            {/* Super-8 Film Reel if attached */}
            {letterData.videoNote?.isIncluded && (
              <div className="mt-8 max-w-md mx-auto p-5 rounded-xl bg-black text-white border border-stone-800 shadow-xl">
                <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    ENCLOSED SUPER-8 PROJECTION
                  </span>
                  <span>{letterData.videoNote.duration}</span>
                </div>
                <img
                  src={letterData.videoNote.previewUrl}
                  alt="Film reel frame"
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover rounded border border-stone-800 opacity-90 filter contrast-125 sepia-[0.3]"
                />
              </div>
            )}

            {/* THE FINAL REVEAL MOMENT */}
            <div className="max-w-xl mx-auto mt-16 p-8 sm:p-10 rounded-2xl bg-[#241D18] text-[#FAF8F5] border border-stone-700 shadow-2xl text-center space-y-4">
              <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#A88955]">
                POSTAL SECRET
              </div>

              <h3 className="font-serif text-3xl sm:text-4xl font-light text-amber-100">
                There's one more thing.
              </h3>

              <p className="font-serif italic text-lg text-stone-300">
                "Someone is waiting for you in the OLD-LETTERS parlor."
              </p>

              <div className="pt-4 flex justify-center">
                <button
                  id="meet-them-btn"
                  onClick={onEnterMeetingRoom}
                  className="px-8 py-4 bg-[#5A2528] hover:bg-[#733034] text-white text-xs font-mono tracking-widest uppercase rounded-full shadow-lg transition-all duration-300 flex items-center gap-3 font-semibold active:scale-98"
                >
                  <Heart className="w-4 h-4 text-rose-300" />
                  <span>Meet Them in Parlor →</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
