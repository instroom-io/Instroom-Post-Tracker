'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ── Confirm brand onboarding (request-approval flow) ─────────────────────────

/**
 * Called from /onboard/[token] when brand clicks "Confirm".
 * Adds the authenticated brand user to workspace_members with role='brand',
 * then marks onboard_accepted_at on brand_requests.
 * Uses service client because workspace_members INSERT crosses RLS boundaries.
 */
export async function acceptBrandOnboarding(
  token: string
): Promise<{ workspaceSlug: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/onboard/${token}`)

  const serviceClient = createServiceClient()

  const { data: req } = await serviceClient
    .from('brand_requests')
    .select('id, status, workspace_id, onboard_token_expires_at, onboard_accepted_at, workspaces(slug)')
    .eq('onboard_token', token)
    .single()

  if (!req) return { error: 'Invalid or expired onboarding link.' }
  if (req.status !== 'approved') return { error: 'This onboarding link is not active.' }
  if (req.onboard_token_expires_at && new Date(req.onboard_token_expires_at) < new Date()) {
    return { error: 'This link has expired. Please contact your agency.' }
  }
  if (!req.workspace_id) return { error: 'Workspace not found. Please contact your agency.' }

  // Idempotent: add brand user to workspace as 'brand' role
  // Ignore duplicate key (23505) — safe if brand confirms twice
  const { error: memberError } = await serviceClient
    .from('workspace_members')
    .insert({ workspace_id: req.workspace_id, user_id: user.id, role: 'brand' })

  if (memberError && memberError.code !== '23505') {
    return { error: 'Failed to set up your workspace access.' }
  }

  // Mark onboard accepted
  await serviceClient
    .from('brand_requests')
    .update({ onboard_accepted_at: new Date().toISOString() })
    .eq('id', req.id)

  const workspace = Array.isArray(req.workspaces) ? req.workspaces[0] : req.workspaces
  return { workspaceSlug: (workspace as { slug: string } | null)?.slug ?? '' }
}
