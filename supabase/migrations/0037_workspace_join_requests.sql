CREATE TYPE public.workspace_join_request_status AS ENUM ('pending', 'approved', 'denied');

CREATE TABLE public.workspace_join_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requester_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status          workspace_join_request_status NOT NULL DEFAULT 'pending',
  requested_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES public.users(id),
  UNIQUE (workspace_id, requester_id)
);

ALTER TABLE public.workspace_join_requests ENABLE ROW LEVEL SECURITY;

-- Requester sees their own requests
CREATE POLICY "Users can view own join requests" ON public.workspace_join_requests
  FOR SELECT USING (requester_id = (SELECT auth.uid()));

-- Workspace Admin sees all requests for their workspace
CREATE POLICY "Owners can view workspace join requests" ON public.workspace_join_requests
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role = 'owner'
    )
  );

-- Authenticated users can create a request
CREATE POLICY "Authenticated users can create join requests" ON public.workspace_join_requests
  FOR INSERT WITH CHECK (requester_id = (SELECT auth.uid()));

-- Workspace Admin can approve/deny (UPDATE)
CREATE POLICY "Owners can update join requests" ON public.workspace_join_requests
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role = 'owner'
    )
  );
