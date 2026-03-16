-- ─── claim_jobs() RPC ─────────────────────────────────────────────────────────
-- Atomically claim pending jobs from retry_queue using FOR UPDATE SKIP LOCKED
-- to prevent double-processing across concurrent worker invocations.

CREATE OR REPLACE FUNCTION claim_jobs(p_job_type job_type, p_limit INT)
RETURNS SETOF retry_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE retry_queue
  SET status = 'processing', attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM retry_queue
    WHERE status = 'pending'
      AND job_type = p_job_type
      AND scheduled_at <= now()
    ORDER BY scheduled_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Instagram user_id cache ─────────────────────────────────────────────────
-- EnsembleData /instagram/user/posts requires numeric user_id, not username.
-- Auto-populated by posts-worker on first successful IG scrape.

ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS instagram_user_id TEXT;
