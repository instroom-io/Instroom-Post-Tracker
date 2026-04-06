'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { processPostDownload } from '@/lib/downloads/process-download'

export async function triggerPostDownload(
  postId: string,
  workspaceId: string
): Promise<{ driveUrl: string } | { error: string }> {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Role check + fetch personal Drive folder
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role, drive_folder_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  if (!member.drive_folder_id) {
    return { error: 'Set your personal Drive folder in Settings → Members before downloading.' }
  }

  // 3. Fetch user's Google OAuth tokens (service client required — RLS blocks reading own token columns)
  const serviceClient = createServiceClient()
  const { data: userRecord } = await serviceClient
    .from('users')
    .select('google_access_token, google_refresh_token')
    .eq('id', user.id)
    .single()

  if (!userRecord?.google_refresh_token) {
    return { error: 'Connect your Google Drive in Account Settings before downloading.' }
  }

  // 4. Validate post belongs to workspace
  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!post) return { error: 'Post not found.' }

  // 5. Download media and upload to member's personal Drive folder.
  // This is independent of the auto-download (Shared Drive) — no download_status check.
  try {
    await processPostDownload(serviceClient, postId, member.drive_folder_id, {
      accessToken: userRecord.google_access_token ?? '',
      refreshToken: userRecord.google_refresh_token,
    })

    return { driveUrl: `https://drive.google.com/drive/folders/${member.drive_folder_id}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed.'
    return { error: message }
  }
}
