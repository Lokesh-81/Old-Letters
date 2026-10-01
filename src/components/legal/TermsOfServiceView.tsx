import React from 'react';

interface LegalPageProps {
  onBack: () => void;
}

export const TermsOfServiceView: React.FC<LegalPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#141618] font-serif py-12 px-6 sm:px-12">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Bureau Header */}
        <div className="border-b border-[#eae4da] pb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-stone-500 mb-1">
              CENTRAL POSTAL DESK · LEGAL REGISTRY
            </div>
            <h1 className="text-3xl sm:text-4xl text-teal-950 font-normal tracking-tight">
              Terms of Service
            </h1>
            <div className="text-xs font-mono text-stone-400 mt-1">
              Last updated: October 1, 2026
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-xs font-sans uppercase tracking-wider text-teal-900 border border-teal-900/30 hover:border-teal-900 px-4 py-2 rounded-xs bg-white hover:bg-stone-50 transition-colors cursor-pointer"
          >
            ← Return to Desk
          </button>
        </div>

        {/* Informational Policy Notice */}
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xs text-xs font-sans text-amber-900 leading-relaxed">
          <span className="font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
            Informational Legal Notice
          </span>
          These Terms of Service govern the use of the OLD-LETTERS platform.
          They are an informational terms template for user transparency and should be reviewed for jurisdictional legal requirements.
        </div>

        {/* Content Body */}
        <div className="space-y-8 font-sans text-stone-700 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              1. The Digital Postal Agreement
            </h2>
            <p className="font-light">
              By accessing OLD-LETTERS, creating a correspondence account, or composing a letter, you agree to abide by these Terms of Service.
              OLD-LETTERS is an intentional correspondence service designed around deliberate pacing:
              <span className="font-mono text-xs block my-1 font-normal text-teal-950">
                WRITE → SEAL → WAIT → ARRIVE
              </span>
              Our platform deliberately rejects instant delivery in favor of a mandatory minimum waiting interval to cultivate patience,
              mindfulness, and emotional weight.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              2. User Accounts & Security
            </h2>
            <p className="font-light">
              You are responsible for maintaining the confidentiality of your account credentials and for all correspondence dispatched
              under your account. You agree to provide a valid email address and to notify us immediately of any unauthorized access to your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              3. Acceptable Use Policy
            </h2>
            <p className="font-light">
              You agree never to use OLD-LETTERS to compose, seal, or transmit:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li>Harassing, defamatory, threatening, abusive, or hateful content.</li>
              <li>Unsolicited commercial advertising, bulk spam, or fraudulent schemes.</li>
              <li>Material that infringes upon third-party copyrights, trademarks, or privacy rights.</li>
              <li>Malicious payloads, viruses, or code designed to disrupt postal service operations.</li>
            </ul>
            <p className="font-light text-xs text-stone-500">
              The Bureau reserves the right to suspend or terminate accounts that violate our acceptable use standards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              4. Intellectual Property & Letter Ownership
            </h2>
            <p className="font-light">
              You retain complete and exclusive ownership of all prose, personal sentiments, titles, and media you submit.
              OLD-LETTERS does not claim any copyright or ownership over your letters. You grant OLD-LETTERS only the limited technical
              license required to securely store, format, and deliver your letter to your designated recipient.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              5. Delivery Pacing & Best-Effort Transit
            </h2>
            <p className="font-light">
              Letters dispatched through OLD-LETTERS enter our temporal vault and cannot be unsealed prior to their scheduled arrival time.
              While our automated delivery system operates around the clock, electronic message delivery may occasionally experience brief
              transient delays caused by internet routing, recipient mail service filtering, or scheduled maintenance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              6. Manual Payments & Bureau Upgrades
            </h2>
            <p className="font-light">
              Certain premium stationery editions, extended vault durations, or live ceremony sessions may be offered via manual UPI payments.
              Payments are verified by administrative review against bank reference numbers. Approved features are unlocked permanently or
              for the designated correspondence item.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              7. Limitation of Liability
            </h2>
            <p className="font-light">
              OLD-LETTERS is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the maximum extent permitted by law,
              OLD-LETTERS shall not be liable for any indirect, incidental, or consequential damages resulting from lost letters, delayed deliveries,
              or unauthorized account access beyond our reasonable security controls.
            </p>
          </section>
        </div>

        {/* Bottom Back Button */}
        <div className="border-t border-[#eae4da] pt-6 flex justify-between items-center">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-sans uppercase tracking-wider text-teal-900 hover:underline cursor-pointer"
          >
            ← Back to Correspondence Desk
          </button>
          <span className="text-[10px] font-mono text-stone-400">
            OLD-LETTERS REGISTRY NO. T-1892
          </span>
        </div>
      </div>
    </div>
  );
};
