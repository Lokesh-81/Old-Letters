import React from 'react';

interface LegalPageProps {
  onBack: () => void;
}

export const CookiePolicyView: React.FC<LegalPageProps> = ({ onBack }) => {
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
              Cookie & Session Policy
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
          This document describes the technical cookie and session mechanisms currently utilized by OLD-LETTERS.
          It is an informational policy template for user transparency and should be reviewed for jurisdictional legal compliance.
        </div>

        {/* Content Body */}
        <div className="space-y-8 font-sans text-stone-700 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              1. Our Philosophy on Digital Cookies
            </h2>
            <p className="font-light">
              OLD-LETTERS is built on the philosophy of intentional, patient correspondence. Just as a physical wax-sealed
              envelope respects the privacy of the sender and recipient, our digital postal desk maintains an absolute minimum
              technical footprint.
            </p>
            <p className="font-light">
              We do <strong>not</strong> deploy advertising tracking pixels, behavioral profiling cookies, social media trackers,
              or third-party data broker analytics. We only store essential technical session cookies required to verify your
              identity and safeguard your letters.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              2. Essential Cookies We Deploy
            </h2>
            <p className="font-light">
              The primary cookie set by OLD-LETTERS is our secure authentication session token:
            </p>

            <div className="border border-[#eae4da] bg-white rounded-xs p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="font-mono text-xs font-bold text-teal-900">oldletters_session</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-2xs">
                  Strictly Essential
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-mono text-[10px] text-stone-500 uppercase block">Storage Type</span>
                  <span className="text-stone-800 font-medium">HTTP-Only Cookie (Encrypted JWT)</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-stone-500 uppercase block">Security Attributes</span>
                  <span className="text-stone-800 font-medium">Secure (HTTPS), SameSite=Lax</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-stone-500 uppercase block">Lifespan</span>
                  <span className="text-stone-800 font-medium">30 days from last login</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-stone-500 uppercase block">Domain</span>
                  <span className="text-stone-800 font-medium">First-party (OLD-LETTERS host domain)</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 font-light pt-1">
                <strong>Purpose:</strong> Stores your cryptographically signed JSON Web Token (JWT). This confirms you are logged
                in so you can view your personal correspondence archive, compose draft letters, access verification methods, and protect
                unopened mail from unauthorized parties. Because it is marked <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-[11px]">HTTP-Only</code>,
                client-side JavaScript cannot read or tamper with this cookie, mitigating Cross-Site Scripting (XSS) risks.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              3. Google OAuth 2.0 Authentication
            </h2>
            <p className="font-light">
              When you choose to sign in using &ldquo;Continue with Google&rdquo;, you are briefly directed to Google&rsquo;s official
              authentication service (<code className="font-mono text-xs">accounts.google.com</code>). Google may place temporary session cookies
              on their domain to authenticate your Google credentials.
            </p>
            <p className="font-light">
              Upon successful Google authorization, Google returns an authorization code to our backend callback (<code className="font-mono text-xs">/api/auth/google/callback</code>).
              OLD-LETTERS verifies your email and issues our standard <code className="font-mono text-xs">oldletters_session</code> cookie. No Google tracking,
              advertising, or analytics cookies are set on the OLD-LETTERS domain.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              4. Why Essential Cookies Cannot Be Disabled
            </h2>
            <p className="font-light">
              Under applicable privacy regulations (such as GDPR, ePrivacy Directive, and CCPA), strictly essential cookies that are
              required to deliver a service explicitly requested by the user do not require prior consent banners, as the service cannot function without them.
            </p>
            <p className="font-light">
              If you configure your browser to block all cookies, you will not be able to log in, write sealed letters, save drafts,
              or view your correspondence archive.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              5. How to Manage Cookies in Your Browser
            </h2>
            <p className="font-light">
              You can control or delete cookies at any time through your browser settings:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-xs sm:text-sm">
              <li><strong>Google Chrome:</strong> Settings → Privacy and security → Third-party cookies / Cookies and other site data.</li>
              <li><strong>Apple Safari:</strong> Preferences / Settings → Privacy → Manage Website Data.</li>
              <li><strong>Mozilla Firefox:</strong> Settings → Privacy & Security → Enhanced Tracking Protection / Cookies and Site Data.</li>
              <li><strong>Microsoft Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t border-[#eae4da] pt-6">
            <h2 className="font-serif text-xl text-teal-950 font-medium">
              6. Bureau Inquiries
            </h2>
            <p className="font-light">
              If you have any questions about our session security, cookie implementation, or privacy practices, please contact our
              postal administrator at:
            </p>
            <div className="font-mono text-xs text-stone-600">
              admin@old-letters.in · OLD-LETTERS Postal Conservancy
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
            OLD-LETTERS REGISTRY NO. C-1892
          </span>
        </div>
      </div>
    </div>
  );
};
