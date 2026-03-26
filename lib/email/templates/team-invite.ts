import { baseEmail, ctaButton, expiryNote } from './base'
import { escapeHtml } from '../index'

interface TeamInviteEmailOptions {
  workspaceName: string
  role: string
  inviteUrl: string
}

export function teamInviteEmail({ workspaceName, role, inviteUrl }: TeamInviteEmailOptions): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

  const body = `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#171717;letter-spacing:-0.5px;line-height:1.2;">
      You've been invited to join a workspace
    </h1>
    <p style="margin:0;font-size:15px;color:#525252;line-height:1.6;">
      You've been invited to join <strong style="color:#171717;">${escapeHtml(workspaceName)}</strong> on
      Instroom Post Tracker as a <strong style="color:#171717;">${escapeHtml(roleLabel)}</strong>.
    </p>

    <!-- Role badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="background-color:#E8F8EE;border-radius:6px;padding:10px 16px;">
          <span style="font-size:13px;font-weight:600;color:#177A40;">
            Role: ${escapeHtml(roleLabel)}
          </span>
          &nbsp;&nbsp;
          <span style="font-size:13px;color:#525252;">
            Workspace: ${escapeHtml(workspaceName)}
          </span>
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td style="border-top:1px solid #E8E8E8;"></td></tr>
    </table>

    <p style="margin:0;font-size:14px;color:#525252;line-height:1.6;">
      Click the button below to accept your invitation and access the workspace:
    </p>

    ${ctaButton('Accept invitation', inviteUrl)}

    ${expiryNote('This invitation link expires in 7 days.')}

    <p style="margin:32px 0 0;font-size:14px;color:#858585;">— The Instroom Team</p>
  `

  return baseEmail({
    body,
    preheader: `You've been invited to join ${workspaceName} on Instroom Post Tracker as ${roleLabel}.`,
  })
}
