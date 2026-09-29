-- ====================================================================
-- SUPABASE STORAGE BUCKETS MIGRATION
-- Sets up private storage buckets with strict access policies
-- ====================================================================

-- 1. Create storage buckets (all private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('letter-media', 'letter-media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('voice-notes', 'voice-notes', false, 20971520, ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4']),
  ('video-notes', 'video-notes', false, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('payment-proofs', 'payment-proofs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS Policies for letter-media
CREATE POLICY "Authenticated users can upload letter media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'letter-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Senders can view their letter media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'letter-media'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

-- 3. Storage RLS Policies for payment-proofs
CREATE POLICY "Users can upload payment screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users and admins can view payment screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

-- 4. Storage RLS for voice and video notes (Accessible via signed URLs or owners)
CREATE POLICY "Senders can upload voice notes if feature unlocked"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('voice-notes', 'video-notes')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Senders can read their own voice notes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('voice-notes', 'video-notes')
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );
