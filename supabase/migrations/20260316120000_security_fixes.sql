-- Migration: security_fixes
-- Addresses Supabase advisor warnings:
--   1. RLS enabled with no policies (brand_invitations, retry_queue)
--   2. auth.uid() called per-row in 17+ policies → wrap with (select auth.uid())
--   3. Multiple permissive SELECT policies on 5 tables → split FOR ALL into INSERT/UPDATE/DELETE
--   4. Mutable search_path on 6 functions
--   5. Missing FK indexes on 10 foreign keys

-- ─── 1. Add missing RLS policies ───────────────────────────────────────────────

-- brand_invitations: agency users can view invitations for their brands
CREATE POLICY "Agency can view brand invitations"
  ON public.brand_invitations FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM public.brands
      WHERE agency_id = (SELECT auth.uid())
    )
  );

-- retry_queue: workspace members can view queue entries for their workspace's posts
-- (workers use service client and bypass RLS entirely)
CREATE POLICY "Members can view retry queue"
  ON public.retry_queue FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.posts
      WHERE workspace_id IN (SELECT public.my_workspace_ids())
    )
  );

-- ─── 2. Fix auth.uid() per-row re-evaluation ───────────────────────────────────
-- Replace auth.uid() with (SELECT auth.uid()) in USING/WITH CHECK clauses.
-- Pattern: DROP policy → CREATE replacement.

-- users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING ((SELECT auth.uid()) = id);

-- workspaces
DROP POLICY IF EXISTS "Admins can update workspace" ON public.workspaces;
CREATE POLICY "Admins can update workspace"
  ON public.workspaces FOR UPDATE
  USING (
    id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- workspace_members
DROP POLICY IF EXISTS "Admins can insert workspace members" ON public.workspace_members;
CREATE POLICY "Admins can insert workspace members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;
CREATE POLICY "Admins can update workspace members"
  ON public.workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete workspace members" ON public.workspace_members;
CREATE POLICY "Admins can delete workspace members"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- brands
DROP POLICY IF EXISTS "Agency can view own brands" ON public.brands;
CREATE POLICY "Agency can view own brands"
  ON public.brands FOR SELECT
  USING (agency_id = (SELECT auth.uid()));

-- invitations
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;
CREATE POLICY "Admins can delete invitations"
  ON public.invitations FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- campaigns
DROP POLICY IF EXISTS "Editors can create campaigns" ON public.campaigns;
CREATE POLICY "Editors can create campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Editors can update campaigns" ON public.campaigns;
CREATE POLICY "Editors can update campaigns"
  ON public.campaigns FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.campaigns;
CREATE POLICY "Admins can delete campaigns"
  ON public.campaigns FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- campaign_tracking_configs
-- Replace FOR ALL with explicit INSERT/UPDATE/DELETE to eliminate duplicate SELECT evaluation
DROP POLICY IF EXISTS "Editors can manage tracking configs" ON public.campaign_tracking_configs;
CREATE POLICY "Editors can insert tracking configs"
  ON public.campaign_tracking_configs FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor')
    )
  );
CREATE POLICY "Editors can update tracking configs"
  ON public.campaign_tracking_configs FOR UPDATE
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor')
    )
  );
CREATE POLICY "Editors can delete tracking configs"
  ON public.campaign_tracking_configs FOR DELETE
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- influencers
-- Replace FOR ALL with explicit INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Editors can manage influencers" ON public.influencers;
CREATE POLICY "Editors can insert influencers"
  ON public.influencers FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor')
    )
  );
CREATE POLICY "Editors can update influencers"
  ON public.influencers FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor')
    )
  );
CREATE POLICY "Editors can delete influencers"
  ON public.influencers FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor')
    )
  );

-- campaign_influencers
-- Replace FOR ALL with explicit INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Editors can manage campaign influencers" ON public.campaign_influencers;
CREATE POLICY "Editors can insert campaign influencers"
  ON public.campaign_influencers FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor')
    )
  );
CREATE POLICY "Editors can update campaign influencers"
  ON public.campaign_influencers FOR UPDATE
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor')
    )
  );
CREATE POLICY "Editors can delete campaign influencers"
  ON public.campaign_influencers FOR DELETE
  USING (
    campaign_id IN (
      SELECT c.id FROM public.campaigns c
      JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- posts
DROP POLICY IF EXISTS "Editors can update post collab status" ON public.posts;
CREATE POLICY "Editors can update post collab status"
  ON public.posts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'editor')
    )
  );

-- emv_config
-- Replace FOR ALL with explicit INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can manage EMV config" ON public.emv_config;
CREATE POLICY "Admins can insert EMV config"
  ON public.emv_config FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );
CREATE POLICY "Admins can update EMV config"
  ON public.emv_config FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );
CREATE POLICY "Admins can delete EMV config"
  ON public.emv_config FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- workspace_platform_handles
-- Replace FOR ALL with explicit INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can manage platform handles" ON public.workspace_platform_handles;
CREATE POLICY "Admins can insert platform handles"
  ON public.workspace_platform_handles FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );
CREATE POLICY "Admins can update platform handles"
  ON public.workspace_platform_handles FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );
CREATE POLICY "Admins can delete platform handles"
  ON public.workspace_platform_handles FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- ─── 3. Fix mutable search_path on functions ───────────────────────────────────

ALTER FUNCTION public.my_workspace_ids()
  SET search_path = public;

ALTER FUNCTION public.campaign_status_on_update()
  SET search_path = public;

ALTER FUNCTION public.posts_collab_status_default()
  SET search_path = public;

ALTER FUNCTION public.posts_set_metrics_fetch_after()
  SET search_path = public;

ALTER FUNCTION public.seed_workspace_defaults(uuid)
  SET search_path = public;

ALTER FUNCTION public.claim_jobs(job_type, integer)
  SET search_path = public;

-- ─── 4. Missing FK indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_brand_invitations_brand_id
  ON public.brand_invitations(brand_id);

CREATE INDEX IF NOT EXISTS idx_campaign_influencers_influencer_id
  ON public.campaign_influencers(influencer_id);

CREATE INDEX IF NOT EXISTS idx_campaign_influencers_added_by
  ON public.campaign_influencers(added_by);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_by
  ON public.campaigns(created_by);

CREATE INDEX IF NOT EXISTS idx_influencers_workspace_id
  ON public.influencers(workspace_id);

CREATE INDEX IF NOT EXISTS idx_invitations_workspace_id
  ON public.invitations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_posts_influencer_id
  ON public.posts(influencer_id);

CREATE INDEX IF NOT EXISTS idx_posts_collab_checked_by
  ON public.posts(collab_checked_by);

CREATE INDEX IF NOT EXISTS idx_retry_queue_post_id
  ON public.retry_queue(post_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_invited_by
  ON public.workspace_members(invited_by);
