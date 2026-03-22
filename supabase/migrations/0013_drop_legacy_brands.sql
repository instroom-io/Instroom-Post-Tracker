-- Drop legacy brands + brand_invitations tables (superseded by brand_requests + workspaces flow)
DROP TABLE IF EXISTS public.brand_invitations;
DROP TABLE IF EXISTS public.brands;
