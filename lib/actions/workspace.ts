'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateAssignedMemberSchema,
} from '@/lib/validations'
import { toSlug, extractDriveFolderId, isPersonalEmail } from '@/lib/utils'
import { sendEmail, escapeHtml } from '@/lib/email'
import { teamInviteEmail } from '@/lib/email/templates/team-invite'
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
    .insert({ name: parsed.data.name, slug })
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

  if (!member || !['owner', 'admin'].includes(member.role)) {
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
): Promise<{ error: string } | void> {
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

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
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
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  try {
    await sendEmail({
      to: parsed.data.email,
      subject: `You've been invited to ${escapeHtml(workspace?.name ?? 'a workspace')} on Instroom`,
      html: teamInviteEmail({
        workspaceName: workspace?.name ?? 'a workspace',
        role: parsed.data.role,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`,
      }),
    })
  } catch (err) {
    console.error('[email] Failed to send team member invite email:', err)
  }

  revalidatePath('/', 'layout')
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

export async function setMemberDriveFolder(
  workspaceId: string,
  memberId: string,
  rawFolderId: string | null
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Caller must be the member themselves OR an owner/admin
  const [{ data: callerMember }, { data: targetMember }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role, user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('workspace_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('workspace_id', workspaceId)
      .single(),
  ])

  const isSelf = callerMember?.user_id === targetMember?.user_id
  const isAdmin = ['owner', 'admin'].includes(callerMember?.role ?? '')
  if (!isSelf && !isAdmin) return { error: 'Insufficient permissions.' }

  const folderId = rawFolderId ? extractDriveFolderId(rawFolderId) : null

  // Use service client — RLS only allows admins to UPDATE workspace_members,
  // but members should be able to update their own drive_folder_id.
  // Authorization is enforced above (isSelf || isAdmin).
  const { error } = await createServiceClient()
    .from('workspace_members')
    .update({ drive_folder_id: folderId })
    .eq('id', memberId)

  if (error) return { error: 'Failed to save Drive folder.' }

  revalidatePath('/', 'layout')
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

  if (!member || !['owner', 'admin'].includes(member.role)) {
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

  if (!requester || !['owner', 'admin'].includes(requester.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { data: target } = await supabase
    .from('workspace_members')
    .select('role, user_id')
    .eq('id', memberId)
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
  if (!member || !['owner', 'admin'].includes(member.role)) return { error: 'Unauthorized.' }

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
  if (!member || !['owner', 'admin'].includes(member.role)) return { error: 'Unauthorized.' }

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
