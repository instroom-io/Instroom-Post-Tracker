-- Brand status enum
CREATE TYPE brand_status AS ENUM ('pending', 'active');

-- Brands table (managed by the agency)
CREATE TABLE brands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  status      brand_status NOT NULL DEFAULT 'pending',
  created_at  timestamptz DEFAULT now()
);

-- Brand invitations (onboarding tokens)
CREATE TABLE brand_invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid NOT NULL REFERENCES brands ON DELETE CASCADE,
  token        text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  accepted_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_invitations ENABLE ROW LEVEL SECURITY;

-- Agency can view their own brands
CREATE POLICY "Agency can view own brands"
  ON brands FOR SELECT
  USING (agency_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies — all writes via service client only

-- Indexes
CREATE INDEX idx_brands_agency_id ON brands (agency_id);
CREATE INDEX idx_brands_slug ON brands (slug);
CREATE INDEX idx_brand_invitations_token ON brand_invitations (token) WHERE accepted_at IS NULL;
