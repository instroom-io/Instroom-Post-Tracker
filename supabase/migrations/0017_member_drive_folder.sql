-- Add personal Google Drive folder per workspace member.
-- Used as a fallback when the workspace has no drive_folder_id configured.
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
