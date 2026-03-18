import sgMail from '@sendgrid/mail'

/** Escape user-supplied strings before interpolating into email HTML. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send a transactional email via SendGrid.
 * Returns silently (logs only) if env vars are missing — safe in dev without SendGrid configured.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.warn('[email] SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not set — skipping email send')
    return
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
  })
}
