import { createServiceClient } from '@/lib/supabase/server'
import { uploadToDrive } from '@/lib/drive/upload'

const ENSEMBLE_API_URL = process.env.ENSEMBLE_API_URL ?? 'https://ensembledata.com/apis'
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY!

/**
 * Re-fetch a fresh direct media URL from EnsembleData.
 * CDN links from the initial scrape can expire, so we re-query before downloading.
 */
async function fetchFreshMediaUrl(
  platform: string,
  platformPostId: string,
  postUrl: string
): Promise<string | null> {
  try {
    if (platform === 'tiktok') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/tt/post/info?url=${encodeURIComponent(postUrl)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return null
      const json = await res.json() as { data?: unknown }
      const item = (Array.isArray(json.data) ? json.data[0] : json.data) as Record<string, unknown> | undefined
      const video = item?.video as Record<string, unknown> | undefined
      const addrObj = (video?.download_addr ?? video?.play_addr_h264) as Record<string, unknown> | undefined
      const urlList = addrObj?.url_list as string[] | undefined
      return urlList?.[0] ?? null
    }

    if (platform === 'instagram') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/instagram/post/details?code=${encodeURIComponent(platformPostId)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return null
      const json = await res.json() as { data?: Record<string, unknown> }
      const data = json.data
      return (data?.video_url ?? data?.display_url) as string | null ?? null
    }

    // YouTube: no direct download
    return null
  } catch {
    return null
  }
}

export interface DownloadResult {
  driveFileId: string
  driveFolderPath: string
}

/**
 * Download a single post's media and upload it to Google Drive.
 * Uses memberDriveFolderId as the upload destination.
 * Throws on failure — caller is responsible for error handling.
 */
export async function processPostDownload(
  supabase: ReturnType<typeof createServiceClient>,
  postId: string,
  memberDriveFolderId?: string | null
): Promise<DownloadResult> {
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      `
      id,
      platform_post_id,
      platform,
      post_url,
      workspace_id,
      campaign:campaigns(name),
      influencer:influencers(ig_handle, tiktok_handle, youtube_handle),
      workspace:workspaces(name)
    `
    )
    .eq('id', postId)
    .single()

  if (postError || !post) {
    throw new Error(`Post not found: ${postId}`)
  }

  const campaign = post.campaign as unknown as { name: string } | null
  const influencer = post.influencer as unknown as { ig_handle: string | null; tiktok_handle: string | null; youtube_handle: string | null } | null
  const workspace = post.workspace as unknown as { name: string } | null

  // Resolve Drive folder: use member's personal folder, or look up workspace owner's folder
  let rootFolderId: string | undefined = memberDriveFolderId ?? undefined

  if (!rootFolderId) {
    const { data: ownerMember } = await supabase
      .from('workspace_members')
      .select('drive_folder_id')
      .eq('workspace_id', post.workspace_id)
      .eq('role', 'owner')
      .maybeSingle()

    rootFolderId = ownerMember?.drive_folder_id ?? undefined
  }

  const mediaUrl = await fetchFreshMediaUrl(post.platform, post.platform_post_id, post.post_url)
  if (!mediaUrl) {
    throw new Error(`Could not resolve media URL for ${post.platform} post ${post.platform_post_id}`)
  }

  const response = await fetch(mediaUrl)
  if (!response.ok) {
    throw new Error(`Media download failed: ${response.status}`)
  }

  const fileBuffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') ?? 'video/mp4'
  const ext = contentType.includes('image') ? 'jpg' : 'mp4'

  const handle =
    influencer?.ig_handle ??
    influencer?.tiktok_handle ??
    influencer?.youtube_handle ??
    'unknown'
  const folderPath = `${workspace?.name}/${campaign?.name}/${handle}/${post.platform}`

  const { fileId, folderPath: savedFolderPath } = await uploadToDrive({
    fileBuffer,
    fileName: `post-${post.id}.${ext}`,
    folderPath,
    rootFolderId,
  })

  await supabase
    .from('posts')
    .update({
      download_status: 'downloaded',
      drive_file_id: fileId,
      drive_folder_path: savedFolderPath,
      downloaded_at: new Date().toISOString(),
    })
    .eq('id', postId)

  return { driveFileId: fileId, driveFolderPath: savedFolderPath }
}
