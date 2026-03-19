-- supabase/migrations/0011_multi_agency_platform.sql

-- ─── New enums ────────────────────────────────────────────────────────────────

CREATE TYPE agency_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE agency_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Add 'brand' to workspace_role (must be done before table changes that use it)
ALTER TYPE workspace_role ADD VALUE 'brand';

-- ─── Modify: public.users (must come before RLS policies that reference it) ───

ALTER TABLE public.users
  ADD COLUMN is_platform_admin boolean NOT NULL DEFAULT false;

-- ─── agencies ─────────────────────────────────────────────────────────────────

CREATE TABLE public.agencies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  owner_id   uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status     agency_status NOT NULL DEFAULT 'pending',
  logo_url   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admin or owner can view agencies"
  ON public.agencies FOR SELECT
  USING (
    (SELECT is_platform_admin FROM public.users WHERE id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE INDEX idx_agencies_slug     ON public.agencies(slug);
CREATE INDEX idx_agencies_owner_id ON public.agencies(owner_id);

-- ─── agency_requests ──────────────────────────────────────────────────────────

CREATE TABLE public.agency_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name     text NOT NULL,
  website_url     text NOT NULL,
  contact_name    text NOT NULL,
  contact_email   text NOT NULL,
  description     text,
  status          agency_request_status NOT NULL DEFAULT 'pending',
  reviewed_by     uuid REFERENCES public.users ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert agency requests"
  ON public.agency_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Platform admin can view agency requests"
  ON public.agency_requests FOR SELECT
  USING (
    (SELECT is_platform_admin FROM public.users WHERE id = auth.uid())
  );

CREATE INDEX idx_agency_requests_status
  ON public.agency_requests(status, created_at DESC);

-- ─── Modify: workspaces ───────────────────────────────────────────────────────

ALTER TABLE public.workspaces
  ADD COLUMN agency_id uuid REFERENCES public.agencies ON DELETE SET NULL;

-- ─── Modify: brand_requests ───────────────────────────────────────────────────

ALTER TABLE public.brand_requests
  ADD COLUMN agency_id uuid REFERENCES public.agencies ON DELETE SET NULL;

-- Drop over-permissive SELECT policy; replace with scoped one
DROP POLICY IF EXISTS "Authenticated users can view brand requests" ON public.brand_requests;

CREATE POLICY "Platform admin or agency owner can view brand requests"
  ON public.brand_requests FOR SELECT
  USING (
    (SELECT is_platform_admin FROM public.users WHERE id = auth.uid())
    OR agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    )
  );

-- ─── Modify: brands (fix legacy agency_id FK) ─────────────────────────────────

ALTER TABLE public.brands
  DROP CONSTRAINT brands_agency_id_fkey;

ALTER TABLE public.brands
  ADD CONSTRAINT brands_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;
