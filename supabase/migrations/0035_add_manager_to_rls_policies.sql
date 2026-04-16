-- Migration: 0035_add_manager_to_rls_policies
-- 'manager' was added to workspace_role enum in 0031 but was never added to
-- the write RLS policies created in 0007. This migration drops those policies
-- and recreates them with 'manager' included alongside 'editor'.

-- ───── campaigns ─────

DROP POLICY IF EXISTS "Editors can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Editors can update campaigns" ON public.campaigns;

CREATE POLICY "Editors can insert campaigns" ON public.campaigns
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

CREATE POLICY "Editors can update campaigns" ON public.campaigns
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

-- ───── campaign_tracking_configs ─────

DROP POLICY IF EXISTS "Editors can insert tracking configs" ON public.campaign_tracking_configs;
DROP POLICY IF EXISTS "Editors can update tracking configs" ON public.campaign_tracking_configs;
DROP POLICY IF EXISTS "Editors can delete tracking configs" ON public.campaign_tracking_configs;

CREATE POLICY "Editors can insert tracking configs" ON public.campaign_tracking_configs
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

CREATE POLICY "Editors can update tracking configs" ON public.campaign_tracking_configs
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

CREATE POLICY "Editors can delete tracking configs" ON public.campaign_tracking_configs
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

-- ───── influencers ─────

DROP POLICY IF EXISTS "Editors can insert influencers" ON public.influencers;
DROP POLICY IF EXISTS "Editors can update influencers" ON public.influencers;
DROP POLICY IF EXISTS "Editors can delete influencers" ON public.influencers;

CREATE POLICY "Editors can insert influencers" ON public.influencers
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

CREATE POLICY "Editors can update influencers" ON public.influencers
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

CREATE POLICY "Editors can delete influencers" ON public.influencers
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

-- ───── campaign_influencers ─────

DROP POLICY IF EXISTS "Editors can insert campaign influencers" ON public.campaign_influencers;
DROP POLICY IF EXISTS "Editors can update campaign influencers" ON public.campaign_influencers;
DROP POLICY IF EXISTS "Editors can delete campaign influencers" ON public.campaign_influencers;

CREATE POLICY "Editors can insert campaign influencers" ON public.campaign_influencers
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

CREATE POLICY "Editors can update campaign influencers" ON public.campaign_influencers
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

CREATE POLICY "Editors can delete campaign influencers" ON public.campaign_influencers
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor', 'manager')
    )
  );

-- ───── posts ─────

DROP POLICY IF EXISTS "Editors can update posts" ON public.posts;

CREATE POLICY "Editors can update posts" ON public.posts
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor', 'manager')
    )
  );
