-- Extend join-request visibility and update policies to include admin and manager roles.
-- Migration 0037 was written before the manager role gained admin-level permissions.

DROP POLICY IF EXISTS "Owners can view workspace join requests" ON public.workspace_join_requests;
DROP POLICY IF EXISTS "Owners can update join requests" ON public.workspace_join_requests;

CREATE POLICY "Admins can view workspace join requests" ON public.workspace_join_requests
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Admins can update join requests" ON public.workspace_join_requests
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'manager')
    )
  );
