'use server'

import { contactInquirySchema } from '@/lib/validations'
import { sendEmail, escapeHtml } from '@/lib/email'

export async function submitContactInquiry(
  data: unknown
): Promise<{ error: string } | void> {
  const parsed = contactInquirySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  if (!process.env.AGENCY_NOTIFICATION_EMAIL) return // soft-fail

  try {
    await sendEmail({
      to: process.env.AGENCY_NOTIFICATION_EMAIL,
      subject: `New contact inquiry: ${escapeHtml(parsed.data.name)} — ${escapeHtml(parsed.data.company)}`,
      html: `
        <p>A new contact inquiry was submitted via the Instroom landing page.</p>
        <p><strong>Name:</strong> ${escapeHtml(parsed.data.name)}</p>
        <p><strong>Company:</strong> ${escapeHtml(parsed.data.company)}</p>
        <p><strong>Email:</strong> ${escapeHtml(parsed.data.email)}</p>
        ${parsed.data.message ? `<p><strong>Message:</strong> ${escapeHtml(parsed.data.message)}</p>` : ''}
      `,
    })
  } catch (err) {
    console.error('[email] Failed to send contact inquiry email:', err)
  }
}
