import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadToDrive } from './drive/upload'

const ENSEMBLE_API_URL = process.env.ENSEMBLE_API_URL ?? 'https://ensembledata.com/apis'
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY!

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
      const addrObj = (video?.play_addr_h264 ?? video?.play_addr ?? video?.download_addr) as Record<string, unknown> | undefined
      const urlList = addrObj?.url_list as string[] | undefined
      return urlList?.[0] ?? null
    }

    if (platform === 'instagram') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/instagram/post/details?code=${encodeURIComponent(platformPostId)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return null
      // Use text() + manual parse to handle EnsembleData responses that contain
      // literal control characters (e.g. in captions), which cause res.json() to throw.
      const text = await res.text()
      const sanitized = text.replace(/[\x00-\x1F]/g, ' ')
      let json: { data?: Record<string, unknown> }
      try {
        json = JSON.parse(sanitized) as { data?: Record<string, unknown> }
      } catch {
        return null
      }
      const data = json.data
      return (data?.video_url ?? data?.display_url) as string | null ?? null
    }

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
 * Download a single post's media and upload it to the Shared Drive via service account.
 * Used by the automatic background download worker.
 * Throws on failure — caller is responsible for error handling.
 */
export async function processPostDownload(
  supabase: SupabaseClient,
  postId: string,
): Promise<DownloadResult> {
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      `
      id,
      platform_post_id,
      platform,
      post_url,
      media_url,
      workspace_id,
      campaign:campaigns(name),
      influencer:influencers(ig_handle, tiktok_handle, youtube_handle),
      workspace:workspaces(name, agency:agencies(drive_folder_id))
    `
    )
    .eq('id', postId)
    .single()

  if (postError || !post) {
    throw new Error(`Post not found: ${postId}`)
  }

  const campaign = post.campaign as unknown as { name: string } | null
  const influencer = post.influencer as unknown as { ig_handle: string | null; tiktok_handle: string | null; youtube_handle: string | null } | null
  const workspace = post.workspace as unknown as { name: string; agency: { drive_folder_id: string | null } | null } | null
  const storedMediaUrl = post.media_url as string | null

  // Use stored media URL first to avoid burning EnsembleData units.
  // Skip HEAD probe (CDN may block HEAD from cloud IPs) — attempt GET directly.
  // Fall back to a fresh EnsembleData fetch only if the stored URL is absent or the GET fails.
  let response: Response | null = null
  if (storedMediaUrl) {
    const r = await fetch(storedMediaUrl).catch(() => null)
    if (r?.ok) response = r
  }
  if (!response) {
    const freshUrl = await fetchFreshMediaUrl(post.platform, post.platform_post_id, post.post_url)
    if (!freshUrl) {
      throw new Error(`Could not resolve media URL for ${post.platform} post ${post.platform_post_id}`)
    }
    const r = await fetch(freshUrl).catch(() => null)
    if (!r?.ok) {
      throw new Error(`Media download failed: ${r?.status ?? 'network error'}`)
    }
    response = r
  }

  const fileBuffer = await (response as Response).arrayBuffer()
  const contentType = (response as Response).headers.get('content-type') ?? 'video/mp4'
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
    rootFolderId: workspace?.agency?.drive_folder_id ?? undefined,
    // Falls back to GOOGLE_DRIVE_ROOT_FOLDER_ID env var when agency has no folder set
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
