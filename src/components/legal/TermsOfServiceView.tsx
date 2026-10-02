import React from 'react';
import { CURRENT_TERMS_VERSION } from '../../types/backend';

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
              Version: {CURRENT_TERMS_VERSION} · Effective Date: October 1, 2026 · Bureau Registry Ref: TOC-1892
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
            General Correspondence Operating Agreement (Version {CURRENT_TERMS_VERSION})
          </span>
          Please read these Terms of Service carefully prior to creating an account, composing, sealing, or receiving correspondence via OLD-LETTERS.
          By creating an account, continuing with Google, dispatching a letter, or accessing a correspondence link, you explicitly accept and agree to be bound by these Terms and our Privacy Policy.
        </div>

        {/* Content Body */}
        <div className="space-y-8 font-sans text-stone-700 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              1. Digital Correspondence & Paced Delivery Service
            </h2>
            <p className="font-light">
              OLD-LETTERS is a modern luxury digital correspondence service designed around intentional pacing, patience, and mindful communication.
              Unlike instant messaging services or ephemeral electronic mail, our platform operates an automated correspondence vault with a
              strict mandatory minimum transit interval of <strong>48 hours</strong> (or a longer future date selected by the sender).
            </p>
            <p className="font-light">
              Letters submitted to OLD-LETTERS are sealed cryptographically and held securely in transit until the appointed arrival timestamp.
              No premature access or early unsealing is permitted before the full transit duration has elapsed.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              2. User Responsibilities & Recipient Accuracy
            </h2>
            <p className="font-light">
              Users are solely responsible for the accuracy and completeness of all information provided during the letter composition and sealing process:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li><strong>Recipient Email & Address Accuracy:</strong> You must supply a valid, active, and accessible email address for your intended recipient. OLD-LETTERS cannot verify whether recipient mailboxes exist, are currently monitored, or have active spam filtering rules.</li>
              <li><strong>Pre-Dispatch Verification:</strong> Because letters enter our automated correspondence vault immediately upon sealing, OLD-LETTERS assumes no responsibility for letters sent to misspelled, outdated, closed, or unintended email addresses.</li>
              <li><strong>Author Responsibility:</strong> You retain full responsibility for all words, thoughts, salutations, body content, and enclosed media you submit.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              3. Account Registration & Security Responsibilities
            </h2>
            <p className="font-light">
              To compose, seal, or archive letters, you must establish an account using email credentials or Google Single Sign-On (OAuth).
              By creating an account, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li>Provide accurate, current, and truthful identification details.</li>
              <li>Maintain the confidentiality of your login credentials, passwords, and authentication sessions.</li>
              <li>Accept responsibility for all activities, dispatches, and transactions that occur under your account.</li>
              <li>Notify the Postal Desk immediately at <code className="font-mono text-xs text-teal-950">admin@oldletters.in</code> if you discover or suspect unauthorized access to your account.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              4. Prohibited Content & Abusive Conduct
            </h2>
            <p className="font-light">
              OLD-LETTERS is dedicated to thoughtful, personal, and respectful correspondence. You strictly agree not to transmit:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li>Unlawful, harassing, defamatory, abusive, threatening, obscene, or fraudulent content.</li>
              <li>Extortion, blackmail, intimidation, hate speech, or incitement of violence against any individual or group.</li>
              <li>Unsolicited commercial advertisements, spam, mass marketing schemes, chain letters, or pyramid proposals.</li>
              <li>Malicious code, spyware, viruses, trojans, phishing attempts, or destructive attachments.</li>
              <li>Content that violates the intellectual property, copyright, moral rights, or privacy rights of any third party.</li>
            </ul>
            <p className="font-light text-xs text-stone-500">
              OLD-LETTERS reserves the right to suspend or terminate accounts and block transmissions that breach these conduct standards.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              5. Delivery Timing & Automated Scheduling Infrastructure
            </h2>
            <p className="font-light">
              Scheduled deliveries, arrival notifications, and lifecycle status transitions are processed around the clock by automated
              scheduling infrastructure (including Vercel Cron and automated cron workers).
            </p>
            <p className="font-light">
              <strong>Technical & Network Limitations:</strong> While OLD-LETTERS makes every effort to execute delivery transitions and email notifications
              at the appointed timestamp, electronic transmissions may occasionally experience delays due to factors beyond our reasonable control,
              including third-party email service provider outages, spam filters, network packet routing delays, server maintenance, or internet connectivity issues.
              Scheduled arrival timestamps reflect the official opening eligibility of the correspondence in our vault.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              6. Sealed Correspondence & Recipient Verification Mechanisms
            </h2>
            <p className="font-light">
              <strong>Sealed Transit Guarantee:</strong> OLD-LETTERS maintains the inviolable confidentiality of sealed mail. Neither recipients nor third parties
              can inspect letter text or attachments prior to the scheduled delivery date.
            </p>
            <p className="font-light">
              <strong>Security Verification Options:</strong> Depending on the sender&apos;s choice during composition, recipient unsealing may require:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li><strong>Open Verification:</strong> Immediate opening upon arrival via confidential delivery token.</li>
              <li><strong>One-Time Passcode (OTP):</strong> A 6-digit numeric verification code dispatched to the recipient&apos;s email address when delivery is due.</li>
              <li><strong>Secret Passphrase:</strong> A confidential passphrase known only to the sender and recipient, hashed securely on our servers.</li>
            </ul>
            <p className="font-light text-xs text-stone-500">
              Recipients are responsible for safeguarding verification codes. OLD-LETTERS is not liable for unauthorized access resulting from shared or compromised recipient inboxes.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              7. Payment Procedures, Administrative Verification & Non-Refundable Payment Policy
            </h2>
            <p className="font-light">
              Certain features on OLD-LETTERS (such as voice enclosures, keepsake video notes, or premium stationery) may require payment:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li><strong>Payment Submission & Proof:</strong> Payments are processed via manual UPI or designated payment methods. Users must provide an accurate transaction reference (UTR number) and may upload optional payment receipt proof.</li>
              <li><strong>Administrative Verification:</strong> All payment submissions are placed in a <code>PENDING</code> state by default and verified administratively by the Central Postal Desk before paid features are unlocked.</li>
              <li><strong>Irrevocability of Dispatched Post:</strong> Once a letter has been sealed and dispatched into transit, it enters our archival vault and cannot be modified or withdrawn.</li>
            </ul>
            <div className="p-4 bg-stone-100 border border-stone-300 rounded-xs text-xs font-sans text-stone-900 leading-relaxed space-y-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] font-mono text-teal-950 block">
                NON-REFUNDABLE PAYMENT POLICY
              </span>
              <p>
                Payments made for OLD-LETTERS services, including letters, stationery upgrades, multimedia enclosures, and digital correspondence features,
                are <strong>NON-REFUNDABLE</strong> once submitted, except where a refund is strictly required by applicable consumer-protection laws
                or is expressly approved in writing by OLD-LETTERS under extraordinary circumstances at our sole discretion.
              </p>
              <p className="text-stone-500 text-[11px]">
                Nothing in this section shall be interpreted to exclude, restrict, or modify any statutory consumer guarantee, right, or remedy conferred by applicable law that cannot be lawfully excluded.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              8. Privacy, Data Handling & Intellectual Property
            </h2>
            <p className="font-light">
              <strong>Your Authorship:</strong> You retain all intellectual property, copyright, and moral rights in the correspondence you compose.
              OLD-LETTERS claims no ownership of your personal writings. You grant us only the limited, non-exclusive technical license to store, format,
              encrypt, and transmit your letter to the recipient in accordance with your delivery instructions.
            </p>
            <p className="font-light">
              <strong>Data Handling:</strong> Our collection and processing of personal information, account credentials, and correspondence metadata
              are governed strictly by our <a href="/privacy" className="text-teal-900 underline hover:text-teal-950">Privacy Policy</a>.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              9. Termination & Account Suspension
            </h2>
            <p className="font-light">
              OLD-LETTERS reserves the right to suspend, restrict, or terminate account access and delivery privileges immediately, without prior notice,
              if a user breaches these Terms, engages in fraudulent payment claims, transmits prohibited content, or misuses the platform.
              Users may request account closure and data deletion at any time by contacting our postal administration.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              10. Limitation of Liability & Disclaimers
            </h2>
            <p className="font-light">
              OLD-LETTERS is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the maximum extent permitted by applicable law,
              OLD-LETTERS and its operators disclaim all warranties, express or implied. Under no circumstances shall OLD-LETTERS be liable for indirect,
              incidental, consequential, special, or punitive damages arising from the use of the service, email delivery delays, recipient mailbox rejections,
              or technical interruptions.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              11. Contact & Postal Desk Support
            </h2>
            <p className="font-light">
              For questions regarding these Terms of Service, administrative inquiries, or assistance with your correspondence,
              please reach out to the Central Postal Desk:
            </p>
            <div className="font-mono text-xs bg-white p-3 border border-[#eae4da] rounded-xs space-y-1">
              <div>Email: <a href="mailto:admin@oldletters.in" className="text-teal-900 underline">admin@oldletters.in</a></div>
              <div>Bureau Reference: Central Postal Conservancy · OLD-LETTERS Legal Registry</div>
            </div>
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
            OLD-LETTERS LEGAL REGISTRY · TOC-{CURRENT_TERMS_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
};
