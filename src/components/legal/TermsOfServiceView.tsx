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
              Terms & Conditions
            </h1>
            <div className="text-xs font-mono text-stone-400 mt-1">
              Effective Date: October 1, 2026 · Bureau Reference: TOC-1892
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

        {/* Legal Preamble Notice */}
        <div className="p-4 bg-[#f4efe6] border border-[#e3dacf] rounded-xs text-xs font-sans text-stone-800 leading-relaxed">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono text-teal-900 block mb-1">
            General Correspondence Terms & Operating Agreement
          </span>
          Please read these Terms & Conditions carefully prior to composing, dispatching, or receiving correspondence via OLD-LETTERS.
          By creating an account, dispatching a letter, or accessing a correspondence link, you agree to be bound by these Terms.
        </div>

        {/* Content Body */}
        <div className="space-y-8 font-sans text-stone-700 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              1. Digital Correspondence Service
            </h2>
            <p className="font-light">
              OLD-LETTERS operates a specialized digital correspondence service built on intentional pacing and mindful communication.
              Unlike instant messaging or conventional email, our platform introduces a deliberate temporal passage—with a mandatory
              minimum waiting interval of 48 hours—allowing words to carry the emotional gravitas, anticipation, and permanence of
              traditional paper post.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              2. User Responsibilities & Recipient Accuracy
            </h2>
            <p className="font-light">
              Users are solely responsible for the information, salutations, body content, attachments, and recipient information they provide.
              You must supply a valid, working, and accessible email address for your intended recipient.
            </p>
            <p className="font-light">
              <strong>Pre-Dispatch Verification:</strong> You must carefully verify recipient contact details before sealing and dispatching a letter.
              Because letters enter our automated correspondence vault immediately upon sealing, OLD-LETTERS cannot verify the accuracy of recipient
              addresses and assumes no responsibility for letters sent to invalid, outdated, or mistyped email addresses.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              3. Acceptable Use & Prohibited Content
            </h2>
            <p className="font-light">
              OLD-LETTERS is dedicated to thoughtful, personal, and artistic correspondence. You agree not to use the service for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li>Illegal, harmful, abusive, fraudulent, harassing, defamatory, or threatening communications.</li>
              <li>Hate speech, extortion, blackmail, or intimidation of any kind.</li>
              <li>Unsolicited commercial advertisements, bulk marketing, scams, or chain correspondence.</li>
              <li>Infringing on intellectual property rights, privacy rights, or trade secrets of third parties.</li>
              <li>Transmitting malware, computer viruses, phishing links, or destructive code.</li>
            </ul>
            <p className="font-light text-xs text-stone-500">
              OLD-LETTERS reserves the right, upon notice of violation or legal inquiry, to terminate accounts and suspend transmissions that breach this section.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              4. Delivery Timing, System Schedules & Technical Disclaimers
            </h2>
            <p className="font-light">
              Delivery timing is based on the selected delivery schedule (minimum 48 hours). All delivery, arrival, and unsealing timestamps
              are system-generated by our automated scheduling infrastructure.
            </p>
            <p className="font-light">
              While our system processes scheduled dispatches around the clock, electronic transmissions and notifications may be affected by
              technical issues beyond our control, including internet routing delays, recipient email service spam filters, local network disruptions,
              server maintenance, or third-party email provider outages. OLD-LETTERS makes best-effort commitments to dispatch notifications at the
              appointed hour, but cannot make unrealistic guarantees of instantaneous inbox delivery.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              5. Finality of Dispatch & Non-Refundable Payment Policy
            </h2>
            <p className="font-light">
              <strong>Irrevocability of Dispatched Letters:</strong> Once a letter has been sealed and submitted, it enters our secure archival
              vault and delivery pipeline. Changing, altering, editing, or cancelling a dispatched letter may not be possible once it has entered
              the delivery process.
            </p>
            <p className="font-light">
              <strong>Non-Refundable Policy:</strong> Once a letter, custom stationery upgrade, multimedia enclosure, or paid correspondence feature
              has been successfully submitted, all payments and fees are <strong>NON-REFUNDABLE</strong>, except where explicitly required by applicable
              statutory law or where OLD-LETTERS explicitly approves a refund in writing under exceptional administrative discretion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              6. Sealed Correspondence & Security Verification
            </h2>
            <p className="font-light">
              <strong>Sealed Transit Guarantee:</strong> OLD-LETTERS treats sealed correspondence with strict confidentiality and does not reveal sealed
              letter contents to recipients, third parties, or public previews before the scheduled opening time has arrived.
            </p>
            <p className="font-light">
              <strong>Recipient Verification:</strong> Security verification (such as an email one-time passcode [OTP] or a secret passphrase chosen
              by the sender) may be required before the recipient is permitted to unseal and read the letter upon arrival.
            </p>
            <p className="font-light">
              <strong>Account & Verification Protection:</strong> Users and recipients are responsible for protecting access to their email accounts,
              devices, and verification codes. OLD-LETTERS is not responsible for unauthorized letter openings resulting from compromised recipient email
              inboxes or shared verification credentials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              7. Intellectual Property & Authorship
            </h2>
            <p className="font-light">
              You retain all ownership, moral rights, and copyright in the text, thoughts, titles, and multimedia enclosures you compose.
              OLD-LETTERS claims no ownership over your private correspondence. You grant OLD-LETTERS only the limited, non-exclusive technical
              license to store, transmit, format, and display the letter to your intended recipient in accordance with these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              8. Limitation of Liability
            </h2>
            <p className="font-light">
              To the maximum extent permitted by applicable law, OLD-LETTERS is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
              basis without warranties of any kind, whether express or implied. Under no circumstances shall OLD-LETTERS, its operators, or affiliates
              be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of your use of the service,
              delayed notifications, recipient email rejection, or unauthorized unsealing due to third-party actions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              9. Contact & Inquiries
            </h2>
            <p className="font-light">
              Questions regarding these Terms & Conditions may be directed to our postal desk administration at
              <code className="font-mono text-xs ml-1 text-teal-950">admin@oldletters.in</code>.
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
            OLD-LETTERS LEGAL REGISTRY · T-1892
          </span>
        </div>
      </div>
    </div>
  );
};
