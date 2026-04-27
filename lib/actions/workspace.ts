'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateAssignedMemberSchema,
  updateWorkspaceStorageFolderSchema,
} from '@/lib/validations'
import { toSlug } from '@/lib/utils'
import { canUseFeature } from '@/lib/utils/plan'
import type { PlanType } from '@/lib/utils/plan'
import { sendEmail, escapeHtml } from '@/lib/email'
import { teamInviteEmail } from '@/lib/email/templates/team-invite'
import { joinRequestReceivedEmail } from '@/lib/email/templates/join-request-received'
import { joinRequestApprovedEmail } from '@/lib/email/templates/join-request-approved'
import { joinRequestDeniedEmail } from '@/lib/email/templates/join-request-denied'
import type { WorkspaceRole } from '@/lib/types'

export async function createWorkspace(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const parsed = createWorkspaceSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Workspace quota check
  const { data: ownedMemberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')

  const firstOwnedId = ownedMemberships?.[0]?.workspace_id
  const { data: quotaRow } = firstOwnedId
    ? await supabase
        .from('workspaces')
        .select('workspace_quota, plan, trial_started_at, trial_ends_at, account_type')
        .eq('id', firstOwnedId)
        .single()
    : { data: null }

  const ownedCount = ownedMemberships?.length ?? 0
  const quota = quotaRow?.workspace_quota ?? (
    // For team users creating their first workspace, check agency quota
    user.user_metadata?.account_type === 'team' ? 3 : 1
  )

  if (ownedCount >= quota) {
    return { error: `You've reached your workspace limit (${quota}). Contact us to expand your plan.` }
  }

  // For team users with no prior workspace, inherit trial dates from their agency
  let inheritedPlan: PlanType = quotaRow?.plan ?? 'trial'
  let inheritedTrialStartedAt: string | null = quotaRow?.trial_started_at ?? null
  let inheritedTrialEndsAt: string | null = quotaRow?.trial_ends_at ?? null
  const inheritedAccountType = quotaRow?.account_type ?? (user.user_metadata?.account_type as 'solo' | 'team' | undefined) ?? 'solo'
  const inheritedQuota = quotaRow?.workspace_quota ?? (inheritedAccountType === 'team' ? 3 : 1)

  if (!firstOwnedId) {
    // No prior workspace — for team users, pull trial dates from their agency
    if (inheritedAccountType === 'team') {
      const { data: agencyRow } = await serviceClient
        .from('agencies')
        .select('plan, trial_started_at, trial_ends_at')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()
      if (agencyRow) {
        inheritedPlan = (agencyRow.plan as PlanType) ?? 'trial'
        inheritedTrialStartedAt = agencyRow.trial_started_at ?? null
        inheritedTrialEndsAt = agencyRow.trial_ends_at ?? null
      }
    }
    // For solo users this path shouldn't occur (auth callback creates their first workspace),
    // but as a safety net generate fresh trial dates
    if (!inheritedTrialEndsAt) {
      inheritedTrialStartedAt = new Date().toISOString()
      inheritedTrialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  // Generate unique slug
  let slug = toSlug(parsed.data.name)
  const { data: existing } = await serviceClient
    .from('workspaces')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  const { data: workspace, error: wsError } = await serviceClient
    .from('workspaces')
    .insert({
      name: parsed.data.name,
      slug,
      plan: inheritedPlan,
      trial_started_at: inheritedTrialStartedAt,
      trial_ends_at: inheritedTrialEndsAt,
      account_type: inheritedAccountType,
      workspace_quota: inheritedQuota,
    })
    .select('id, slug')
    .single()

  if (wsError || !workspace) {
    return { error: 'Failed to create workspace. Please try again.' }
  }

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

  // Seed default EMV config
  await serviceClient.rpc('seed_workspace_defaults', {
    p_workspace_id: workspace.id,
  })

  redirect(`/${workspace.slug}/overview`)
}

export async function updateWorkspace(
  workspaceId: string,
  data: unknown
): Promise<{ error: string } | void> {
  const parsed = updateWorkspaceSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('workspaces')
    .update(parsed.data)
    .eq('id', workspaceId)

  if (error) return { error: 'Failed to update workspace.' }

  revalidatePath('/', 'layout')
}

export async function inviteMember(
  workspaceId: string,
  data: unknown
): Promise<{ error: string } | { warning: string } | void> {
  const parsed = inviteMemberSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  // Plan check — team member invites require trial or pro
  const { data: workspaceRow } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single()

  if (!canUseFeature((workspaceRow?.plan ?? 'free') as PlanType, 'team_members')) {
    return { error: 'Team member invites are not available on your current plan. Upgrade to unlock.' }
  }

  // Check if already a member
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', parsed.data.email)
    .maybeSingle()

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', existingUser.id)
      .maybeSingle()

    if (existingMember) {
      return { error: 'This person is already a member of this workspace.' }
    }
  }

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      workspace_id: workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
    })
    .select('token')
    .single()

  if (error || !invitation) return { error: 'Failed to send invitation.' }

  // Send invite email (fire-and-forget)
  // invitations.token is DB-generated; SELECT policy is using(true) so read-back is permitted.
  const [{ data: workspace }, { data: inviterProfile }] = await Promise.all([
    supabase.from('workspaces').select('name').eq('id', workspaceId).single(),
    supabase.from('users').select('full_name').eq('id', user.id).single(),
  ])

  const inviterName =
    inviterProfile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Someone'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('[inviteMember] NEXT_PUBLIC_APP_URL is not set — invite link will be broken')
  }

  let emailSent = true
  try {
    await sendEmail({
      to: parsed.data.email,
      subject: `You've been invited to ${escapeHtml(workspace?.name ?? 'a workspace')} on Instroom`,
      html: teamInviteEmail({
        workspaceName: workspace?.name ?? 'a workspace',
        role: parsed.data.role,
        inviteUrl: `${appUrl ?? ''}/invite/${invitation.token}`,
        inviterName,
      }),
    })
  } catch (err) {
    console.error('[email] Failed to send team member invite email:', err)
    emailSent = false
  }

  revalidatePath('/', 'layout')

  if (!emailSent) {
    return { warning: 'Invitation created but email failed to send. Share the invite link manually.' }
  }
}

export async function acceptInvitation(
  token: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  const { data: invitation } = await serviceClient
    .from('invitations')
    .select('*, workspaces(slug)')
    .eq('token', token)
    .maybeSingle()

  if (!invitation) return { error: 'Invalid or expired invitation.' }
  if (invitation.accepted_at) return { error: 'This invitation has already been used.' }
  if (new Date(invitation.expires_at) < new Date()) {
    return { error: 'This invitation has expired.' }
  }
  if (invitation.email !== user.email) {
    return { error: `This invitation was sent to ${invitation.email}.` }
  }

  const { error: memberError } = await serviceClient
    .from('workspace_members')
    .insert({
      workspace_id: invitation.workspace_id,
      user_id: user.id,
      role: invitation.role as WorkspaceRole,
      invited_by: null,
    })

  if (memberError) {
    if (memberError.code === '23505') {
      return { error: 'You are already a member of this workspace.' }
    }
    return { error: 'Failed to accept invitation.' }
  }

  await serviceClient
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  const workspace = invitation.workspaces as { slug: string } | null
  redirect(`/${workspace?.slug ?? ''}/overview`)
}

export async function updateAssignedMember(
  workspaceId: string,
  data: unknown
): Promise<{ error: string } | void> {
  const parsed = updateAssignedMemberSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('workspaces')
    .update({ assigned_member_id: parsed.data.userId })
    .eq('id', workspaceId)

  if (error) return { error: 'Failed to update assigned member.' }

  revalidatePath('/', 'layout')
}

export async function removeMember(
  workspaceId: string,
  memberId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: requester } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!requester || !['owner', 'admin', 'manager'].includes(requester.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { data: target } = await supabase
    .from('workspace_members')
    .select('role, user_id')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!target) return { error: 'Member not found.' }
  if (target.role === 'owner') return { error: 'Cannot remove the workspace owner.' }
  if (target.user_id === user.id) return { error: 'Cannot remove yourself.' }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: 'Failed to remove member.' }

  revalidatePath('/', 'layout')
}

export async function uploadWorkspaceLogo(
  workspaceId: string,
  formData: FormData
): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify owner or admin
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member || !['owner', 'admin', 'manager'].includes(member.role)) return { error: 'Unauthorized.' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'File must be under 2 MB.' }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) return { error: 'Only JPEG, PNG, and GIF files are allowed.' }

  // Delete old file if it exists in workspace-logos bucket
  const { data: ws } = await supabase.from('workspaces').select('logo_url').eq('id', workspaceId).single()
  if (ws?.logo_url) {
    const oldPath = ws.logo_url.split('/workspace-logos/')[1]
    if (oldPath) await supabase.storage.from('workspace-logos').remove([oldPath])
  }

  // Upload new file
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${workspaceId}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('workspace-logos')
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return { error: 'Failed to upload logo.' }

  const { data: { publicUrl } } = supabase.storage.from('workspace-logos').getPublicUrl(path)

  const { error: dbError } = await supabase
    .from('workspaces')
    .update({ logo_url: publicUrl })
    .eq('id', workspaceId)
  if (dbError) return { error: 'Failed to save logo URL.' }

  revalidatePath('/[workspaceSlug]/(dashboard)/settings', 'page')
  revalidatePath('/[workspaceSlug]/(dashboard)/overview', 'page')
  return { url: publicUrl }
}

export async function removeWorkspaceLogo(
  workspaceId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member || !['owner', 'admin', 'manager'].includes(member.role)) return { error: 'Unauthorized.' }

  const { data: ws } = await supabase.from('workspaces').select('logo_url').eq('id', workspaceId).single()
  if (ws?.logo_url) {
    const oldPath = ws.logo_url.split('/workspace-logos/')[1]
    if (oldPath) await supabase.storage.from('workspace-logos').remove([oldPath])
  }

  const { error } = await supabase.from('workspaces').update({ logo_url: null }).eq('id', workspaceId)
  if (error) return { error: 'Failed to remove logo.' }

  revalidatePath('/[workspaceSlug]/(dashboard)/settings', 'page')
  revalidatePath('/[workspaceSlug]/(dashboard)/overview', 'page')
}

export async function updateWorkspaceStorageFolder(
  workspaceId: string,
  rawFolderId: string | null
): Promise<{ error: string } | void> {
  const parsed = updateWorkspaceStorageFolderSchema.safeParse({ drive_folder_id: rawFolderId })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('workspaces')
    .update({ drive_folder_id: parsed.data.drive_folder_id })
    .eq('id', workspaceId)

  if (error) return { error: 'Failed to update storage folder.' }

  revalidatePath('/', 'layout')
}

// ─── Shared Workspace Path B — join request flow ──────────────────────────────

export async function requestWorkspaceAccess(
  workspaceId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to request access.' }

  // Use service client — requester is not yet a member, so RLS would block workspace_members reads
  const serviceClient = createServiceClient()

  // Check not already a member
  const { data: existingMember } = await serviceClient
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMember) return { error: 'You are already a member of this workspace.' }

  // Check for existing request
  const { data: existingRequest } = await serviceClient
    .from('workspace_join_requests')
    .select('id, status')
    .eq('workspace_id', workspaceId)
    .eq('requester_id', user.id)
    .maybeSingle()

  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      return { error: 'Your request is already pending review.' }
    }
    // Previously denied — allow re-request by resetting to pending
    const { error: updateError } = await serviceClient
      .from('workspace_join_requests')
      .update({
        status: 'pending',
        requested_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
      })
      .eq('id', existingRequest.id)
    if (updateError) return { error: 'Failed to submit request.' }
  } else {
    const { error: insertError } = await serviceClient
      .from('workspace_join_requests')
      .insert({ workspace_id: workspaceId, requester_id: user.id })
    if (insertError) return { error: 'Failed to submit request.' }
  }

  // Fetch workspace name + owner email to send notification
  const [{ data: workspace }, { data: ownerMember }, { data: requesterProfile }] = await Promise.all([
    serviceClient.from('workspaces').select('name, slug').eq('id', workspaceId).single(),
    serviceClient
      .from('workspace_members')
      .select('user:users!workspace_members_user_id_fkey(email, full_name)')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
      .single(),
    serviceClient.from('users').select('full_name, email').eq('id', user.id).single(),
  ])

  const rawOwnerUser = ownerMember?.user
  const ownerUser = (Array.isArray(rawOwnerUser) ? (rawOwnerUser[0] ?? null) : rawOwnerUser) as { email: string; full_name: string | null } | null
  const requesterName =
    requesterProfile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Someone'
  const requesterEmail = requesterProfile?.email ?? user.email ?? ''

  if (ownerUser?.email && workspace) {
    try {
      await sendEmail({
        to: ownerUser.email,
        subject: `${escapeHtml(requesterName)} requested access to ${escapeHtml(workspace.name)}`,
        html: joinRequestReceivedEmail({
          workspaceName: workspace.name,
          workspaceSlug: workspace.slug,
          requesterName,
          requesterEmail,
          settingsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${workspace.slug}/settings`,
        }),
      })
    } catch (err) {
      console.error('[email] Failed to send join request received email:', err)
    }
  }

  return { success: true }
}

export async function approveJoinRequest(
  requestId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Fetch the request
  const { data: request } = await serviceClient
    .from('workspace_join_requests')
    .select('workspace_id, requester_id, status')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.status !== 'pending') return { error: 'This request has already been reviewed.' }

  // Verify caller is the workspace owner
  const { data: callerMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', request.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!callerMember || !['owner', 'admin', 'manager'].includes(callerMember.role)) {
    return { error: 'Only workspace Admins can approve requests.' }
  }

  // Check if requester is already a member (could happen if approved via another path)
  const { data: alreadyMember } = await serviceClient
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', request.workspace_id)
    .eq('user_id', request.requester_id)
    .maybeSingle()

  if (!alreadyMember) {
    // Add member with manager role
    const { error: memberError } = await serviceClient
      .from('workspace_members')
      .insert({
        workspace_id: request.workspace_id,
        user_id: request.requester_id,
        role: 'manager' as WorkspaceRole,
        invited_by: user.id,
      })

    if (memberError) return { error: 'Failed to add member.' }
  }

  // Mark request approved
  await serviceClient
    .from('workspace_join_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', requestId)

  // Send approval email to requester
  const [{ data: workspace }, { data: requesterProfile }] = await Promise.all([
    serviceClient.from('workspaces').select('name, slug').eq('id', request.workspace_id).single(),
    serviceClient.from('users').select('email, full_name').eq('id', request.requester_id).single(),
  ])

  if (requesterProfile?.email && workspace) {
    try {
      await sendEmail({
        to: requesterProfile.email,
        subject: `You've been added to ${escapeHtml(workspace.name)} on Instroom`,
        html: joinRequestApprovedEmail({
          workspaceName: workspace.name,
          workspaceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${workspace.slug}/overview`,
        }),
      })
    } catch (err) {
      console.error('[email] Failed to send join request approved email:', err)
    }
  }

  revalidatePath('/', 'layout')
}

export async function denyJoinRequest(
  requestId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()

  // Fetch the request
  const { data: request } = await serviceClient
    .from('workspace_join_requests')
    .select('workspace_id, requester_id, status')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Request not found.' }
  if (request.status !== 'pending') return { error: 'This request has already been reviewed.' }

  // Verify caller is the workspace owner
  const { data: callerMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', request.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!callerMember || !['owner', 'admin', 'manager'].includes(callerMember.role)) {
    return { error: 'Only workspace Admins can deny requests.' }
  }

  // Mark request denied
  await serviceClient
    .from('workspace_join_requests')
    .update({
      status: 'denied',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', requestId)

  // Send denial email to requester
  const [{ data: workspace }, { data: requesterProfile }] = await Promise.all([
    serviceClient.from('workspaces').select('name').eq('id', request.workspace_id).single(),
    serviceClient.from('users').select('email').eq('id', request.requester_id).single(),
  ])

  if (requesterProfile?.email && workspace) {
    try {
      await sendEmail({
        to: requesterProfile.email,
        subject: `Your request to join ${escapeHtml(workspace.name)} was not approved`,
        html: joinRequestDeniedEmail({ workspaceName: workspace.name }),
      })
    } catch (err) {
      console.error('[email] Failed to send join request denied email:', err)
    }
  }

  revalidatePath('/', 'layout')
}

export async function revokeInvitation(
  invitationId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invitation } = await supabase
    .from('invitations')
    .select('workspace_id, accepted_at')
    .eq('id', invitationId)
    .single()

  if (!invitation) return { error: 'Invitation not found.' }
  if (invitation.accepted_at) return { error: 'Cannot revoke an accepted invitation.' }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', invitation.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (error) return { error: 'Failed to revoke invitation.' }
  revalidatePath('/', 'layout')
}

export async function resendInvitation(
  invitationId: string
): Promise<{ error: string } | { warning: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invitation } = await supabase
    .from('invitations')
    .select('workspace_id, email, role, token, accepted_at, expires_at')
    .eq('id', invitationId)
    .single()

  if (!invitation) return { error: 'Invitation not found.' }
  if (invitation.accepted_at) return { error: 'This invitation has already been accepted.' }
  if (new Date(invitation.expires_at) < new Date()) return { error: 'This invitation has expired. Please revoke it and send a new one.' }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', invitation.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const [{ data: workspace }, { data: inviterProfile }] = await Promise.all([
    supabase.from('workspaces').select('name').eq('id', invitation.workspace_id).single(),
    supabase.from('users').select('full_name').eq('id', user.id).single(),
  ])

  const inviterName = inviterProfile?.full_name?.trim() || user.email?.split('@')[0] || 'Someone'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('[resendInvitation] NEXT_PUBLIC_APP_URL is not set — invite link will be broken')
  }

  try {
    await sendEmail({
      to: invitation.email,
      subject: `You've been invited to ${escapeHtml(workspace?.name ?? 'a workspace')} on Instroom`,
      html: teamInviteEmail({
        workspaceName: workspace?.name ?? 'a workspace',
        role: invitation.role,
        inviteUrl: `${appUrl ?? ''}/invite/${invitation.token}`,
        inviterName,
      }),
    })
  } catch (err) {
    console.error('[email] Failed to resend team member invite email:', err)
    return { warning: 'Failed to resend the invitation email. Check SendGrid configuration.' }
  }
}
