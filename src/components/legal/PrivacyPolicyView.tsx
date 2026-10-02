import React from 'react';
import { CURRENT_PRIVACY_VERSION } from '../../types/backend';

interface LegalPageProps {
  onBack: () => void;
}

export const PrivacyPolicyView: React.FC<LegalPageProps> = ({ onBack }) => {
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
              Privacy Policy
            </h1>
            <div className="text-xs font-mono text-stone-400 mt-1">
              Version: {CURRENT_PRIVACY_VERSION} · Last Updated: October 1, 2026 · Bureau Registry Ref: PRIV-1892
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
        <div className="p-4 bg-[#f4efe6] border border-[#e3dacf] rounded-xs text-xs font-sans text-stone-800 leading-relaxed">
          <span className="font-semibold uppercase tracking-wider text-[10px] font-mono text-teal-900 block mb-1">
            Privacy Transparency Notice (Version {CURRENT_PRIVACY_VERSION})
          </span>
          This Privacy Policy accurately discloses the specific personal data, correspondence metadata, security credentials,
          and technical records processed by OLD-LETTERS. We hold your correspondence with strict confidentiality and never sell your personal information.
        </div>

        {/* Content Body */}
        <div className="space-y-8 font-sans text-stone-700 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              1. The Sanctity of Private Correspondence
            </h2>
            <p className="font-light">
              At OLD-LETTERS, private communication is treated with the dignity and inviolable confidentiality traditionally accorded to wax-sealed paper post.
              We do not mine your letters for advertising, train public AI models on your private messages, or sell, rent, or trade your contact information
              with third-party marketing brokers.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              2. Information We Collect & Process
            </h2>
            <p className="font-light">
              We collect and process only the data strictly required to compose, seal, schedule, verify, and deliver your letters:
            </p>
            <ul className="list-disc pl-5 space-y-2 font-light text-xs sm:text-sm">
              <li>
                <strong>Account & Profile Information:</strong> Full name, email address, password cryptographically hashed using <em>bcrypt</em> (we never store plain-text passwords), and profile avatar URLs.
              </li>
              <li>
                <strong>Google Account Information:</strong> When you choose to authenticate via Google OAuth, we receive your verified Google email address, profile display name, avatar photograph URL, and unique Google account identifier. We do not access your Google contacts, Google Drive, or personal Google inbox.
              </li>
              <li>
                <strong>Legal Consent Records:</strong> Timestamps of legal agreement (<code>legalConsentAt</code>), accepted version identifiers (<code>termsVersion</code>, <code>privacyVersion</code>), and boolean consent indicators (<code>termsAccepted</code>, <code>privacyAccepted</code>).
              </li>
              <li>
                <strong>Sender & Recipient Information:</strong> Sender display name, sender email, recipient display name, and recipient destination email address.
              </li>
              <li>
                <strong>Letter Content & Styling:</strong> Salutation greeting, letter body text, signoff closing, selected paper stationery theme, typography settings, wax seal color/emblem, and postmark city.
              </li>
              <li>
                <strong>Letter Metadata & Scheduling:</strong> Tracking code (e.g. <code>OL-1892-A</code>), creation timestamp, scheduled delivery arrival date and time, waiting interval (minimum 48 hours), transit lifecycle status (<code>SCHEDULED</code>, <code>DELIVERED</code>, <code>OPENED</code>), and unsealing timestamps.
              </li>
              <li>
                <strong>Multimedia Enclosures & Attachments:</strong> Archival photographs, voice notes, or video keepsakes you choose to upload, stored in encrypted private database object storage (MongoDB GridFS).
              </li>
              <li>
                <strong>Security & Verification Credentials:</strong> Cryptographic SHA-256 hashes of one-time passcodes (OTPs), hashed secret passphrases, delivery access tokens, and rate-limiting attempt counters to prevent unauthorized unsealing.
              </li>
              <li>
                <strong>Payment & Verification Records:</strong> When requesting paid correspondence features, we record the chosen feature code, amount, currency, manual UPI transaction reference (UTR number), optional uploaded payment receipt screenshot, and administrative verification decisions (approved, rejected, verified timestamp, admin notes).
              </li>
              <li>
                <strong>Delivery Dispatch & Lifecycle Events:</strong> Event records for dispatched notices (T+0h dispatch receipt, T+24h halfway waiting update, T+47.5h pre-arrival notice, and T+48h arrival eligibility notification) including delivery timestamps and dispatch status.
              </li>
              <li>
                <strong>Session & Essential Cookies:</strong> An HTTP-only, secure JSON Web Token (JWT) session cookie (<code>oldletters_session</code>) and local browser cookie consent choices (<code>oldletters_cookie_consent</code>).
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              3. Purpose & Legal Basis for Processing
            </h2>
            <p className="font-light">
              Your personal data and correspondence are processed exclusively for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li>Authenticating your user session and providing access to your private correspondence archive.</li>
              <li>Holding sealed letters securely in our transit vault until the scheduled arrival time.</li>
              <li>Sending automated ceremonial notifications (T+0h, T+24h, T+47.5h, and T+48h) via our mailroom.</li>
              <li>Verifying recipient credentials (tokens, passphrases, or OTP codes) before permitting unsealing.</li>
              <li>Administering and verifying optional manual UPI feature payments.</li>
              <li>Preventing spam, abuse, unauthorized access, and malicious activity.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              4. Third-Party Infrastructure & Service Providers
            </h2>
            <p className="font-light">
              We rely on trusted, industry-standard third-party providers strictly for operational infrastructure:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li><strong>MongoDB Atlas:</strong> Secure cloud database provider where correspondence records, accounts, and encrypted attachments are housed with transport and resting encryption.</li>
              <li><strong>Google OAuth 2.0:</strong> Optional single sign-on authentication provider.</li>
              <li><strong>Gmail SMTP:</strong> Transactional email delivery service used strictly to dispatch automated correspondence and arrival notifications.</li>
              <li><strong>Vercel:</strong> Cloud hosting platform executing our application and scheduled cron delivery workers.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              5. Data Security Measures
            </h2>
            <p className="font-light">
              We implement comprehensive technical and organizational safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li>All web traffic and API endpoints are encrypted in transit via Transport Layer Security (TLS/HTTPS).</li>
              <li>Account passwords are salted and hashed using bcrypt; plain-text passwords are never recorded or logged.</li>
              <li>Session tokens are issued as secure, HTTP-only JWT cookies that cannot be accessed or tampered with by client-side browser scripts.</li>
              <li>Recipient verification secrets and OTPs are stored only as one-way SHA-256 hashes with strict attempt limits.</li>
              <li>Sealed letter contents remain encrypted and locked against recipient display until the scheduled delivery timestamp has arrived.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              6. Data Retention & Deletion Rights
            </h2>
            <p className="font-light">
              Correspondence records and archived letters are retained in your personal sender archive so long as your account remains active.
              You have the right at any time to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li>Inspect your archived correspondence and delivery records.</li>
              <li>Update your account display name or credentials.</li>
              <li>Request the complete and permanent deletion of your account, correspondence history, and attached media.</li>
            </ul>
            <p className="font-light text-xs text-stone-500">
              To request account deletion or data export, contact our postal administrator at <code className="font-mono text-xs text-teal-950">admin@oldletters.in</code>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              7. Contact & Data Protection Inquiries
            </h2>
            <p className="font-light">
              If you have questions, feedback, or data privacy requests concerning this Privacy Policy, please contact our Postal Desk:
            </p>
            <div className="font-mono text-xs bg-white p-3 border border-[#eae4da] rounded-xs space-y-1">
              <div>Email: <a href="mailto:admin@oldletters.in" className="text-teal-900 underline">admin@oldletters.in</a></div>
              <div>Bureau Reference: Central Postal Conservancy · Privacy & Data Protection Registry</div>
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
            OLD-LETTERS PRIVACY REGISTRY · PRIV-{CURRENT_PRIVACY_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
};
