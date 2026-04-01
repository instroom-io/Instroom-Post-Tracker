-- 0012_user_preferences.sql
-- Adds preferred_language and timezone to public.users
-- Creates agency-logos storage bucket

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Storage bucket for agency logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload agency logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agency-logos');

CREATE POLICY "Public read for agency logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agency-logos');

CREATE POLICY "Authenticated users can update agency logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'agency-logos');

CREATE POLICY "Authenticated users can delete agency logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'agency-logos');
