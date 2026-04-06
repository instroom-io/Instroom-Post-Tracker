'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { updateCollabStatusSchema } from '@/lib/validations'
import { getFreshAccessToken } from '@/lib/google/tokens'
import { processPostDownload } from '@/lib/downloads/process-download'
import type { CollabStatus } from '@/lib/types'

export async function updateCollabStatus(
  postId: string,
  status: CollabStatus
): Promise<{ error: string } | void> {
  const parsed = updateCollabStatusSchema.safeParse({ post_id: postId, status })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('posts')
    .update({
      collab_status: status,
      collab_checked_by: user.id,
    })
    .eq('id', postId)

  if (error) return { error: 'Failed to update collab status.' }

  revalidatePath('/', 'layout')
}

export async function retryDownload(
  _postId: string
): Promise<{ error: string } | void> {
  // v2 feature — stub
  return { error: 'Manual retry is coming in v2.' }
}

export async function savePostToUserDrive(
  postId: string,
  workspaceId: string
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch member folder + user tokens in parallel
  const serviceClient = createServiceClient()
  const [{ data: member }, { data: userRecord }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('drive_folder_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single(),
    serviceClient
      .from('users')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .single(),
  ])

  if (!userRecord?.google_refresh_token) return { error: 'connect_required' }
  if (!member?.drive_folder_id) {
    return { error: 'Set your personal Drive folder in Account Settings before saving.' }
  }

  // Get a fresh access token (refreshes if expired)
  const accessToken = await getFreshAccessToken(user.id)
  if (!accessToken) return { error: 'connect_required' }

  // Re-download the media from EnsembleData and upload to the member's personal Drive.
  // Copying from the Shared Drive requires the user to be a Shared Drive member — instead
  // we fetch fresh media and upload directly using their OAuth tokens.
  try {
    await processPostDownload(serviceClient, postId, member.drive_folder_id, {
      accessToken,
      refreshToken: userRecord.google_refresh_token,
    })

    return { url: `https://drive.google.com/drive/folders/${member.drive_folder_id}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[savePostToUserDrive] error:', message)
    return { error: 'Failed to save to Google Drive. Please try again.' }
  }
}
