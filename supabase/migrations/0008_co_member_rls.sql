-- Allow workspace co-members to view each other's public.users profiles.
-- Required for the Settings > Members page to resolve display names and avatars.
-- Applied directly during E2E testing on 2026-03-16; this migration captures it.

CREATE POLICY "Co-members can view each other's profile"
  ON public.users FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (SELECT public.my_workspace_ids())
    )
  );
