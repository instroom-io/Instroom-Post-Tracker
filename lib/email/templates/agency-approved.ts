import { baseEmail, ctaButton } from './base'
import { escapeHtml } from '../index'

interface AgencyApprovedEmailOptions {
  contactName: string
  agencyName: string
  signupUrl: string
}

export function agencyApprovedEmail({ contactName, agencyName, signupUrl }: AgencyApprovedEmailOptions): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#171717;letter-spacing:-0.5px;line-height:1.2;">
      Your agency has been approved
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#525252;line-height:1.6;">
      Hi ${escapeHtml(contactName)},
    </p>
    <p style="margin:0;font-size:15px;color:#525252;line-height:1.6;">
      Great news — <strong style="color:#171717;">${escapeHtml(agencyName)}</strong> has been approved on Instroom Post Tracker.
      Your agency account is ready and you can now access your dashboard.
    </p>

    <!-- What you can do -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td style="background-color:#F4F4F4;border-radius:8px;padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#858585;letter-spacing:0.5px;text-transform:uppercase;">What you can do</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#525252;">
                <span style="color:#1FAE5B;margin-right:8px;">&#10003;</span> Invite brands and set up their workspaces
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#525252;">
                <span style="color:#1FAE5B;margin-right:8px;">&#10003;</span> Track influencer posts across TikTok and Instagram
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#525252;">
                <span style="color:#1FAE5B;margin-right:8px;">&#10003;</span> Manage usage rights and download content to Drive
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#525252;">
                <span style="color:#1FAE5B;margin-right:8px;">&#10003;</span> View analytics, EMV, and performance metrics
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:14px;color:#525252;line-height:1.6;">
      Sign up (or log in) using this email address to get started:
    </p>

    ${ctaButton('Access your dashboard', signupUrl)}

    <p style="margin:32px 0 0;font-size:14px;color:#858585;">— The Instroom Team</p>
  `

  return baseEmail({
    body,
    preheader: `${agencyName} has been approved on Instroom Post Tracker. Access your dashboard now.`,
  })
}
