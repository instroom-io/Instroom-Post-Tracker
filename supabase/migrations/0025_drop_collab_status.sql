-- Migration: drop collab_status feature
-- Removes collab_status column, collab_checked_by column, the collab_status enum,
-- the trigger that set collab defaults, and the index on collab_checked_by.

-- 1. Drop the trigger first (depends on the function)
drop trigger if exists posts_set_collab_status_default on public.posts;

-- 2. Drop the trigger function
drop function if exists public.posts_collab_status_default();

-- 3. Drop columns from posts
alter table public.posts
  drop column if exists collab_status,
  drop column if exists collab_checked_by;

-- 4. Drop the enum type (safe after column is gone)
drop type if exists public.collab_status;
