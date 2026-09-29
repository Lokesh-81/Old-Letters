-- ====================================================================
-- OLD-LETTERS DATABASE SCHEMA MIGRATION
-- Production-ready PostgreSQL schema with Row-Level Security (RLS)
-- ====================================================================

-- Enable pgcrypto for UUIDs and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. PROFILES
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- --------------------------------------------------------------------
-- 2. ADMIN USERS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can view admin list"
  ON public.admin_users FOR SELECT
  USING (public.is_admin());

-- --------------------------------------------------------------------
-- 3. LETTER TEMPLATES (Free in V1)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  preview_image_url TEXT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.letter_templates FOR SELECT
  USING (is_active = true);

-- --------------------------------------------------------------------
-- 4. LETTERS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  letter_type TEXT NOT NULL,
  template_id UUID NULL REFERENCES public.letter_templates(id),
  subject TEXT NULL,
  salutation TEXT NOT NULL,
  body TEXT NOT NULL,
  signoff TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT',
    'SCHEDULED',
    'IN_TRANSIT',
    'DELIVERED',
    'OPENED',
    'COMPLETED',
    'CANCELLED'
  )),
  delivery_date TIMESTAMPTZ NOT NULL,
  tracking_code TEXT UNIQUE NOT NULL,
  recipient_verification_method TEXT NOT NULL DEFAULT 'open' CHECK (
    recipient_verification_method IN ('otp', 'passphrase', 'open')
  ),
  secret_passphrase_hash TEXT NULL,
  postmark_city TEXT DEFAULT 'Bureau of Correspondence',
  posted_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can read their own letters"
  ON public.letters FOR SELECT
  USING (sender_id = auth.uid() OR public.is_admin());

CREATE POLICY "Senders can create letters"
  ON public.letters FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Senders can update their own drafts or scheduled letters"
  ON public.letters FOR UPDATE
  USING (sender_id = auth.uid() AND status IN ('DRAFT', 'SCHEDULED'))
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Senders can delete their own drafts"
  ON public.letters FOR DELETE
  USING (sender_id = auth.uid() AND status = 'DRAFT');

-- --------------------------------------------------------------------
-- 5. LETTER RECIPIENTS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.letter_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  verification_method TEXT NOT NULL DEFAULT 'open',
  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.letter_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can view recipients for their letters"
  ON public.letter_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.letters l
      WHERE l.id = letter_recipients.letter_id AND l.sender_id = auth.uid()
    ) OR public.is_admin()
  );

CREATE POLICY "Senders can insert recipients for their letters"
  ON public.letter_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.letters l
      WHERE l.id = letter_recipients.letter_id AND l.sender_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- 6. SECURE DELIVERY TOKENS
-- Stores SHA-256(token), raw token is never persisted
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.delivery_tokens ENABLE ROW LEVEL SECURITY;

-- Note: Access is tightly controlled by Edge Functions / service role only.
CREATE POLICY "Admin or internal service can view delivery tokens"
  ON public.delivery_tokens FOR SELECT
  USING (public.is_admin());

-- --------------------------------------------------------------------
-- 7. OTP CODES (Gmail OTP)
-- Stored as SHA-256 hash, expires in 10 minutes, max 5 attempts
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 8. VERIFICATION ATTEMPTS (Rate limiting & Audit)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('OTP', 'PASSPHRASE')),
  success BOOLEAN NOT NULL,
  ip_hash TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 9. LETTER MEDIA (Private photo attachments)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.letter_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'voice', 'video')),
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  caption TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.letter_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can manage their media"
  ON public.letter_media FOR ALL
  USING (sender_id = auth.uid());

-- --------------------------------------------------------------------
-- 10. DELIVERY EVENTS (Idempotent audit state transitions)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'LETTER_CREATED',
    'LETTER_POSTED',
    'LETTER_SCHEDULED',
    'LETTER_IN_TRANSIT',
    'LETTER_DELIVERED',
    'RECIPIENT_EMAIL_SENT',
    'RECIPIENT_VERIFIED',
    'LETTER_OPENED',
    'LETTER_COMPLETED',
    'LETTER_CANCELLED'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can view delivery events for their letters"
  ON public.delivery_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.letters l
      WHERE l.id = delivery_events.letter_id AND l.sender_id = auth.uid()
    ) OR public.is_admin()
  );

-- --------------------------------------------------------------------
-- 11. PAYMENTS (Manual UPI QR Payment Verification)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  letter_id UUID NULL REFERENCES public.letters(id) ON DELETE SET NULL,
  feature_code TEXT NOT NULL CHECK (feature_code IN ('VOICE_NOTE', 'VIDEO_NOTE', 'LIVE_MEETING')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  upi_reference TEXT NOT NULL,
  payment_screenshot_path TEXT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REFUNDED'
  )),
  admin_note TEXT NULL,
  verified_by UUID NULL REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can submit pending payments"
  ON public.payments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'PENDING');

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin());

-- --------------------------------------------------------------------
-- 12. PAID FEATURES (Unlocked only after Admin Approval)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paid_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL CHECK (feature_code IN ('VOICE_NOTE', 'VIDEO_NOTE', 'LIVE_MEETING')),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'UNLOCKED',
    'EXPIRED',
    'CANCELLED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.paid_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view paid features for their letters"
  ON public.paid_features FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.letters l
      WHERE l.id = paid_features.letter_id AND l.sender_id = auth.uid()
    ) OR public.is_admin()
  );

-- --------------------------------------------------------------------
-- 13. LIVE SESSIONS (Parlour Meeting)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ACTIVE', 'ENDED', 'EXPIRED')),
  room_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their live session"
  ON public.live_sessions FOR SELECT
  USING (sender_id = auth.uid() OR public.is_admin());

-- --------------------------------------------------------------------
-- 14. NOTIFICATIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark notifications as read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- --------------------------------------------------------------------
-- 15. AUDIT LOGS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- --------------------------------------------------------------------
-- 16. INDEXES FOR PERFORMANCE & LOOKUPS
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_letters_sender_id ON public.letters(sender_id);
CREATE INDEX IF NOT EXISTS idx_letters_status ON public.letters(status);
CREATE INDEX IF NOT EXISTS idx_letters_delivery_date ON public.letters(delivery_date);
CREATE INDEX IF NOT EXISTS idx_letters_tracking_code ON public.letters(tracking_code);
CREATE INDEX IF NOT EXISTS idx_letter_recipients_email ON public.letter_recipients(email);
CREATE INDEX IF NOT EXISTS idx_letter_recipients_letter_id ON public.letter_recipients(letter_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tokens_hash ON public.delivery_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_otp_codes_letter_email ON public.otp_codes(letter_id, email);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_paid_features_letter_id ON public.paid_features(letter_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_letter_id ON public.delivery_events(letter_id);

-- --------------------------------------------------------------------
-- 17. SEED INITIAL FREE TEMPLATES
-- --------------------------------------------------------------------
INSERT INTO public.letter_templates (slug, name, category, description, configuration, is_active, sort_order)
VALUES
  ('ivory', 'Classic Ivory', 'CLASSIC', 'Archival cream parchment with emerald wax seal and fine deckle border.', '{"paperBg": "#faf8f5", "paperColor": "#faf8f5", "textColor": "#202426", "fontFamily": "serif", "sealColor": "#0d3b36", "sealEmblem": "seal-flourish"}'::jsonb, true, 1),
  ('midnight', 'Midnight Archive', 'ROMANTIC', 'Deep indigo stationery with crimson seal and silver ink.', '{"paperBg": "#1a1f2c", "paperColor": "#1a1f2c", "textColor": "#eae6df", "fontFamily": "editorial", "sealColor": "#7a1e28", "sealEmblem": "seal-wax-drop"}'::jsonb, true, 2),
  ('parchment', 'Antique Vellum', 'PERSONAL', 'Aged golden paper with hand-torn edges and bronze seal.', '{"paperBg": "#f5eedc", "paperColor": "#f5eedc", "textColor": "#2e261f", "fontFamily": "typewriter", "sealColor": "#5c3a21", "sealEmblem": "seal-compass"}'::jsonb, true, 3),
  ('rose', 'Blush Pressed Rose', 'CELEBRATION', 'Soft petal paper pressed with botanical fibers and burgundy seal.', '{"paperBg": "#f9f2f0", "paperColor": "#f9f2f0", "textColor": "#332225", "fontFamily": "display", "sealColor": "#691b29", "sealEmblem": "seal-botanical"}'::jsonb, true, 4)
ON CONFLICT (slug) DO NOTHING;
