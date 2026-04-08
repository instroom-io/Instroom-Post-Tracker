'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getFreshAccessToken } from '@/lib/google/tokens'
import { checkActionLimit, limiters } from '@/lib/rate-limit'

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

  const limited = await checkActionLimit(`savetodrv:user:${user.id}`, limiters.saveToUserDrive)
  if (limited) return limited

  const accessToken = await getFreshAccessToken(user.id)
  if (!accessToken) return { error: 'connect_required' }

  const [{ data: post }, { data: member }] = await Promise.all([
    supabase
      .from('posts')
      .select('drive_file_id')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .single(),
    supabase
      .from('workspace_members')
      .select('drive_folder_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single(),
  ])

  if (!post?.drive_file_id) return { error: 'not_downloaded' }

  // Copy the Shared Drive file to the member's personal Drive folder.
  // Requires the member's Google account to be added to the Shared Drive (Viewer role).
  const copyBody: Record<string, unknown> = {}
  if (member?.drive_folder_id) {
    copyBody.parents = [member.drive_folder_id]
  }

  const copyRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${post.drive_file_id}/copy?supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(copyBody),
    }
  )

  if (!copyRes.ok) {
    const errText = await copyRes.text()
    console.error('[savePostToUserDrive] Drive copy error:', copyRes.status, errText)
    if (copyRes.status === 403 || copyRes.status === 404) {
      return { error: 'no_shared_drive_access' }
    }
    return { error: 'Failed to save to Google Drive. Please try again.' }
  }

  const copied = await copyRes.json() as { id: string }
  return { url: `https://drive.google.com/file/d/${copied.id}/view` }
}
