// workers/src/trial-worker.ts
import { createServiceClient } from './lib/supabase'
import { sendEmail, escapeHtml } from './lib/email'

function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
}

function trialReminder7Html(accountName: string): string {
  return `
    <p>Hi there,</p>
    <p>Your Instroom free trial for <strong>${escapeHtml(accountName)}</strong> ends in <strong>7 days</strong>.</p>
    <p>You still have full access to Drive downloads, EMV reporting, advanced analytics, and team collaboration.</p>
    <p>Upgrade before your trial ends to keep these features:</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="color:#16a34a;">View upgrade options →</a></p>
    <p style="color:#888;font-size:12px;">This is your 7-day trial reminder.</p>
  `
}

function trialReminder2Html(accountName: string): string {
  return `
    <p>Hi there,</p>
    <p>Just 2 days left in your Instroom trial for <strong>${escapeHtml(accountName)}</strong>.</p>
    <p>After your trial ends, Drive downloads, EMV reporting, advanced analytics, and team invites will be locked.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="color:#16a34a;">Upgrade now to keep full access →</a></p>
    <p style="color:#888;font-size:12px;">This is your 2-day trial reminder.</p>
  `
}

function trialEndedHtml(accountName: string): string {
  return `
    <p>Hi there,</p>
    <p>Your Instroom free trial for <strong>${escapeHtml(accountName)}</strong> has ended.</p>
    <p>Your account is now on the free plan. Core features (campaigns, influencers, post detection) remain active.</p>
    <p>Upgrade to restore Drive downloads, EMV reporting, advanced analytics, and team collaboration:</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="color:#16a34a;">View upgrade options →</a></p>
  `
}

async function processWorkspaces(
  supabase: ReturnType<typeof createServiceClient>
) {
  const { data: rows, error } = await supabase
    .from('workspaces')
    .select(`
      id,
      name,
      plan,
      trial_ends_at,
      trial_reminder_7_sent_at,
      trial_reminder_12_sent_at,
      trial_ended_notified_at
    `)
    .eq('plan', 'trial')

  if (error) {
    console.error('[trial-worker] Failed to load workspaces:', error)
    return { processed: 0, emailsSent: 0, errors: [error.message] }
  }

  if (!rows || rows.length === 0) return { processed: 0, emailsSent: 0, errors: [] }

  let emailsSent = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const days = trialDaysRemaining(row.trial_ends_at as string | null)

      // Fetch owner email
      const { data: member } = await supabase
        .from('workspace_members')
        .select('user_id, users!workspace_members_user_id_fkey(email)')
        .eq('workspace_id', row.id as string)
        .eq('role', 'owner')
        .single()
      const ownerEmail = (member?.users as unknown as { email: string } | null)?.email ?? null

      if (!ownerEmail) {
        errors.push(`[workspace ${row.id}] No owner email found`)
        continue
      }

      const name = escapeHtml(row.name as string)

      // Day 7 reminder
      if (days <= 7 && !row.trial_reminder_7_sent_at) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Your Instroom trial ends in 7 days',
          html: trialReminder7Html(name),
        })
        await supabase
          .from('workspaces')
          .update({ trial_reminder_7_sent_at: new Date().toISOString() })
          .eq('id', row.id)
        emailsSent++
        console.log(`[trial-worker] Day-7 reminder sent to ${ownerEmail} (workspace ${row.id})`)
      }

      // Day 2 reminder
      if (days <= 2 && !row.trial_reminder_12_sent_at) {
        await sendEmail({
          to: ownerEmail,
          subject: '2 days left in your Instroom trial',
          html: trialReminder2Html(name),
        })
        await supabase
          .from('workspaces')
          .update({ trial_reminder_12_sent_at: new Date().toISOString() })
          .eq('id', row.id)
        emailsSent++
        console.log(`[trial-worker] Day-2 reminder sent to ${ownerEmail} (workspace ${row.id})`)
      }

      // Trial ended notification
      if (days === 0 && row.trial_ends_at && !row.trial_ended_notified_at) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Your Instroom trial has ended',
          html: trialEndedHtml(name),
        })
        await supabase
          .from('workspaces')
          .update({ trial_ended_notified_at: new Date().toISOString() })
          .eq('id', row.id)
        emailsSent++
        console.log(`[trial-worker] Trial-ended email sent to ${ownerEmail} (workspace ${row.id})`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`[workspace ${row.id}] ${msg}`)
    }
  }

  return { processed: rows.length, emailsSent, errors }
}

async function main() {
  const supabase = createServiceClient()
  const result = await processWorkspaces(supabase)

  console.log(JSON.stringify({
    processed: result.processed,
    emailsSent: result.emailsSent,
    ...(result.errors.length > 0 && { errors: result.errors }),
  }))

  process.exit(result.errors.length > 0 && result.processed === 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
