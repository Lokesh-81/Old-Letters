import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Google SVG Icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export interface Auth7Props {
  onSuccess?: (user: { id: string; email: string; fullName: string; role?: string; avatarUrl?: string }) => void;
  onCancel?: () => void;
  initialMode?: 'login' | 'signup';
  promptTitle?: string;
  promptSubtitle?: string;
  onGuestPreview?: () => void;
}

export default function Auth7({
  onSuccess,
  onCancel,
  initialMode = 'login',
  promptTitle,
  promptSubtitle,
  onGuestPreview,
}: Auth7Props) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin
        ? { email: cleanEmail, password: password.trim() }
        : { email: cleanEmail, password: password.trim(), fullName: fullName.trim() || 'Correspondent' };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication rejected. Please check your credentials.');
      }

      if (onSuccess && data.user) {
        onSuccess(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during correspondence authentication.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth redirect
  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="flex min-h-[580px] w-full bg-[#faf9f7] text-[#141618] antialiased selection:bg-[#5c1d24]/20 selection:text-[#5c1d24] relative font-serif">
      {/* Form Side */}
      <div className="flex w-full flex-col lg:w-1/2 justify-between p-6 sm:p-10 md:p-12 bg-[#faf9f7]">
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-4 border-b border-[#eae4da]">
          <div>
            <span className="font-serif tracking-[0.2em] text-lg font-normal text-teal-900 select-none">
              OLD-LETTERS
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-sans block mt-0.5">
              Postal Seal & Archives
            </span>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              type="button"
              className="text-xs uppercase tracking-widest font-sans text-stone-400 hover:text-stone-800 transition-colors p-1 cursor-pointer"
            >
              Close [✕]
            </button>
          )}
        </div>

        {/* Content Container with Framer Motion transition */}
        <div className="my-auto py-6 max-w-[400px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Title & Subtitle */}
              <div className="mb-6 text-center">
                <h1 className="text-2xl sm:text-3xl font-normal text-teal-950 font-serif tracking-tight whitespace-pre-line leading-tight">
                  {isLogin
                    ? (promptTitle || 'Sign in to your correspondence')
                    : (promptTitle || 'Create your account')}
                </h1>
                <p className="text-xs sm:text-sm font-sans text-stone-600 mt-2 font-light">
                  {isLogin
                    ? (promptSubtitle || 'Access your private letters, scheduled dispatches, and archives.')
                    : (promptSubtitle || 'Create your account before composing and sealing your correspondence.')}
                </p>
              </div>

              {/* Error Notice */}
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50/80 border border-red-200 text-xs text-red-800 rounded font-sans leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {/* Main Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans text-sm">
                {!isLogin && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-medium text-stone-700">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full rounded-sm border border-[#eae4da] bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-900 focus:outline-none focus:ring-1 focus:ring-teal-900 transition-all"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-medium text-stone-700">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourmail@gmail.com"
                    className="w-full rounded-sm border border-[#eae4da] bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-900 focus:outline-none focus:ring-1 focus:ring-teal-900 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-medium text-stone-700">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-sm border border-[#eae4da] bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-teal-900 focus:outline-none focus:ring-1 focus:ring-teal-900 transition-all"
                  />
                </div>

                {!isLogin && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] uppercase tracking-wider font-medium text-stone-700">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-sm border border-[#eae4da] bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-teal-900 focus:outline-none focus:ring-1 focus:ring-teal-900 transition-all"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-sm bg-teal-900 px-6 py-3 text-xs uppercase tracking-[0.2em] font-medium text-white shadow-[inset_0_1px_0_2px_rgba(255,255,255,0.10)] transition-all hover:bg-teal-800 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {loading
                      ? 'Confirming Seal...'
                      : isLogin
                      ? 'SIGN IN'
                      : 'CREATE ACCOUNT'}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-6 flex items-center">
                <div className="grow border-t border-[#eae4da]"></div>
                <span className="px-4 text-[10px] font-sans uppercase tracking-[0.2em] text-stone-400">
                  ──────── OR ────────
                </span>
                <div className="grow border-t border-[#eae4da]"></div>
              </div>

              {/* Continue with Google */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="flex w-full items-center justify-center gap-3 rounded-sm border border-[#eae4da] bg-white px-6 py-2.5 text-xs font-sans font-medium text-stone-800 transition-colors hover:bg-stone-50 active:bg-stone-100 shadow-xs cursor-pointer"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </div>

              {/* Footer Switcher */}
              <div className="mt-6 text-center text-xs font-sans text-stone-600">
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setErrorMsg(null);
                      }}
                      className="font-medium text-teal-900 hover:underline cursor-pointer ml-1"
                    >
                      Create account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true);
                        setErrorMsg(null);
                      }}
                      className="font-medium text-teal-900 hover:underline cursor-pointer ml-1"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>

              {/* Optional Guest Preview Link */}
              {onGuestPreview && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={onGuestPreview}
                    className="text-xs font-serif italic text-stone-500 hover:text-teal-900 transition-colors cursor-pointer"
                  >
                    Or preview the writing experience as a guest →
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quiet Postal Footer */}
        <div className="pt-4 border-t border-[#eae4da] text-center text-[11px] font-serif italic text-stone-500">
          &ldquo;Some things are worth waiting for.&rdquo; — Central Postal Bureau
        </div>
      </div>

      {/* Elegant Atmospheric Right Image Side */}
      <div className="hidden lg:block lg:w-1/2 p-6 bg-[#f4efe8]/70 border-l border-[#eae4da]">
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-stone-900 shadow-xl flex flex-col justify-end p-10 text-white">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80 filter brightness-90"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(19, 78, 74, 0.95), rgba(28, 36, 32, 0.4)), url('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200')`,
            }}
          />
          <div className="relative z-10 max-w-sm space-y-3">
            <span className="inline-block text-[10px] font-mono tracking-[0.3em] uppercase text-amber-200/90 border border-amber-300/30 px-3 py-0.5 rounded-full">
              Physical Paper Experience
            </span>
            <h2 className="text-2xl font-serif font-light leading-snug text-stone-100">
              Letters sealed in wax, held in trust until the appointed hour.
            </h2>
            <p className="text-xs font-sans text-stone-300 font-light leading-relaxed">
              Every correspondence remains untouched in the 48-hour vault. Recipients unseal messages using confidential ciphers or one-time verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
