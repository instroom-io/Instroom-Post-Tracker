// workers/src/trial-worker.ts
import { createServiceClient } from './lib/supabase'
import { sendEmail, escapeHtml, baseEmail, ctaButton, expiryNote } from './lib/email'

function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
}

function trialReminder7Html(accountName: string, upgradeUrl: string): string {
  return baseEmail({
    preheader: `Your Instroom trial for ${accountName} ends in 7 days — upgrade to keep full access.`,
    body: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#171717;letter-spacing:-0.5px;">Your trial ends in 7 days</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">Hi there,</p>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">Your Instroom free trial for <strong>${escapeHtml(accountName)}</strong> ends in <strong>7 days</strong>.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">You still have full access to:</p>
      <ul style="margin:0 0 12px;padding-left:20px;font-size:15px;color:#404040;line-height:1.8;">
        <li>Drive downloads</li>
        <li>EMV reporting</li>
        <li>Advanced analytics</li>
        <li>Team collaboration</li>
      </ul>
      <p style="margin:0 0 4px;font-size:15px;color:#404040;line-height:1.6;">Upgrade before your trial ends to keep these features.</p>
      ${ctaButton('View upgrade options', upgradeUrl)}
      ${expiryNote('This is your 7-day trial reminder.')}
    `,
  })
}

function trialReminder2Html(accountName: string, upgradeUrl: string): string {
  return baseEmail({
    preheader: `Only 2 days left in your Instroom trial for ${accountName} — upgrade now.`,
    body: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#171717;letter-spacing:-0.5px;">Only 2 days left in your trial</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">Hi there,</p>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">Just <strong>2 days left</strong> in your Instroom trial for <strong>${escapeHtml(accountName)}</strong>.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">After your trial ends, Drive downloads, EMV reporting, advanced analytics, and team invites will be locked.</p>
      <p style="margin:0 0 4px;font-size:15px;color:#404040;line-height:1.6;">Upgrade now to keep full access without interruption.</p>
      ${ctaButton('Upgrade now', upgradeUrl)}
      ${expiryNote('This is your 2-day trial reminder.')}
    `,
  })
}

function trialEndedHtml(accountName: string, upgradeUrl: string): string {
  return baseEmail({
    preheader: `Your Instroom trial for ${accountName} has ended — subscribe to restore full access.`,
    body: `
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#171717;letter-spacing:-0.5px;">Your trial has ended</h1>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">Hi there,</p>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">Your Instroom free trial for <strong>${escapeHtml(accountName)}</strong> has ended.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#404040;line-height:1.6;">Your account is now on the free plan. Core features (campaigns, influencers, post detection) remain active.</p>
      <p style="margin:0 0 4px;font-size:15px;color:#404040;line-height:1.6;">Subscribe to restore Drive downloads, EMV reporting, advanced analytics, and team collaboration.</p>
      ${ctaButton('View upgrade options', upgradeUrl)}
    `,
  })
}

const UPGRADE_URL = `${process.env.NEXT_PUBLIC_APP_URL}/account/upgrade`

async function processWorkspaces(
  supabase: ReturnType<typeof createServiceClient>
) {
  // Include plan='free' rows with unsent trial-ended notifications — pg_cron flips plan to
  // 'free' at 00:30 UTC before this worker runs, so we must catch recently-expired rows too.
  const { data: rows, error } = await supabase
    .from('workspaces')
    .select(`
      id,
      name,
      slug,
      plan,
      trial_ends_at,
      trial_reminder_7_sent_at,
      trial_reminder_12_sent_at,
      trial_ended_notified_at
    `)
    .or('plan.eq.trial,and(plan.eq.free,trial_ended_notified_at.is.null)')
    .not('trial_ends_at', 'is', null)

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
      const isActiveTrial = (row.plan as string) === 'trial'

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

      // Day 7 reminder — only while still on trial
      if (isActiveTrial && days <= 7 && !row.trial_reminder_7_sent_at) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Your Instroom trial ends in 7 days',
          html: trialReminder7Html(name, UPGRADE_URL),
        })
        const { error: e7 } = await supabase
          .from('workspaces')
          .update({ trial_reminder_7_sent_at: new Date().toISOString() })
          .eq('id', row.id)
        if (e7) throw new Error(`Failed to set trial_reminder_7_sent_at: ${e7.message}`)
        emailsSent++
        console.log(`[trial-worker] Day-7 reminder sent to ${ownerEmail} (workspace ${row.id})`)
      }

      // Day 2 reminder — only while still on trial
      if (isActiveTrial && days <= 2 && !row.trial_reminder_12_sent_at) {
        await sendEmail({
          to: ownerEmail,
          subject: '2 days left in your Instroom trial',
          html: trialReminder2Html(name, UPGRADE_URL),
        })
        const { error: e2 } = await supabase
          .from('workspaces')
          .update({ trial_reminder_12_sent_at: new Date().toISOString() })
          .eq('id', row.id)
        if (e2) throw new Error(`Failed to set trial_reminder_12_sent_at: ${e2.message}`)
        emailsSent++
        console.log(`[trial-worker] Day-2 reminder sent to ${ownerEmail} (workspace ${row.id})`)
      }

      // Trial ended — fires for both plan='trial' (days=0) and plan='free' (already expired)
      if (days === 0 && row.trial_ends_at && !row.trial_ended_notified_at) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Your Instroom trial has ended',
          html: trialEndedHtml(name, UPGRADE_URL),
        })
        const { error: eEnd } = await supabase
          .from('workspaces')
          .update({ trial_ended_notified_at: new Date().toISOString() })
          .eq('id', row.id)
        if (eEnd) throw new Error(`Failed to set trial_ended_notified_at: ${eEnd.message}`)
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

async function processAgencies(
  supabase: ReturnType<typeof createServiceClient>
) {
  const { data: rows, error } = await supabase
    .from('agencies')
    .select(`
      id,
      name,
      slug,
      plan,
      trial_ends_at,
      trial_reminder_7_sent_at,
      trial_reminder_2_sent_at,
      trial_ended_notified_at,
      owner_id
    `)
    .or('plan.eq.trial,and(plan.eq.free,trial_ended_notified_at.is.null)')
    .not('trial_ends_at', 'is', null)

  if (error) {
    console.error('[trial-worker] Failed to load agencies:', error)
    return { processed: 0, emailsSent: 0, errors: [error.message] }
  }

  if (!rows || rows.length === 0) return { processed: 0, emailsSent: 0, errors: [] }

  let emailsSent = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const days = trialDaysRemaining(row.trial_ends_at as string | null)
      const isActiveTrial = (row.plan as string) === 'trial'

      // Fetch owner email directly via owner_id
      const { data: ownerData } = await supabase
        .from('users')
        .select('email')
        .eq('id', row.owner_id as string)
        .single()
      const ownerEmail = ownerData?.email ?? null

      if (!ownerEmail) {
        errors.push(`[agency ${row.id}] No owner email found`)
        continue
      }

      const name = escapeHtml(row.name as string)

      // Day 7 reminder
      if (isActiveTrial && days <= 7 && !row.trial_reminder_7_sent_at) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Your Instroom trial ends in 7 days',
          html: trialReminder7Html(name, UPGRADE_URL),
        })
        const { error: e7 } = await supabase
          .from('agencies')
          .update({ trial_reminder_7_sent_at: new Date().toISOString() })
          .eq('id', row.id)
        if (e7) throw new Error(`Failed to set trial_reminder_7_sent_at: ${e7.message}`)
        emailsSent++
        console.log(`[trial-worker] Day-7 reminder sent to ${ownerEmail} (agency ${row.id})`)
      }

      // Day 2 reminder
      if (isActiveTrial && days <= 2 && !row.trial_reminder_2_sent_at) {
        await sendEmail({
          to: ownerEmail,
          subject: '2 days left in your Instroom trial',
          html: trialReminder2Html(name, UPGRADE_URL),
        })
        const { error: e2 } = await supabase
          .from('agencies')
          .update({ trial_reminder_2_sent_at: new Date().toISOString() })
          .eq('id', row.id)
        if (e2) throw new Error(`Failed to set trial_reminder_2_sent_at: ${e2.message}`)
        emailsSent++
        console.log(`[trial-worker] Day-2 reminder sent to ${ownerEmail} (agency ${row.id})`)
      }

      // Trial ended
      if (days === 0 && row.trial_ends_at && !row.trial_ended_notified_at) {
        await sendEmail({
          to: ownerEmail,
          subject: 'Your Instroom trial has ended',
          html: trialEndedHtml(name, UPGRADE_URL),
        })
        const { error: eEnd } = await supabase
          .from('agencies')
          .update({ trial_ended_notified_at: new Date().toISOString() })
          .eq('id', row.id)
        if (eEnd) throw new Error(`Failed to set trial_ended_notified_at: ${eEnd.message}`)
        emailsSent++
        console.log(`[trial-worker] Trial-ended email sent to ${ownerEmail} (agency ${row.id})`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`[agency ${row.id}] ${msg}`)
    }
  }

  return { processed: rows.length, emailsSent, errors }
}

async function main() {
  const supabase = createServiceClient()
  const [workspaceResult, agencyResult] = await Promise.all([
    processWorkspaces(supabase),
    processAgencies(supabase),
  ])

  const processed = workspaceResult.processed + agencyResult.processed
  const emailsSent = workspaceResult.emailsSent + agencyResult.emailsSent
  const errors = [...workspaceResult.errors, ...agencyResult.errors]

  console.log(JSON.stringify({
    processed,
    emailsSent,
    ...(errors.length > 0 && { errors }),
  }))

  process.exit(errors.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
