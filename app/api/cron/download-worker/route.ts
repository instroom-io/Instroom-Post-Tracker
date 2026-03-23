import { createServiceClient } from '@/lib/supabase/server'
import { uploadToDrive } from '@/lib/drive/upload'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 800

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
      // /tt/post/info returns data as array — take first element
      const item = (Array.isArray(json.data) ? json.data[0] : json.data) as Record<string, unknown> | undefined
      const video = item?.video as Record<string, unknown> | undefined
      // download_addr and play_addr_h264 are objects with url_list arrays, not direct strings
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
      // Prefer video URL for reels/videos; fall back to image display URL
      return (data?.video_url ?? data?.display_url) as string | null ?? null
    }

    // YouTube: no direct download — return null (post will fail gracefully)
    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()

  // Claim up to 10 pending download jobs atomically
  const { data: jobs, error: claimError } = await supabase.rpc('claim_jobs', {
    p_job_type: 'download',
    p_limit: 10,
  })

  if (claimError) {
    console.error('[download-worker] Failed to claim jobs:', claimError)
    return NextResponse.json({ error: claimError.message }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const results = await Promise.allSettled(
    jobs.map((job: { id: string; post_id: string; attempts: number }) =>
      processJob(supabase, job)
    )
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ processed: jobs.length, succeeded, failed })
}

async function processJob(
  supabase: ReturnType<typeof createServiceClient>,
  job: { id: string; post_id: string; attempts: number }
) {
  // Load post context
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      `
      id,
      platform_post_id,
      platform,
      post_url,
      campaign:campaigns(name),
      influencer:influencers(ig_handle, tiktok_handle, youtube_handle),
      workspace:workspaces(name, drive_folder_id)
    `
    )
    .eq('id', job.post_id)
    .single()

  if (postError || !post) {
    throw new Error(`Post not found: ${job.post_id}`)
  }

  const campaign = post.campaign as unknown as { name: string } | null
  const influencer = post.influencer as unknown as { ig_handle: string | null; tiktok_handle: string | null; youtube_handle: string | null } | null
  const workspace = post.workspace as unknown as { name: string; drive_folder_id: string | null } | null
  const campaignName = campaign?.name
  const workspaceName = workspace?.name

  try {
    // Re-fetch a fresh media URL from EnsembleData (CDN links can expire between retries)
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

    // Build Drive folder path
    const handle =
      influencer?.ig_handle ??
      influencer?.tiktok_handle ??
      influencer?.youtube_handle ??
      'unknown'
    const folderPath = `${workspaceName}/${campaignName}/${handle}/${post.platform}`

    // Upload to Google Drive — use workspace-specific folder if set, else global root
    const { fileId, folderPath: savedFolderPath } = await uploadToDrive({
      fileBuffer,
      fileName: `post-${post.id}.${ext}`,
      folderPath,
      rootFolderId: workspace?.drive_folder_id ?? undefined,
    })

    // Update post on success
    await supabase
      .from('posts')
      .update({
        download_status: 'downloaded',
        drive_file_id: fileId,
        drive_folder_path: savedFolderPath,
        downloaded_at: new Date().toISOString(),
      })
      .eq('id', job.post_id)

    await supabase
      .from('retry_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (job.attempts >= 3) {
      // Permanently failed
      await supabase
        .from('posts')
        .update({ download_status: 'failed' })
        .eq('id', job.post_id)

      await supabase
        .from('retry_queue')
        .update({
          status: 'failed',
          error: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    } else {
      // Reschedule with backoff
      const scheduledAt = new Date(
        Date.now() + job.attempts * 15 * 60 * 1000
      ).toISOString()

      await supabase
        .from('retry_queue')
        .update({
          status: 'pending',
          error: message,
          scheduled_at: scheduledAt,
        })
        .eq('id', job.id)
    }

    throw err
  }
}
