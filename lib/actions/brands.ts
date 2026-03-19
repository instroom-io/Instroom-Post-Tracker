'use server'

import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createBrandSchema } from '@/lib/validations'
import { toSlug } from '@/lib/utils'

// ── Create brand + generate onboarding token ─────────────────────────────────

export async function createBrand(
  name: string,
  agencyId: string
): Promise<{ inviteLink: string; brand: { id: string; name: string; slug: string } } | { error: string }> {
  const parsed = createBrandSchema.safeParse({ name })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()
  const slug = toSlug(name)

  const { data: brand, error: brandError } = await serviceClient
    .from('brands')
    .insert({ agency_id: agencyId, name, slug, status: 'pending' })
    .select('id, name, slug')
    .single()

  if (brandError) {
    if (brandError.code === '23505') return { error: 'A brand with that name already exists.' }
    return { error: 'Failed to create brand.' }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error: tokenError } = await serviceClient
    .from('brand_invitations')
    .insert({ brand_id: brand.id, token, expires_at: expiresAt })

  if (tokenError) return { error: 'Failed to generate onboarding link.' }

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/onboard/${token}`
  return { inviteLink, brand }
}

// ── Load invitation for display on acceptance page ───────────────────────────

export async function getBrandInvitation(token: string) {
  const serviceClient = createServiceClient()

  const { data, error } = await serviceClient
    .from('brand_invitations')
    .select('id, expires_at, accepted_at, brands(id, name, slug, status)')
    .eq('token', token)
    .single()

  if (error || !data) return null
  return data
}

// ── Accept brand invitation → auto-create workspace ──────────────────────────

export async function acceptBrandInvitation(
  token: string
): Promise<{ workspaceSlug: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/onboard/${token}`)

  const serviceClient = createServiceClient()

  const { data: invitation, error: invError } = await serviceClient
    .from('brand_invitations')
    .select('id, expires_at, accepted_at, brands(id, name, slug, status, agency_id)')
    .eq('token', token)
    .single()

  if (invError || !invitation) return { error: 'Invalid invitation link.' }
  if (invitation.accepted_at) return { error: 'This invitation has already been used.' }
  if (new Date(invitation.expires_at) < new Date()) return { error: 'This invitation link has expired.' }

  const brand = Array.isArray(invitation.brands) ? invitation.brands[0] : invitation.brands
  if (!brand || brand.status !== 'pending') return { error: 'This brand has already been onboarded.' }

  const { data: workspace, error: wsError } = await serviceClient
    .from('workspaces')
    .insert({ name: brand.name, slug: brand.slug })
    .select('id, slug')
    .single()

  if (wsError) {
    if (wsError.code === '23505') return { error: 'A workspace with this name already exists.' }
    return { error: 'Failed to create workspace.' }
  }

  const { error: memberError } = await serviceClient
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' })

  if (memberError) return { error: 'Failed to set up workspace membership.' }

  // Seed default EMV CPM rates
  await serviceClient.rpc('seed_workspace_defaults', { p_workspace_id: workspace.id })

  // Mark brand active + consume token
  await Promise.all([
    serviceClient.from('brands').update({ status: 'active' }).eq('id', brand.id),
    serviceClient.from('brand_invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id),
  ])

  return { workspaceSlug: workspace.slug }
}

// ── Confirm brand onboarding (new request-approval flow) ─────────────────────

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
