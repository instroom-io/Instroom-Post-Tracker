import { createServiceClient } from '@/lib/supabase/server'
import { processPostDownload } from '@/lib/downloads/process-download'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

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
  try {
    await processPostDownload(supabase, job.post_id)

    await supabase
      .from('retry_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (job.attempts >= 3) {
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
