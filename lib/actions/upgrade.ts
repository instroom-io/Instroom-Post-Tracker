// lib/actions/upgrade.ts
'use server'

import { sendEmail, escapeHtml } from '@/lib/email'
import { checkActionLimit, getRequestIp, limiters } from '@/lib/rate-limit'
import { upgradeRequestSchema } from '@/lib/validations'
import type { UpgradeRequestInput } from '@/lib/validations'

export async function submitUpgradeRequest(
  data: UpgradeRequestInput
): Promise<{ error: string } | { success: true }> {
  const ip = await getRequestIp()
  const limited = await checkActionLimit(`upgrade:ip:${ip}`, limiters.signup)
  if (limited) return limited

  const parsed = upgradeRequestSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const notifyEmail = process.env.AGENCY_NOTIFICATION_EMAIL
  if (!notifyEmail) {
    console.warn('[upgrade] AGENCY_NOTIFICATION_EMAIL not set — skipping notification')
    return { success: true }
  }

  const { name, email, account_name, message } = parsed.data

  await sendEmail({
    to: notifyEmail,
    subject: `Upgrade request from ${escapeHtml(account_name)}`,
    html: `
      <p><strong>New upgrade request</strong></p>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Account:</strong> ${escapeHtml(account_name)}</p>
      ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ''}
    `,
  })

  return { success: true }
}
