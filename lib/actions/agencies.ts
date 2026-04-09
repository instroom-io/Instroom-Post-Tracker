'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail, escapeHtml } from '@/lib/email'
import { brandInviteEmail } from '@/lib/email/templates/brand-invite'
import { agencyApprovedEmail } from '@/lib/email/templates/agency-approved'
import { isPersonalEmail } from '@/lib/utils'
import { z } from 'zod'
import { agencyRequestSchema, createWorkspaceSchema, inviteMemberSchema, updateWorkspaceStorageFolderSchema } from '@/lib/validations'
import { toSlug } from '@/lib/utils'
import type { Agency, AgencyRequest } from '@/lib/types'
import { checkActionLimit, getRequestIp, limiters } from '@/lib/rate-limit'

/**
 * Send a brand invite — stores the invite in brand_invites, no workspace created yet.
 * Workspace is created when the brand completes the onboarding form.
 * Agency owner only.
 */
export async function inviteBrand(
  agencyId: string,
  name: string,
  email: string
): Promise<{ error: string } | { token: string; emailSent: boolean }> {
  const nameParsed = createWorkspaceSchema.safeParse({ name })
  if (!nameParsed.success) return { error: nameParsed.error.errors[0].message }

  const emailParsed = inviteMemberSchema.shape.email.safeParse(email)
  if (!emailParsed.success) return { error: emailParsed.error.errors[0].message }

  if (isPersonalEmail(emailParsed.data)) {
    return { error: 'Please use a work email address.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const inviteLimit = await checkActionLimit(`invitebrand:user:${user.id}`, limiters.inviteBrand)
  if (inviteLimit) return inviteLimit

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, logo_url')
    .eq('id', agencyId)
    .eq('owner_id', user.id)
    .single()
  if (!agency) return { error: 'Unauthorized.' }

  const serviceClient = createServiceClient()

  const { data: invite, error: inviteError } = await serviceClient
    .from('brand_invites')
    .insert({
      agency_id: agencyId,
      workspace_name: nameParsed.data.name,
      email: emailParsed.data,
      invited_by: user.id,
    })
    .select('token')
    .single()

  if (inviteError || !invite) return { error: 'Failed to send invite.' }

  let emailSent = true
  try {
    await sendEmail({
      to: emailParsed.data,
      subject: `${escapeHtml(agency.name)} has invited you to Instroom`,
      html: brandInviteEmail({
        agencyName: agency.name,
        agencyLogoUrl: agency.logo_url ?? undefined,
        workspaceName: nameParsed.data.name,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/brand-invite/${invite.token}`,
      }),
    })
  } catch (err) {
    console.error('[email] Failed to send brand invite email:', err)
    emailSent = false
  }

  revalidatePath('/', 'layout')
  return { token: invite.token, emailSent }
}

/**
 * Accept a brand invite — creates the workspace with the brand's submitted info.
 * Called from the public /brand-invite/[token] page (no auth required).
 */
export async function acceptBrandInvite(
  token: string,
  data: { logoFile: File | null; websiteUrl: string }
): Promise<{ error: string } | void> {
  const ip = await getRequestIp()
  const limited = await checkActionLimit(`brandinvite:ip:${ip}`, limiters.brandInviteAccept)
  if (limited) return limited

  const websiteSchema = z.string()
    .transform((v) => (v && /^www\./i.test(v) ? `https://${v}` : v))
    .pipe(z.string().url('Please enter a valid website URL'))
  const websiteParsed = websiteSchema.safeParse(data.websiteUrl)
  if (!websiteParsed.success) return { error: websiteParsed.error.errors[0].message }

  const serviceClient = createServiceClient()

  const { data: invite } = await serviceClient
    .from('brand_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return { error: 'Invalid or expired invite link.' }
  if (invite.accepted_at) return { error: 'This invite has already been used.' }
  if (new Date(invite.expires_at) < new Date()) return { error: 'This invite link has expired.' }

  // Generate unique slug
  let slug = toSlug(invite.workspace_name)
  const { data: existing } = await serviceClient
    .from('workspaces').select('slug').eq('slug', slug).maybeSingle()
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  // Derive favicon logo from website URL as default (overridden if file is uploaded)
  let logo_url: string | null = null
  try {
    const domain = new URL(websiteParsed.data).hostname.replace(/^www\./, '')
    logo_url = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`
  } catch { /* invalid URL — leave null */ }

  // Create workspace
  const { data: workspace, error: wsError } = await serviceClient
    .from('workspaces')
    .insert({
      name: invite.workspace_name,
      slug,
      agency_id: invite.agency_id,
      logo_url,
    })
    .select('id, slug')
    .single()

  if (wsError || !workspace) return { error: 'Failed to create workspace.' }

  // Upload logo if provided
  if (data.logoFile) {
    const file = data.logoFile
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (file.size <= 2 * 1024 * 1024 && allowedTypes.includes(file.type)) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${workspace.id}/${Date.now()}.${ext}`
      const bytes = await file.arrayBuffer()
      const { error: uploadError } = await serviceClient.storage
        .from('workspace-logos')
        .upload(path, bytes, { contentType: file.type, upsert: false })
      if (!uploadError) {
        const { data: { publicUrl } } = serviceClient.storage.from('workspace-logos').getPublicUrl(path)
        await serviceClient.from('workspaces').update({ logo_url: publicUrl }).eq('id', workspace.id)
      }
    }
  }

  // Agency owner becomes workspace owner
  await serviceClient
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: invite.invited_by, role: 'owner' })

  await serviceClient.rpc('seed_workspace_defaults', { p_workspace_id: workspace.id })

  // Mark invite accepted
  await serviceClient
    .from('brand_invites')
    .update({
      accepted_at: new Date().toISOString(),
      workspace_id: workspace.id,
      website_url: websiteParsed.data,
    })
    .eq('id', invite.id)
}

/**
 * Submit an agency onboarding request (public — no auth required).
 * Uses service client because the form may be unauthenticated.
 */
export async function submitAgencyRequest(
  data: unknown
): Promise<{ success: true } | { error: string }> {
  const ip = await getRequestIp()
  const limited = await checkActionLimit(`agencyreq:ip:${ip}`, limiters.agencyRequest)
  if (limited) return limited

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
      contact_name: request.contact_name,
      contact_email: request.contact_email,
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
    subject: `Your agency has been approved — Instroom`,
    html: agencyApprovedEmail({
      contactName: request.contact_name,
      agencyName: request.agency_name,
      signupUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup`,
    }),
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
 * Update agency name and logo.
 * Agency owner only.
 */
export async function updateAgency(
  agencyId: string,
  data: { name: string; logo_url: string }
): Promise<{ error: string } | void> {
  const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    logo_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  })
  const parsed = schema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify caller owns this agency (RLS also enforces this)
  const { data: agency } = await supabase
    .from('agencies').select('owner_id').eq('id', agencyId).single()
  if (!agency || agency.owner_id !== user.id) return { error: 'Unauthorized.' }

  const { error } = await supabase
    .from('agencies')
    .update({ name: parsed.data.name, logo_url: parsed.data.logo_url || null })
    .eq('id', agencyId)
  if (error) return { error: 'Failed to save settings.' }

  revalidatePath('/agency/[agencySlug]/settings', 'page')
  revalidatePath('/agency/[agencySlug]/dashboard', 'page')
}

/**
 * Fetch active agencies for public dropdowns (e.g. brand request form).
 * Uses service client because the form may be unauthenticated.
 */
export async function getActiveAgenciesPublic(): Promise<Pick<Agency, 'id' | 'name'>[]> {
  const ip = await getRequestIp()
  const limited = await checkActionLimit(`agenciespublic:ip:${ip}`, limiters.agenciesPublic)
  if (limited) return []

  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('agencies')
    .select('id, name')
    .eq('status', 'active')
    .order('name')
  return (data ?? []) as Pick<Agency, 'id' | 'name'>[]
}

/**
 * Upload an agency logo to Supabase Storage.
 * Agency owner only. Old logo is deleted before new one is uploaded.
 */
export async function uploadAgencyLogo(
  agencyId: string,
  formData: FormData
): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const uploadLimit = await checkActionLimit(`uploadlogo:user:${user.id}`, limiters.uploadLogo)
  if (uploadLimit) return uploadLimit

  // Verify ownership
  const { data: agency } = await supabase
    .from('agencies')
    .select('owner_id, logo_url')
    .eq('id', agencyId)
    .single()
  if (!agency || agency.owner_id !== user.id) return { error: 'Unauthorized.' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided.' }

  // Validate size (2 MB)
  if (file.size > 2 * 1024 * 1024) return { error: 'File must be under 2 MB.' }

  // Validate type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPEG, PNG, and GIF files are allowed.' }
  }

  // Delete old file if it exists
  if (agency.logo_url) {
    const oldPath = agency.logo_url.split('/agency-logos/')[1]
    if (oldPath) {
      await supabase.storage.from('agency-logos').remove([oldPath])
    }
  }

  // Upload new file
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${agencyId}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('agency-logos')
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return { error: 'Failed to upload logo.' }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('agency-logos')
    .getPublicUrl(path)

  // Save to DB
  const { error: dbError } = await supabase
    .from('agencies')
    .update({ logo_url: publicUrl })
    .eq('id', agencyId)
  if (dbError) return { error: 'Failed to save logo URL.' }

  revalidatePath('/agency/[agencySlug]/settings', 'page')
  revalidatePath('/agency/[agencySlug]/dashboard', 'page')
  return { url: publicUrl }
}

/**
 * Remove the agency logo from Supabase Storage and clear logo_url.
 * Agency owner only.
 */
export async function removeAgencyLogo(
  agencyId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agency } = await supabase
    .from('agencies')
    .select('owner_id, logo_url')
    .eq('id', agencyId)
    .single()
  if (!agency || agency.owner_id !== user.id) return { error: 'Unauthorized.' }

  // Delete file from storage
  if (agency.logo_url) {
    const oldPath = agency.logo_url.split('/agency-logos/')[1]
    if (oldPath) {
      await supabase.storage.from('agency-logos').remove([oldPath])
    }
  }

  // Clear DB
  const { error } = await supabase
    .from('agencies')
    .update({ logo_url: null })
    .eq('id', agencyId)
  if (error) return { error: 'Failed to remove logo.' }

  revalidatePath('/agency/[agencySlug]/settings', 'page')
  revalidatePath('/agency/[agencySlug]/dashboard', 'page')
}

export async function updateAgencyStorageFolder(
  agencyId: string,
  rawFolderId: string | null
): Promise<{ error: string } | void> {
  const parsed = updateWorkspaceStorageFolderSchema.safeParse({ drive_folder_id: rawFolderId })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agency } = await supabase
    .from('agencies')
    .select('owner_id')
    .eq('id', agencyId)
    .single()
  if (!agency || agency.owner_id !== user.id) return { error: 'Unauthorized.' }

  const { error } = await supabase
    .from('agencies')
    .update({ drive_folder_id: parsed.data.drive_folder_id })
    .eq('id', agencyId)
  if (error) return { error: 'Failed to update storage folder.' }

  revalidatePath('/agency/[agencySlug]/settings', 'page')
}
