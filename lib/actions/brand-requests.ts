'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { brandRequestSchema, inviteBrandSchema, acceptBrandInviteSchema } from '@/lib/validations'
import { toSlug } from '@/lib/utils'
import { sendEmail, escapeHtml } from '@/lib/email'
import type { BrandRequest, BrandRequestStatus } from '@/lib/types'

/**
 * Submit a brand connection request (public — no auth required).
 * Uses service client because the form is unauthenticated.
 */
export async function submitBrandRequest(
  data: unknown
): Promise<{ success: true } | { error: string }> {
  const parsed = brandRequestSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const serviceClient = createServiceClient()

  const { error } = await serviceClient.from('brand_requests').insert({
    brand_name: parsed.data.brand_name,
    website_url: parsed.data.website_url,
    logo_url: parsed.data.logo_url || null,
    contact_name: parsed.data.contact_name,
    contact_email: parsed.data.contact_email,
    description: parsed.data.description || null,
    agency_id: parsed.data.agency_id || null,
    status: 'pending',
  })

  if (error) return { error: 'Failed to submit request. Please try again.' }

  // Notify agency of new brand request (fire-and-forget)
  if (process.env.AGENCY_NOTIFICATION_EMAIL) {
    try {
      await sendEmail({
        to: process.env.AGENCY_NOTIFICATION_EMAIL,
        subject: `New brand request: ${escapeHtml(parsed.data.brand_name)}`,
        html: `
          <p>A new brand has requested access to Instroom Post Tracker.</p>
          <table cellpadding="6" cellspacing="0">
            <tr><td><strong>Brand:</strong></td><td>${escapeHtml(parsed.data.brand_name)}</td></tr>
            <tr><td><strong>Website:</strong></td><td>${escapeHtml(parsed.data.website_url)}</td></tr>
            <tr><td><strong>Contact:</strong></td><td>${escapeHtml(parsed.data.contact_name)}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${escapeHtml(parsed.data.contact_email)}</td></tr>
            ${parsed.data.description ? `<tr><td><strong>Notes:</strong></td><td>${escapeHtml(parsed.data.description)}</td></tr>` : ''}
          </table>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/agency">Review request →</a></p>
        `,
      })
    } catch (err) {
      console.error('[email] Failed to send brand request notification:', err)
    }
  }

  return { success: true }
}

/**
 * Approve a brand request — agency only, uses service client.
 * Auto-creates workspace + membership + EMV defaults.
 */
export async function approveBrandRequest(
  requestId: string,
  agencySlug: string
): Promise<{ workspaceSlug: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // 1. Re-validate request is still pending (race condition guard)
  const { data: request } = await serviceClient
    .from('brand_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) return { error: 'Request not found or already processed.' }

  // 2. Generate unique slug
  let slug = toSlug(request.brand_name)
  const { data: existing } = await serviceClient
    .from('workspaces')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  // 3. Create workspace
  const { data: workspace, error: wsError } = await serviceClient
    .from('workspaces')
    .insert({ name: request.brand_name, slug, logo_url: request.logo_url ?? null, agency_id: request.agency_id || null })
    .select('id, slug')
    .single()

  if (wsError || !workspace) {
    return { error: 'Failed to create workspace. Please try again.' }
  }

  // 4. Add approving user as owner
  const { error: memberError } = await serviceClient
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    return { error: 'Failed to set up workspace membership.' }
  }

  // 5. Seed default EMV config
  await serviceClient.rpc('seed_workspace_defaults', {
    p_workspace_id: workspace.id,
  })

  // 5b. Generate onboarding confirmation token and email brand contact
  const { randomBytes } = await import('crypto')
  const onboardToken = randomBytes(32).toString('hex')
  const onboardTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error: tokenError } = await serviceClient
    .from('brand_requests')
    .update({
      onboard_token: onboardToken,
      onboard_token_expires_at: onboardTokenExpiresAt,
    })
    .eq('id', requestId)

  if (tokenError) {
    console.error('[onboard] Failed to store onboard token:', tokenError)
  } else {
    try {
      await sendEmail({
        to: request.contact_email,
        subject: `Your brand has been approved — ${escapeHtml(request.brand_name)}`,
        html: `
          <p>Hi ${escapeHtml(request.contact_name)},</p>
          <p>Your brand <strong>${escapeHtml(request.brand_name)}</strong> has been approved and your influencer marketing tracking is now active.</p>
          <p>Please confirm your onboarding by clicking the link below:</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/onboard/${onboardToken}">Confirm your onboarding →</a></p>
          <p>This link expires in 30 days.</p>
        `,
      })
    } catch (err) {
      console.error('[email] Failed to send brand approval email:', err)
    }
  }

  // 6. Mark request as approved
  await serviceClient
    .from('brand_requests')
    .update({
      status: 'approved',
      workspace_id: workspace.id,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  revalidatePath(`/agency/${agencySlug}/requests`, 'page')
  revalidatePath(`/agency/${agencySlug}/dashboard`, 'page')

  return { workspaceSlug: workspace.slug }
}

/**
 * Reject a brand request — agency only, uses service client.
 */
export async function rejectBrandRequest(
  requestId: string,
  agencySlug: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Verify still pending
  const { data: request } = await serviceClient
    .from('brand_requests')
    .select('id, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (!request) return { error: 'Request not found or already processed.' }

  const { error } = await serviceClient
    .from('brand_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) return { error: 'Failed to reject request.' }

  revalidatePath(`/agency/${agencySlug}/requests`, 'page')

  return { success: true }
}

/**
 * Agency-initiated brand invite.
 * Creates a brand_requests row with status='invited' and sends an invite email to the brand contact.
 * Auth required — agency owner only.
 */
export async function inviteBrand(
  agencyId: string,
  agencySlug: string,
  data: unknown
): Promise<{ success: true } | { error: string }> {
  const parsed = inviteBrandSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Verify user owns this agency
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('id, name')
    .eq('id', agencyId)
    .eq('owner_id', user.id)
    .single()

  if (!agency) return { error: 'Unauthorized.' }

  // Generate invite token
  const { randomBytes } = await import('crypto')
  const inviteToken = randomBytes(32).toString('hex')
  const inviteTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await serviceClient.from('brand_requests').insert({
    brand_name: parsed.data.brand_name,
    contact_email: parsed.data.contact_email,
    agency_id: agencyId,
    status: 'invited',
    invite_token: inviteToken,
    invite_token_expires_at: inviteTokenExpiresAt,
    // Placeholders — brand fills these in on the invite page
    website_url: '',
    contact_name: '',
  })

  if (error) return { error: 'Failed to send invite. Please try again.' }

  // Send invite email to brand contact
  try {
    await sendEmail({
      to: parsed.data.contact_email,
      subject: `${escapeHtml(agency.name)} has invited you to Instroom Post Tracker`,
      html: `
        <p>Hi there,</p>
        <p><strong>${escapeHtml(agency.name)}</strong> has invited your brand <strong>${escapeHtml(parsed.data.brand_name)}</strong> to connect on Instroom Post Tracker — an influencer marketing tracking platform.</p>
        <p>To get started, please click the link below and fill in your brand details:</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/brand-invite/${inviteToken}">Accept invitation →</a></p>
        <p>This link expires in 30 days.</p>
        <p style="color:#888;font-size:12px;">If you were not expecting this invitation, you can safely ignore this email.</p>
      `,
    })
  } catch (err) {
    console.error('[email] Failed to send brand invite email:', err)
  }

  revalidatePath(`/agency/${agencySlug}/brands`, 'page')
  revalidatePath(`/agency/${agencySlug}/requests`, 'page')

  return { success: true }
}

/**
 * Brand accepts an agency-initiated invite by filling in their details.
 * No auth required — unauthenticated public page.
 * Creates the workspace and sends the onboard confirmation email.
 */
export async function acceptBrandInvite(
  token: string,
  data: unknown
): Promise<{ success: true } | { error: string }> {
  const parsed = acceptBrandInviteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const serviceClient = createServiceClient()

  // Look up invite
  const { data: request } = await serviceClient
    .from('brand_requests')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (!request) return { error: 'Invalid or expired invitation link.' }
  if (request.status !== 'invited') return { error: 'This invitation has already been used or is no longer active.' }
  if (request.invite_token_expires_at && new Date(request.invite_token_expires_at) < new Date()) {
    return { error: 'This invitation link has expired. Please ask your agency to send a new one.' }
  }

  // Update brand_requests with brand-provided details
  await serviceClient
    .from('brand_requests')
    .update({
      contact_name: parsed.data.contact_name,
      website_url: parsed.data.website_url,
      logo_url: parsed.data.logo_url || null,
    })
    .eq('id', request.id)

  // Generate unique workspace slug
  let slug = toSlug(request.brand_name)
  const { data: existing } = await serviceClient
    .from('workspaces')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  // Look up agency owner to set as workspace owner
  const { data: agencyOwner } = await serviceClient
    .from('agencies')
    .select('owner_id')
    .eq('id', request.agency_id)
    .single()

  if (!agencyOwner) return { error: 'Agency not found.' }

  // Create workspace
  const { data: workspace, error: wsError } = await serviceClient
    .from('workspaces')
    .insert({
      name: request.brand_name,
      slug,
      logo_url: parsed.data.logo_url || null,
      agency_id: request.agency_id || null,
    })
    .select('id, slug')
    .single()

  if (wsError || !workspace) return { error: 'Failed to create workspace. Please try again.' }

  // Add agency owner as workspace owner
  await serviceClient
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: agencyOwner.owner_id, role: 'owner' })

  // Seed default EMV config
  await serviceClient.rpc('seed_workspace_defaults', { p_workspace_id: workspace.id })

  // Generate onboard token and send confirmation email
  const { randomBytes } = await import('crypto')
  const onboardToken = randomBytes(32).toString('hex')
  const onboardTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await serviceClient
    .from('brand_requests')
    .update({
      status: 'approved',
      workspace_id: workspace.id,
      reviewed_at: new Date().toISOString(),
      onboard_token: onboardToken,
      onboard_token_expires_at: onboardTokenExpiresAt,
    })
    .eq('id', request.id)

  try {
    await sendEmail({
      to: request.contact_email,
      subject: `You're all set — ${escapeHtml(request.brand_name)}`,
      html: `
        <p>Hi ${escapeHtml(parsed.data.contact_name)},</p>
        <p>Thanks for confirming your details! Your brand <strong>${escapeHtml(request.brand_name)}</strong> is now connected to Instroom Post Tracker.</p>
        <p>Sign in below to access your brand portal and view your campaign performance:</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/onboard/${onboardToken}">Access your brand portal →</a></p>
        <p>This link expires in 30 days.</p>
      `,
    })
  } catch (err) {
    console.error('[email] Failed to send onboard confirmation email:', err)
  }

  return { success: true }
}

/**
 * Get brand requests — agency only, user-scoped client (RLS: any authed user can SELECT).
 */
export async function getBrandRequests(
  status?: BrandRequestStatus
): Promise<BrandRequest[]> {
  const supabase = await createClient()

  let query = supabase
    .from('brand_requests')
    .select('id, brand_name, website_url, logo_url, contact_name, contact_email, description, status, workspace_id, reviewed_by, reviewed_at, created_at')
    .order('created_at', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data } = await query

  return (data ?? []) as BrandRequest[]
}
