-- New enums
CREATE TYPE brand_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE drive_connection_type AS ENUM ('agency', 'brand');

-- New table: brand_requests
CREATE TABLE public.brand_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name      text NOT NULL,
  website_url     text NOT NULL,
  contact_name    text NOT NULL,
  contact_email   text NOT NULL,
  description     text,
  status          brand_request_status NOT NULL DEFAULT 'pending',
  workspace_id    uuid REFERENCES public.workspaces ON DELETE SET NULL,
  reviewed_by     uuid REFERENCES public.users ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read all brand_requests (agency staff)
CREATE POLICY "Authenticated users can view brand requests"
  ON public.brand_requests FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Indexes
CREATE INDEX idx_brand_requests_status ON public.brand_requests (status, created_at DESC);
CREATE INDEX idx_brand_requests_contact_email ON public.brand_requests (contact_email);

-- Drive OAuth columns on workspaces (Phase 14 prep)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS drive_connection_type drive_connection_type,
  ADD COLUMN IF NOT EXISTS drive_oauth_token text;
