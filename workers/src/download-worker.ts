import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from './lib/supabase'
import { processPostDownload } from './lib/process-download'

async function processJob(
  supabase: SupabaseClient,
  job: { id: string; post_id: string; attempts: number }
) {
  try {
    await processPostDownload(supabase, job.post_id)

    const { error: doneError } = await supabase
      .from('retry_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', job.id)
    if (doneError) throw new Error(`Failed to mark job done: ${doneError.message}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[download-worker] Job ${job.id} failed (attempt ${job.attempts + 1}):`, err instanceof Error ? err.stack : err)

    if (job.attempts >= 5) {
      const { error: failPostError } = await supabase
        .from('posts')
        .update({ download_status: 'failed' })
        .eq('id', job.post_id)
      if (failPostError) console.error(`[download-worker] Failed to set post failed status: ${failPostError.message}`)

      const { error: failQueueError } = await supabase
        .from('retry_queue')
        .update({
          status: 'failed',
          error: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
      if (failQueueError) console.error(`[download-worker] Failed to mark job failed: ${failQueueError.message}`)
    } else {
      const scheduledAt = new Date(
        Date.now() + job.attempts * 60 * 60 * 1000
      ).toISOString()

      const { error: retryError } = await supabase
        .from('retry_queue')
        .update({
          status: 'pending',
          error: message,
          scheduled_at: scheduledAt,
        })
        .eq('id', job.id)
      if (retryError) console.error(`[download-worker] Failed to reschedule job: ${retryError.message}`)
    }

    throw err
  }
}

async function main() {
  const supabase = createServiceClient()

  const { data: jobs, error: claimError } = await supabase.rpc('claim_jobs', {
    p_job_type: 'download',
    p_limit: 10,
  })

  if (claimError) {
    console.error('[download-worker] Failed to claim jobs:', claimError)
    process.exit(1)
  }

  if (!jobs || jobs.length === 0) {
    console.log(JSON.stringify({ processed: 0 }))
    process.exit(0)
  }

  const results = await Promise.allSettled(
    jobs.map((job: { id: string; post_id: string; attempts: number }) =>
      processJob(supabase, job)
    )
  )

  const succeeded = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'fulfilled').length
  const failed = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'rejected').length

  console.log(JSON.stringify({ processed: jobs.length, succeeded, failed }))
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
