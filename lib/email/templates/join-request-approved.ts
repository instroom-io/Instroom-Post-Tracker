import { baseEmail, ctaButton } from './base'
import { escapeHtml } from '../index'

interface JoinRequestApprovedEmailOptions {
  workspaceName: string
  workspaceUrl: string
}

export function joinRequestApprovedEmail({
  workspaceName,
  workspaceUrl,
}: JoinRequestApprovedEmailOptions): string {
  const ws = escapeHtml(workspaceName)

  const body = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;line-height:1.3;">
      You're in! Welcome to <span style="color:#1FAE5B;">${ws}</span>
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
      Your request to join the <strong style="color:#111;">${ws}</strong> workspace has been approved.
      You've been added as a <strong style="color:#111;">Manager</strong>.
    </p>
    <div style="background-color:#F0FBF5;border:1px solid #9FE1CB;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#085041;">As a Manager you can</p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#0F6E56;line-height:1.8;">
        <li>Create and manage campaigns</li>
        <li>Track and manage influencer posts</li>
        <li>View workspace analytics</li>
      </ul>
    </div>
    ${ctaButton('Open workspace', workspaceUrl)}
  `

  return baseEmail({
    body,
    preheader: `Your request to join ${workspaceName} on Instroom Post Tracker has been approved.`,
  })
}
