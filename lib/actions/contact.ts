'use server'

import { contactInquirySchema } from '@/lib/validations'
import { sendEmail, escapeHtml } from '@/lib/email'
import { contactInquiryEmail } from '@/lib/email/templates/contact-inquiry'
import { checkActionLimit, getRequestIp, limiters } from '@/lib/rate-limit'

export async function submitContactInquiry(
  data: unknown
): Promise<{ error: string } | void> {
  const ip = await getRequestIp()
  const limited = await checkActionLimit(`contact:ip:${ip}`, limiters.contactInquiry)
  if (limited) return limited

  const parsed = contactInquirySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  if (!process.env.AGENCY_NOTIFICATION_EMAIL) return // soft-fail

  try {
    await sendEmail({
      to: process.env.AGENCY_NOTIFICATION_EMAIL,
      subject: `New contact inquiry: ${escapeHtml(parsed.data.name)} — ${escapeHtml(parsed.data.company)}`,
      html: contactInquiryEmail({
        name: parsed.data.name,
        company: parsed.data.company,
        email: parsed.data.email,
        message: parsed.data.message ?? undefined,
      }),
    })
  } catch (err) {
    console.error('[email] Failed to send contact inquiry email:', err)
  }
}
