import { baseEmail, ctaButton, expiryNote } from './base'
import { escapeHtml } from '../index'

interface BrandInviteEmailOptions {
  agencyName: string
  agencyLogoUrl?: string
  workspaceName: string
  inviteUrl: string
}

export function brandInviteEmail({ agencyName, agencyLogoUrl, workspaceName, inviteUrl }: BrandInviteEmailOptions): string {
  const agencyLogoBlock = agencyLogoUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td>
          <img src="${escapeHtml(agencyLogoUrl)}"
               width="56" height="56" alt="${escapeHtml(agencyName)}"
               style="display:block;width:56px;height:56px;border-radius:12px;border:1px solid #E8E8E8;object-fit:contain;padding:4px;background:#FFFFFF;" />
        </td>
      </tr>
    </table>
  ` : ''

  const body = `
    ${agencyLogoBlock}
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#171717;letter-spacing:-0.5px;line-height:1.2;">
      You've been invited to Instroom
    </h1>
    <p style="margin:0;font-size:15px;color:#525252;line-height:1.6;">
      <strong style="color:#171717;">${escapeHtml(agencyName)}</strong> has invited you to set up your brand profile for
      <strong style="color:#171717;">${escapeHtml(workspaceName)}</strong> on Instroom Post Tracker.
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#525252;line-height:1.6;">
      Instroom helps agencies track influencer content, manage usage rights, and measure campaign performance —
      all in one place.
    </p>

    <!-- Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td style="border-top:1px solid #E8E8E8;"></td></tr>
    </table>

    <p style="margin:0;font-size:14px;color:#525252;line-height:1.6;">
      Complete the short setup form to activate your brand workspace:
    </p>

    ${ctaButton('Complete your brand profile', inviteUrl)}

    ${expiryNote('This invitation link expires in 7 days.')}

    <p style="margin:32px 0 0;font-size:14px;color:#858585;">— The Instroom Team</p>
  `

  return baseEmail({
    body,
    preheader: `${agencyName} has invited you to set up your brand on Instroom Post Tracker.`,
  })
}
