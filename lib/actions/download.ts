'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { processPostDownload } from '@/lib/downloads/process-download'
import { checkActionLimit, limiters } from '@/lib/rate-limit'
import { canUseFeature } from '@/lib/utils/plan'
import type { PlanType } from '@/lib/utils/plan'

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

  const limited = await checkActionLimit(`download:user:${user.id}`, limiters.triggerDownload)
  if (limited) return limited

  // 2. Role check
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  // 3. Plan check — drive download requires trial or pro
  const { data: workspaceRow } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single()

  if (!canUseFeature((workspaceRow?.plan ?? 'free') as PlanType, 'drive_download')) {
    return { error: 'Drive download is not available on your current plan. Upgrade to unlock.' }
  }

  // 4. Fetch user's personal Drive folder + Google OAuth tokens
  const serviceClient = createServiceClient()
  const { data: userRecord } = await serviceClient
    .from('users')
    .select('google_access_token, google_refresh_token, personal_drive_folder_id')
    .eq('id', user.id)
    .single()

  if (!userRecord?.google_refresh_token) {
    return { error: 'Connect your Google Drive in Account Settings before downloading.' }
  }

  const personalFolderId = (userRecord as unknown as { personal_drive_folder_id: string | null }).personal_drive_folder_id
  // null means "My Drive root" — upload.ts handles this via rootFolderId ?? 'root'

  // 5. Validate post belongs to workspace
  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!post) return { error: 'Post not found.' }

  // 6. Download media and upload to member's personal Drive folder.
  // This is independent of the auto-download (Shared Drive) — no download_status check.
  try {
    await processPostDownload(serviceClient, postId, personalFolderId, {
      accessToken: userRecord.google_access_token ?? '',
      refreshToken: userRecord.google_refresh_token,
    })

    const driveUrl = personalFolderId
      ? `https://drive.google.com/drive/folders/${personalFolderId}`
      : 'https://drive.google.com/'
    return { driveUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed.'
    return { error: message }
  }
}
