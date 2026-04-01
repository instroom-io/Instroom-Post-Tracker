'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { updatePreferencesSchema, updatePasswordSchema } from '@/lib/validations'
import { getFreshAccessToken } from '@/lib/google/tokens'

export async function updatePreferences(data: {
  preferred_language: string
  timezone: string
}): Promise<{ error: string } | void> {
  const parsed = updatePreferencesSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('users')
    .update({
      preferred_language: parsed.data.preferred_language,
      timezone: parsed.data.timezone,
    })
    .eq('id', user.id)

  if (error) return { error: 'Failed to update preferences.' }

  revalidatePath('/account/settings')
}

export async function updatePassword(data: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<{ error: string } | void> {
  const parsed = updatePasswordSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: parsed.data.currentPassword,
  })
  if (signInError) return { error: 'Current password is incorrect.' }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (updateError) return { error: 'Failed to update password.' }
}

export async function disconnectGoogleDrive(): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Service client required — RLS blocks self-update on token columns and
  // workspace_members (admin-only policy). Auth is enforced above via getUser().
  const serviceClient = createServiceClient()

  await Promise.all([
    serviceClient
      .from('users')
      .update({
        google_refresh_token: null,
        google_access_token: null,
        google_token_expiry: null,
        google_connected_email: null,
      })
      .eq('id', user.id),
    // Clear personal Drive folder selections across all workspaces
    serviceClient
      .from('workspace_members')
      .update({ drive_folder_id: null })
      .eq('user_id', user.id),
  ])

  revalidatePath('/account/settings')
}

export interface DriveFolder {
  id: string
  name: string
}

export async function listUserDriveFolders(
  parentId?: string
): Promise<{ folders: DriveFolder[] } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const accessToken = await getFreshAccessToken(user.id)
  if (!accessToken) return { error: 'not_connected' }

  const parent = parentId ?? 'root'
  const q = `'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const params = new URLSearchParams({
    q,
    fields: 'files(id,name)',
    orderBy: 'name',
    pageSize: '50',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    corpora: 'user',
  })

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) return { error: 'Failed to fetch folders from Google Drive.' }

  const data = await res.json() as { files: DriveFolder[] }
  return { folders: data.files ?? [] }
}

export async function setWorkspaceDriveFolder(
  workspaceId: string,
  folderId: string | null
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify membership — any role can set their own folder
  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'You are not a member of this workspace.' }

  // Service client required — RLS restricts workspace_members updates to admins,
  // but any member should be able to set their own personal folder.
  const { error } = await createServiceClient()
    .from('workspace_members')
    .update({ drive_folder_id: folderId })
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to update folder.' }

  revalidatePath('/account/settings')
}
