'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getFreshAccessToken } from '@/lib/google/tokens'
import { checkActionLimit, limiters } from '@/lib/rate-limit'
import { canUseFeature } from '@/lib/utils/plan'
import type { PlanType } from '@/lib/utils/plan'

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

  // Plan gate — drive_download requires trial or pro
  const { data: ws } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single()
  if (!canUseFeature((ws?.plan ?? 'free') as PlanType, 'drive_download')) {
    return { error: 'Drive download is not available on your current plan. Upgrade to unlock.' }
  }

  const accessToken = await getFreshAccessToken(user.id)
  if (!accessToken) return { error: 'connect_required' }

  const [{ data: post }, { data: userRecord }] = await Promise.all([
    supabase
      .from('posts')
      .select('drive_file_id')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .single(),
    createServiceClient()
      .from('users')
      .select('personal_drive_folder_id')
      .eq('id', user.id)
      .single(),
  ])

  if (!post?.drive_file_id) return { error: 'not_downloaded' }

  // Copy the Shared Drive file to the user's personal Drive folder.
  // Requires the user's Google account to be added to the Shared Drive (Viewer role).
  const copyBody: Record<string, unknown> = {}
  const folderId = (userRecord as unknown as { personal_drive_folder_id: string | null } | null)?.personal_drive_folder_id
  if (folderId) {
    copyBody.parents = [folderId]
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
