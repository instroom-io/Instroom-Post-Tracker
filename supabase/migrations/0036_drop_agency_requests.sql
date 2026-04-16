-- Drop agency_requests table — replaced by self-serve billing signup (v2.0+)
DROP TABLE IF EXISTS public.agency_requests;
DROP TYPE IF EXISTS public.agency_request_status;
DROP INDEX IF EXISTS public.idx_agency_requests_status;
