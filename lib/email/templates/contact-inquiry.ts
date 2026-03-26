import { baseEmail } from './base'
import { escapeHtml } from '../index'

interface ContactInquiryEmailOptions {
  name: string
  company: string
  email: string
  message?: string
}

export function contactInquiryEmail({ name, company, email, message }: ContactInquiryEmailOptions): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#171717;letter-spacing:-0.3px;">
      New contact inquiry
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#858585;">
      Submitted via the Instroom landing page
    </p>

    <!-- Data rows -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #E8E8E8;border-radius:8px;overflow:hidden;">

      <tr style="border-bottom:1px solid #E8E8E8;">
        <td style="padding:14px 20px;width:110px;font-size:12px;font-weight:600;color:#858585;text-transform:uppercase;letter-spacing:0.4px;background-color:#F9F9F9;border-right:1px solid #E8E8E8;">
          Name
        </td>
        <td style="padding:14px 20px;font-size:14px;color:#171717;">
          ${escapeHtml(name)}
        </td>
      </tr>

      <tr style="border-bottom:1px solid #E8E8E8;">
        <td style="padding:14px 20px;font-size:12px;font-weight:600;color:#858585;text-transform:uppercase;letter-spacing:0.4px;background-color:#F9F9F9;border-right:1px solid #E8E8E8;">
          Company
        </td>
        <td style="padding:14px 20px;font-size:14px;color:#171717;">
          ${escapeHtml(company)}
        </td>
      </tr>

      <tr ${message ? 'style="border-bottom:1px solid #E8E8E8;"' : ''}>
        <td style="padding:14px 20px;font-size:12px;font-weight:600;color:#858585;text-transform:uppercase;letter-spacing:0.4px;background-color:#F9F9F9;border-right:1px solid #E8E8E8;">
          Email
        </td>
        <td style="padding:14px 20px;font-size:14px;color:#171717;">
          <a href="mailto:${escapeHtml(email)}" style="color:#1FAE5B;text-decoration:none;">${escapeHtml(email)}</a>
        </td>
      </tr>

      ${message ? `
      <tr>
        <td style="padding:14px 20px;font-size:12px;font-weight:600;color:#858585;text-transform:uppercase;letter-spacing:0.4px;background-color:#F9F9F9;border-right:1px solid #E8E8E8;vertical-align:top;">
          Message
        </td>
        <td style="padding:14px 20px;font-size:14px;color:#525252;line-height:1.6;">
          ${escapeHtml(message)}
        </td>
      </tr>
      ` : ''}

    </table>
  `

  return baseEmail({
    body,
    preheader: `New inquiry from ${name} at ${company}`,
  })
}
