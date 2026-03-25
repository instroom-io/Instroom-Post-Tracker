'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail, escapeHtml } from '@/lib/email'
import { agencyRequestSchema, createWorkspaceSchema, inviteMemberSchema } from '@/lib/validations'
import { toSlug } from '@/lib/utils'
import type { Agency, AgencyRequest } from '@/lib/types'

/**
 * Create a brand workspace and send an invite to the brand contact — in one step.
 * Agency owner only.
 */
export async function inviteBrand(
  agencyId: string,
  name: string,
  email: string
): Promise<{ error: string } | void> {
  const nameParsed = createWorkspaceSchema.safeParse({ name })
  if (!nameParsed.success) return { error: nameParsed.error.errors[0].message }

  const emailParsed = inviteMemberSchema.shape.email.safeParse(email)
  if (!emailParsed.success) return { error: emailParsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify caller owns this agency
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('id', agencyId)
    .eq('owner_id', user.id)
    .single()
  if (!agency) return { error: 'Unauthorized.' }

  const serviceClient = createServiceClient()

  // Create workspace with agency_id
  let slug = toSlug(nameParsed.data.name)
  const { data: existing } = await serviceClient
    .from('workspaces').select('slug').eq('slug', slug).maybeSingle()
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const { data: workspace, error: wsError } = await serviceClient
    .from('workspaces')
    .insert({ name: nameParsed.data.name, slug, agency_id: agencyId })
    .select('id, slug, name')
    .single()
  if (wsError || !workspace) return { error: 'Failed to create workspace.' }

  // Agency owner becomes workspace owner
  await serviceClient
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' })

  await serviceClient.rpc('seed_workspace_defaults', { p_workspace_id: workspace.id })

  // Create invite for brand contact
  const { data: invitation, error: inviteError } = await serviceClient
    .from('invitations')
    .insert({ workspace_id: workspace.id, email: emailParsed.data, role: 'editor' })
    .select('token')
    .single()

  if (inviteError || !invitation) return { error: 'Workspace created but failed to send invite.' }

  // Send invite email
  try {
    await sendEmail({
      to: emailParsed.data,
      subject: `You've been invited to ${escapeHtml(workspace.name)} on Instroom Post Tracker`,
      html: `
        <p>You've been invited to access <strong>${escapeHtml(workspace.name)}</strong> on Instroom Post Tracker.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}">Accept invitation →</a></p>
        <p>This link expires in 7 days.</p>
      `,
    })
  } catch (err) {
    console.error('[email] Failed to send brand invite email:', err)
  }

  revalidatePath('/', 'layout')
}

/**
 * Submit an agency onboarding request (public — no auth required).
 * Uses service client because the form may be unauthenticated.
 */
export async function submitAgencyRequest(
  data: unknown
): Promise<{ success: true } | { error: string }> {
  const parsed = agencyRequestSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const serviceClient = createServiceClient()

  const { error } = await serviceClient.from('agency_requests').insert({
    agency_name: parsed.data.agency_name,
    website_url: parsed.data.website_url,
    contact_name: parsed.data.contact_name,
    contact_email: parsed.data.contact_email,
    description: parsed.data.description || null,
    status: 'pending',
  })

  if (error) return { error: 'Failed to submit request. Please try again.' }

  return { success: true }
}

/**
 * Approve an agency request — creates the agency row and marks request approved.
 * Platform admin only.
 */
export async function approveAgencyRequest(
  requestId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify platform admin
  const { data: profile } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_platform_admin) return { error: 'Insufficient permissions.' }

  // Fetch the request
  const serviceClient = createServiceClient()
  const { data: request, error: fetchError } = await serviceClient
    .from('agency_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (fetchError || !request) return { error: 'Request not found.' }

  // Create agency row
  const slug = toSlug(request.agency_name)
  // Find the agency contact's user account by email so they can log in and own their dashboard.
  // If they haven't signed up yet, the insert will still succeed but they must sign up with
  // their contact_email for the agency routing (app/app/page.tsx) to work correctly.
  const { data: agencyOwnerUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('email', request.contact_email)
    .maybeSingle()

  // Fall back to platform admin if contact hasn't signed up yet — owner_id is claimed on first
  // OAuth login via the auth callback (app/auth/callback/route.ts)
  const agencyOwnerId = agencyOwnerUser?.id ?? user.id

  // Derive logo from website domain via Clearbit logo API
  let logo_url: string | null = null
  try {
    const domain = new URL(request.website_url).hostname.replace(/^www\./, '')
    logo_url = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`
  } catch {
    // invalid URL — leave null
  }

  const { data: agency, error: agencyError } = await serviceClient
    .from('agencies')
    .insert({
      name: request.agency_name,
      slug,
      owner_id: agencyOwnerId,
      status: 'active',
      logo_url,
    })
    .select('id')
    .single()

  if (agencyError) return { error: 'Failed to create agency. Slug may already be taken.' }

  // Mark request approved
  const { error: updateError } = await serviceClient
    .from('agency_requests')
    .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
  if (updateError) return { error: 'Failed to update request status.' }

  revalidatePath('/admin')

  // Send approval email to agency contact
  await sendEmail({
    to: request.contact_email,
    subject: 'Your agency application has been approved — Instroom',
    html: `
      <p>Hi ${escapeHtml(request.contact_name)},</p>
      <p>Great news — your agency <strong>${escapeHtml(request.agency_name)}</strong> has been approved on Instroom Post Tracker.</p>
      <p>To access your agency dashboard, sign up (or log in) using this email address at:</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/signup">${process.env.NEXT_PUBLIC_APP_URL}/signup</a></p>
      <p>Once logged in, you'll be taken directly to your agency dashboard where you can manage brand workspaces and approve brand requests.</p>
      <p>— The Instroom Team</p>
    `,
  })
}

/**
 * Reject an agency request.
 * Platform admin only.
 */
export async function rejectAgencyRequest(
  requestId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_platform_admin) return { error: 'Insufficient permissions.' }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('agency_requests')
    .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) return { error: 'Failed to reject request.' }

  revalidatePath('/admin')
}

/**
 * Fetch all agencies (platform admin only).
 */
export async function getAgencies(): Promise<Agency[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('agencies')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as Agency[]
}

/**
 * Fetch a single agency by slug (for agency dashboard layout).
 */
export async function getAgencyBySlug(slug: string): Promise<Agency | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('agencies')
    .select('*')
    .eq('slug', slug)
    .single()
  return data as Agency | null
}

/**
 * Fetch all pending agency requests (platform admin only).
 */
export async function getAgencyRequests(
  status?: 'pending' | 'approved' | 'rejected'
): Promise<AgencyRequest[]> {
  const supabase = await createClient()
  let query = supabase
    .from('agency_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data } = await query
  return (data ?? []) as AgencyRequest[]
}

/**
 * Fetch active agencies for public dropdowns (e.g. brand request form).
 * Uses service client because the form may be unauthenticated.
 */
export async function getActiveAgenciesPublic(): Promise<Pick<Agency, 'id' | 'name'>[]> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('agencies')
    .select('id, name')
    .eq('status', 'active')
    .order('name')
  return (data ?? []) as Pick<Agency, 'id' | 'name'>[]
}
