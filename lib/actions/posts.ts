'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getFreshAccessToken, getAgencyFreshAccessToken, getServiceAccountAccessToken } from '@/lib/google/tokens'
import { uploadToDrive } from '@/lib/drive/upload'
import { processPostDownload } from '@/lib/downloads/process-download'
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
    .select('plan, agency_id')
    .eq('id', workspaceId)
    .single()
  if (!canUseFeature((ws?.plan ?? 'free') as PlanType, 'drive_download')) {
    return { error: 'Drive download is not available on your current plan. Upgrade to unlock.' }
  }

  // User must have personal Google Drive connected
  const userAccessToken = await getFreshAccessToken(user.id)
  if (!userAccessToken) return { error: 'connect_required' }

  const [{ data: post }, { data: userRecord }] = await Promise.all([
    supabase
      .from('posts')
      .select('drive_file_id')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .single(),
    createServiceClient()
      .from('users')
      .select('personal_drive_folder_id, google_refresh_token')
      .eq('id', user.id)
      .single(),
  ])

  if (!post?.drive_file_id) return { error: 'not_downloaded' }

  const typedUser = userRecord as unknown as {
    personal_drive_folder_id: string | null
    google_refresh_token: string | null
  } | null
  const folderId = typedUser?.personal_drive_folder_id ?? null
  const userRefreshToken = typedUser?.google_refresh_token ?? null
  if (!userRefreshToken) return { error: 'connect_required' }

  // Determine which token can READ the source file. The download worker stores files in:
  //   Agency workspace (agency_id set)  → agency Shared Drive  → agency OAuth token
  //   Non-agency workspace              → workspace owner's personal Drive → owner's OAuth
  //   Either type, no OAuth available   → service account Drive → service account token
  const agencyId = (ws as unknown as { agency_id: string | null } | null)?.agency_id
  let sourceToken: string | null

  if (agencyId) {
    // Agency Shared Drive — agency OAuth token uploaded the file, so it can read it back
    sourceToken = await getAgencyFreshAccessToken(agencyId)
    // Fallback: service account (used when agency had no Google connected at upload time)
    if (!sourceToken) sourceToken = await getServiceAccountAccessToken()
  } else {
    // Non-agency workspace — file is in the workspace owner's personal Drive.
    // The current user might be the owner (solo) or a team member (team account).
    // Either way, only the owner's token has read access.
    const { data: ownerMember } = await createServiceClient()
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
      .single()

    const ownerId = ownerMember?.user_id ?? null

    if (ownerId === user.id) {
      // Current user IS the owner — token already in hand
      sourceToken = userAccessToken
    } else if (ownerId) {
      // Team member — read using owner's OAuth token
      sourceToken = await getFreshAccessToken(ownerId)
      // Fallback: service account (if owner never connected Google Drive)
      if (!sourceToken) sourceToken = await getServiceAccountAccessToken()
    } else {
      // Can't resolve owner — last resort: service account
      sourceToken = await getServiceAccountAccessToken()
    }
  }

  // Fast path: Drive-to-Drive copy using the resolved source token.
  // If this fails for any reason (expired token, Shared Drive membership, deleted file),
  // fall through to the CDN re-download fallback below.
  if (sourceToken) {
    const [metaRes, contentRes] = await Promise.all([
      fetch(
        `https://www.googleapis.com/drive/v3/files/${post.drive_file_id}?fields=name,mimeType&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${sourceToken}` } }
      ),
      fetch(
        `https://www.googleapis.com/drive/v3/files/${post.drive_file_id}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${sourceToken}` } }
      ),
    ])

    if (metaRes.ok && contentRes.ok) {
      const { name: fileName } = await metaRes.json() as { name: string; mimeType: string }
      const fileBuffer = await contentRes.arrayBuffer()
      try {
        const { fileId } = await uploadToDrive({
          fileBuffer,
          fileName,
          folderPath: 'Post Tracker',
          rootFolderId: folderId ?? undefined,
          accessToken: userAccessToken,
          refreshToken: userRefreshToken,
        })
        return { url: `https://drive.google.com/file/d/${fileId}/view` }
      } catch (uploadErr) {
        console.error('[savePostToUserDrive] Upload failed:', uploadErr)
        return { error: 'Failed to save to your Google Drive. Please try again.' }
      }
    }

    console.warn('[savePostToUserDrive] Drive read failed (%s/%s) — falling back to CDN re-download', metaRes.status, contentRes.status)
  }

  // Fallback: re-download from the original CDN source and upload to user's Drive.
  // This works regardless of which Drive the file was originally stored in.
  try {
    const svc = createServiceClient()
    const result = await processPostDownload(svc, postId, folderId, {
      accessToken: userAccessToken,
      refreshToken: userRefreshToken,
    })
    return { url: `https://drive.google.com/file/d/${result.driveFileId}/view` }
  } catch (cdnErr) {
    console.error('[savePostToUserDrive] CDN fallback failed:', cdnErr)
    return { error: 'Failed to save to your Google Drive. Please try again.' }
  }
}
