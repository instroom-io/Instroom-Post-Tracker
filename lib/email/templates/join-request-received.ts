import { baseEmail, ctaButton } from './base'
import { escapeHtml } from '../index'

interface JoinRequestReceivedEmailOptions {
  workspaceName: string
  workspaceSlug: string
  requesterName: string
  requesterEmail: string
  settingsUrl: string
}

export function joinRequestReceivedEmail({
  workspaceName,
  requesterName,
  requesterEmail,
  settingsUrl,
}: JoinRequestReceivedEmailOptions): string {
  const ws = escapeHtml(workspaceName)
  const name = escapeHtml(requesterName)
  const email = escapeHtml(requesterEmail)

  const body = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;line-height:1.3;">
      New access request for <span style="color:#1FAE5B;">${ws}</span>
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
      <strong style="color:#111;">${name}</strong>
      <span style="color:#888;"> (${email})</span>
      has requested to join the <strong style="color:#111;">${ws}</strong> workspace.
    </p>
    <div style="background-color:#F8F8F8;border:1px solid #EBEBEB;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#888;">Requester</p>
      <p style="margin:0;font-size:14px;font-weight:500;color:#111;">${name}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#555;">${email}</p>
    </div>
    <p style="margin:20px 0 4px;font-size:13px;color:#555;line-height:1.6;">
      Review this request in <strong>Settings → Members</strong> to approve or deny.
    </p>
    ${ctaButton('Review request', settingsUrl)}
    <p style="margin:16px 0 0;font-size:12px;color:#858585;">
      If you don't recognise this person, you can safely deny the request.
    </p>
  `

  return baseEmail({
    body,
    preheader: `${name} requested access to ${workspaceName} on Instroom Post Tracker.`,
  })
}
