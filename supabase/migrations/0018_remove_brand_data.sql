-- Remove all workspace_members rows with role = 'brand'
DELETE FROM workspace_members WHERE role = 'brand';

-- Drop the brand_requests table (no longer used)
DROP TABLE IF EXISTS brand_requests CASCADE;

-- Note: We leave the 'brand' value in the workspace_role enum.
-- Removing an enum value in Postgres requires complex type rebuilding.
-- The value becomes orphaned but causes no issues since no rows reference it
-- and the app no longer creates or checks for it.
