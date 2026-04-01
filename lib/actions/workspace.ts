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
import { toSlug, isPersonalEmail } from '@/lib/utils'
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

  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('workspaces')
    .update({ drive_folder_id: parsed.data.drive_folder_id })
    .eq('id', workspaceId)

  if (error) return { error: 'Failed to update storage folder.' }

  revalidatePath('/', 'layout')
}
