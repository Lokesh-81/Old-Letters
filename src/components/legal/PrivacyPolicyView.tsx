import React from 'react';

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
          This Privacy Policy describes how OLD-LETTERS handles personal correspondence, authentication, and technical data.
          It is an informational policy template for user transparency and should be reviewed for jurisdictional legal compliance.
        </div>

        {/* Content Body */}
        <div className="space-y-8 font-sans text-stone-700 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              1. The Sanctity of Private Correspondence
            </h2>
            <p className="font-light">
              At OLD-LETTERS, we treat every digital letter with the inviolable confidentiality traditionally accorded to sealed physical post.
              Your correspondence belongs entirely to you and your designated recipient. We never sell, rent, or trade your words,
              contact details, or reading habits with advertisers or third-party marketing companies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              2. Information We Collect
            </h2>
            <p className="font-light">
              We collect only the information necessary to compose, seal, schedule, and deliver your letters:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li><strong>Account Credentials:</strong> Your full name, email address, and cryptographically hashed password (via bcrypt), or your Google profile identifier when using Google OAuth.</li>
              <li><strong>Correspondence Details:</strong> Letter type, stationery theme, salutation, body text, valediction, sender name, recipient name, recipient email address, and scheduled delivery timestamp.</li>
              <li><strong>Enclosed Media:</strong> Archival photographs or keepsake attachments you upload, stored securely in private object storage (MongoDB GridFS).</li>
              <li><strong>Delivery & Verification Records:</strong> Cryptographic verification tokens, one-time passcode (OTP) verification hashes, and dispatch timestamps.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              3. How Your Information Is Used
            </h2>
            <p className="font-light">
              Your data is utilized exclusively for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li>Authenticating your account session and providing access to your private correspondence archive.</li>
              <li>Holding letters in our delivery vault until their scheduled arrival interval has elapsed.</li>
              <li>Dispatching ceremonial notification emails to the recipient via our postal delivery service (Resend).</li>
              <li>Verifying recipient identity prior to granting access to the unsealing ceremony.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              4. Data Security & Storage
            </h2>
            <p className="font-light">
              All correspondence is stored within secure MongoDB Atlas databases with end-to-end transport encryption (TLS/HTTPS).
              Passwords are salted and hashed using bcrypt; passwords are never stored in plain text. Session tokens are issued as HTTP-only,
              secure JWT cookies that cannot be accessed by client-side scripts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              5. Third-Party Processors
            </h2>
            <p className="font-light">
              We partner with trusted, industry-standard service providers strictly to perform core application functions:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li><strong>MongoDB Atlas:</strong> Managed cloud database for reliable, encrypted letter and account storage.</li>
              <li><strong>Google OAuth 2.0:</strong> Optional single sign-on authentication service.</li>
              <li><strong>Resend:</strong> Transactional email service for delivery notifications.</li>
              <li><strong>Vercel:</strong> Cloud hosting and serverless execution platform.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              6. Your Rights & Data Deletion
            </h2>
            <p className="font-light">
              You have the right to inspect your archived correspondence, update your account information, or request the permanent deletion
              of your account and associated letters. To request complete deletion of your records, contact our postal administrator at
              <code className="font-mono text-xs ml-1">admin@old-letters.in</code>.
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
            OLD-LETTERS REGISTRY NO. P-1892
          </span>
        </div>
      </div>
    </div>
  );
};
