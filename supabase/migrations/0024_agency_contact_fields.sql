-- Add contact_name and contact_email to agencies table
-- These are populated from the original agency_request on approval
-- so the detail page can show accurate contact info regardless of owner_id fallback.

ALTER TABLE public.agencies
  ADD COLUMN contact_name  text,
  ADD COLUMN contact_email text;
