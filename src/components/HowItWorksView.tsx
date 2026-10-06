/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface HowItWorksViewProps {
  onStartWriting: () => void;
  onBack: () => void;
  onNavigate?: (view: any) => void;
}

interface FAQItem {
  question: string;
  directAnswer: string;
  explanation: string;
}

interface LifecycleStepItem {
  step: string;
  title: string;
  summary: string;
  detail: string;
}

const CORRESPONDENCE_LIFECYCLE_STEPS: LifecycleStepItem[] = [
  {
    step: '01',
    title: 'Write a letter',
    summary: 'Compose your correspondence on curated tactile stationery designed for emotional resonance.',
    detail: 'Choose an intention—romantic, formal, gratitude, apology, or memorial—and pen your thoughts with deliberate slowness without real-time pressure.',
  },
  {
    step: '02',
    title: 'Choose recipient and delivery timing',
    summary: 'Appoint the recipient contact details and intentional transit interval.',
    detail: 'Select the standard 48-hour transit vault, reflective 7-day pacing, 30-day memorial waiting, or an appointed future calendar date.',
  },
  {
    step: '03',
    title: 'Optionally add a voice or video personal message',
    summary: 'Letters are free. Senders may optionally attach a private personal media enclosure.',
    detail: 'Attach a spoken voice note (₹99) or personal video recording (₹149) while the written letter itself remains free of charge.',
  },
  {
    step: '04',
    title: 'Submit payment where applicable',
    summary: 'Transfer the enclosure fee via UPI if attaching voice or video.',
    detail: 'Scan the Bureau UPI QR code and enter your authentic 12-digit transaction reference (UTR) for transparent administrative accounting.',
  },
  {
    step: '05',
    title: 'Record and preview personal message',
    summary: 'Record audio or video directly in the browser studio (up to 120 seconds).',
    detail: 'Listen to or watch your playback in the studio to confirm tone and clarity before sealing the envelope.',
  },
  {
    step: '06',
    title: 'Submit the letter for verification',
    summary: 'Post the completed dispatch into the encrypted postal vault.',
    detail: 'The letter is sealed with cryptographic integrity, assigned a tracking code, and held in transit; no impulsive editing is permitted.',
  },
  {
    step: '07',
    title: 'Payment is reviewed',
    summary: 'Bureau administrators verify the UTR against postal banking records.',
    detail: 'Verification status is tracked in real-time in your Bureau Archive with automated dispatch notifications sent to your email.',
  },
  {
    step: '08',
    title: 'Approved personal media is delivered with the letter',
    summary: 'Verified media is securely attached to the letter arrival salon.',
    detail: 'When the arrival timestamp opens, the recipient unseals both the stationery parchment and the authentic multimedia player.',
  },
  {
    step: '09',
    title: 'Rejected payment results in letter-only delivery',
    summary: 'The written letter is never delayed or cancelled due to payment issues.',
    detail: 'If payment verification fails or is rejected, the written letter is still faithfully delivered at the scheduled time with the enclosure excluded.',
  },
  {
    step: '10',
    title: 'Personal media is deleted according to retention policy',
    summary: 'Strict data privacy controls protect all recorded media.',
    detail: 'Unverified or rejected media enters a 7-day grace window before automated, permanent cryptographic purging from private storage.',
  },
];

const POSTAL_FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is OLD-LETTERS?',
    directAnswer:
      'OLD-LETTERS is a modern digital correspondence platform that restores the intentional ceremony of handwritten mail by allowing senders to compose letters, seal them in transit, and deliver them at a chosen future date.',
    explanation:
      'Unlike instant messaging apps optimized for rapid, fragmented exchanges, OLD-LETTERS uses deliberate delivery delays (such as 48-hour transit or specific future milestones) so messages arrive with emotional gravity and permanence.',
  },
  {
    question: 'How does OLD-LETTERS work?',
    directAnswer:
      'Senders select a tactile stationery template, write their message, enter recipient contact details, choose an arrival date, optionally attach a private voice or video enclosure, and post the letter into an encrypted transit vault.',
    explanation:
      'Once posted, the letter cannot be edited or recalled impulsively. When the scheduled date arrives, the recipient receives an email notification with a secure arrival link to unseal the correspondence.',
  },
  {
    question: 'Who is OLD-LETTERS for?',
    directAnswer:
      'OLD-LETTERS is designed for anyone wishing to send thoughtful, enduring words—including letters of love, gratitude, apology, anniversary milestones, encouragement, or letters to one’s future self.',
    explanation:
      'It caters to correspondents who value reflection, privacy, and meaningful timing over ephemeral real-time notifications.',
  },
  {
    question: 'How do scheduled letters work?',
    directAnswer:
      'Senders choose an arrival timeline—either the standard 48-hour transit or a custom future calendar date. The letter remains locked in the postal vault until that exact scheduled timestamp.',
    explanation:
      'Background delivery workers monitor scheduled letters and release the recipient notification email only when the appointed arrival window opens.',
  },
  {
    question: 'What happens after a letter is submitted?',
    directAnswer:
      'The letter is assigned a unique cryptographic tracking code, sealed in the database, and scheduled for arrival. The sender receives an immediate dispatch confirmation receipt.',
    explanation:
      'If an optional personal media enclosure with UPI payment was included, the payment transaction enters manual verification by the bureau admin while the written letter remains scheduled.',
  },
  {
    question: 'How are payments verified?',
    directAnswer:
      'Letters are completely free of charge. For optional personal media enclosures (₹99 for Voice Notes, ₹149 for Video Notes), senders submit their UPI transaction reference (UTR) after payment. Bureau administrators manually verify the UTR against postal banking records in the admin dashboard.',
    explanation:
      'Both sender and administrative audit logs track the verification status in real time to ensure transparent, accountable processing.',
  },
  {
    question: 'What happens when payment verification is rejected?',
    directAnswer:
      'If payment verification fails or is rejected, the written letter itself is still faithfully delivered at the scheduled arrival time, but the personal media attachment is safely excluded from delivery.',
    explanation:
      'The sender is notified via email, and the unverified media enters a 7-day deletion grace period before automatic permanent removal from storage.',
  },
  {
    question: 'How do voice/video personal messages work?',
    directAnswer:
      'Senders can record an in-browser audio or video message (up to 120 seconds) directly in the letter composer. The recording is encrypted and stored in secure cloud storage until verified and released upon arrival.',
    explanation:
      'Once verified, the recipient can play the voice or video recording in an elegant wax-sealed media player inside their letter experience.',
  },
  {
    question: 'When does the recipient receive the letter?',
    directAnswer:
      'The recipient receives a delivery notification email containing their secure private arrival link at the exact scheduled arrival date and time selected by the sender.',
    explanation:
      'Prior to delivery, the letter cannot be viewed or unsealed by the recipient, preserving genuine anticipation.',
  },
  {
    question: 'How is private media handled?',
    directAnswer:
      'All uploaded voice and video recordings are protected behind authenticated and token-gated API endpoints, with access restricted strictly to the verified recipient upon letter arrival.',
    explanation:
      'Unapproved media is permanently purged after 7 days, and users maintain complete rights to request data deletion under international privacy standards.',
  },
];

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({
  onStartWriting,
  onBack,
  onNavigate,
}) => {
  return (
    <main
      className="max-w-4xl mx-auto px-6 sm:px-12 py-16 space-y-20 bg-[#faf9f7] text-teal-900"
      role="main"
      aria-label="Postal Protocol and Frequently Asked Questions"
    >
      {/* Editorial Header */}
      <header className="space-y-4 text-center">
        <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
          POSTAL PROTOCOL & PHILOSOPHY
        </span>
        <h1
          className="text-4xl sm:text-6xl text-teal-900 font-extralight"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          On Taking Time
        </h1>
        <p
          className="italic text-teal-900/80 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          &ldquo;The emotional resonance of a letter lives in the interval between writing and receiving.&rdquo;
        </p>
      </header>

      {/* Philosophy Pillars */}
      <section
        className="space-y-16 border-t border-[#eae4da] pt-16"
        aria-labelledby="philosophy-heading"
      >
        <h2 id="philosophy-heading" className="sr-only">
          The Three Pillars of Digital Correspondence
        </h2>

        {/* Pillar 1 */}
        <article className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 text-[11px] font-mono uppercase text-stone-500 tracking-wider">
            1. THE VELOCITY PROBLEM
          </div>
          <div
            className="md:col-span-8 space-y-4 text-lg sm:text-xl text-stone-800 leading-relaxed font-serif"
          >
            <p>
              When conversations happen in real-time text bubbles, we optimize for speed over reflection. We reply before we have digested what the other person has said.
            </p>
            <p className="text-stone-600 font-sans text-sm leading-relaxed">
              OLD-LETTERS introduces deliberate friction: an intentional waiting duration that allows your words to arrive when they matter most.
            </p>
          </div>
        </article>

        {/* Pillar 2 */}
        <article className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-t border-[#eae4da] pt-12">
          <div className="md:col-span-4 text-[11px] font-mono uppercase text-stone-500 tracking-wider">
            2. THE 48-HOUR VAULT
          </div>
          <div
            className="md:col-span-8 space-y-4 text-lg sm:text-xl text-stone-800 leading-relaxed font-serif"
          >
            <p>
              When you post a letter to someone, it enters an encrypted transit vault. Neither the sender can recall it impulsively, nor can the recipient break the seal before the scheduled hour.
            </p>
            <p className="text-stone-600 font-sans text-sm leading-relaxed">
              Waiting transforms reading from a casual glance into an event.
            </p>
          </div>
        </article>

        {/* Pillar 3 */}
        <article className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-t border-[#eae4da] pt-12">
          <div className="md:col-span-4 text-[11px] font-mono uppercase text-stone-500 tracking-wider">
            3. CEREMONY & PRIVACY
          </div>
          <div
            className="md:col-span-8 space-y-4 text-lg sm:text-xl text-stone-800 leading-relaxed font-serif"
          >
            <p>
              When the arrival moment comes, the recipient opens a private salon. The wax seal breaks, the paper unfolds, and they read your words without notifications, likes, or comments.
            </p>
            <p className="text-stone-600 font-sans text-sm leading-relaxed">
              It is as personal as traditional post, reimagined for the digital era.
            </p>
          </div>
        </article>
      </section>

      {/* The Correspondence Lifecycle: 10-Stage Postal Protocol */}
      <section
        id="correspondence-lifecycle"
        className="space-y-12 border-t border-[#eae4da] pt-16"
        aria-labelledby="lifecycle-heading"
      >
        <div className="space-y-3 text-center sm:text-left">
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
            CHRONOLOGICAL DISPATCH PROTOCOL
          </span>
          <h2
            id="lifecycle-heading"
            className="text-3xl sm:text-4xl text-teal-950 font-normal tracking-tight font-serif"
          >
            The Correspondence Lifecycle
          </h2>
          <p className="text-stone-600 text-sm font-sans max-w-2xl leading-relaxed">
            The canonical ten-stage journey from composition and sealed vault transit to unsealing and privacy preservation.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0">
          {CORRESPONDENCE_LIFECYCLE_STEPS.map((step) => (
            <li
              key={step.step}
              className="p-6 bg-white border border-[#eae4da] rounded-xs shadow-paper-xs space-y-2.5 transition-all hover:border-stone-300"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-mono font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-xs">
                  STAGE {step.step}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  PROTOCOL VERIFIED
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-serif text-teal-950 font-medium pt-1">
                {step.title}
              </h3>
              <p className="font-sans text-xs sm:text-sm text-stone-800 font-medium leading-relaxed">
                {step.summary}
              </p>
              <p className="font-sans text-xs text-stone-600 leading-relaxed">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Answer Engine Optimization (AEO / GEO) FAQ Section */}
      <section
        id="faq-ledger"
        className="space-y-12 border-t border-[#eae4da] pt-16"
        aria-labelledby="faq-section-title"
      >
        <div className="space-y-3 text-center sm:text-left">
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-stone-500">
            DIGITAL POSTAL LEDGER · COMMON INQUIRIES
          </span>
          <h2
            id="faq-section-title"
            className="text-3xl sm:text-4xl text-teal-950 font-normal tracking-tight font-serif"
          >
            Frequently Answered Questions
          </h2>
          <p className="text-stone-600 text-sm font-sans max-w-2xl leading-relaxed">
            Essential operational details concerning scheduled dispatch, payment verification, and cryptographic delivery integrity.
          </p>
        </div>

        <div className="space-y-6">
          {POSTAL_FAQ_ITEMS.map((item, idx) => (
            <article
              key={idx}
              className="p-6 sm:p-8 bg-white border border-[#eae4da] rounded-xs shadow-paper-xs space-y-3"
            >
              <h3 className="text-lg sm:text-xl font-serif text-teal-950 font-medium">
                {item.question}
              </h3>
              <p className="font-sans text-sm text-stone-800 font-medium leading-relaxed">
                {item.directAnswer}
              </p>
              <p className="font-sans text-xs sm:text-sm text-stone-600 leading-relaxed">
                {item.explanation}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Call to Action Box */}
      <section
        className="p-10 bg-white border border-[#eae4da] shadow-paper-sm rounded-xs text-center space-y-6"
        aria-label="Start Correspondence"
      >
        <h3
          className="text-2xl sm:text-3xl text-teal-900 font-light font-serif"
        >
          Write something worth waiting for.
        </h3>
        <p className="text-sm font-sans text-stone-600 max-w-md mx-auto">
          Begin writing on curated stationery. Choose your recipient and delivery tempo.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={onStartWriting}
            className="rounded-sm bg-teal-900 px-8 py-3 text-xs uppercase tracking-wider font-medium text-white shadow-xs hover:bg-teal-800 transition-colors cursor-pointer"
          >
            Compose Letter →
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-stone-300 text-stone-700 hover:text-teal-900 font-sans text-xs tracking-wider uppercase rounded-xs transition-colors cursor-pointer"
          >
            Return to Desk
          </button>
        </div>

        {/* Informative Policy Links */}
        <div className="pt-6 border-t border-stone-200 text-xs text-stone-500 font-sans flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate?.('privacy')}
            className="hover:text-teal-900 underline underline-offset-4 cursor-pointer"
          >
            Review Privacy Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onNavigate?.('terms')}
            className="hover:text-teal-900 underline underline-offset-4 cursor-pointer"
          >
            Review Terms of Service
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onNavigate?.('cookies')}
            className="hover:text-teal-900 underline underline-offset-4 cursor-pointer"
          >
            Cookie Policy
          </button>
        </div>
      </section>
    </main>
  );
};
