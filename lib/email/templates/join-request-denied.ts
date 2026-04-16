import { baseEmail } from './base'
import { escapeHtml } from '../index'

interface JoinRequestDeniedEmailOptions {
  workspaceName: string
}

export function joinRequestDeniedEmail({ workspaceName }: JoinRequestDeniedEmailOptions): string {
  const ws = escapeHtml(workspaceName)

  const body = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;line-height:1.3;">
      Your request to join <span style="color:#111;">${ws}</span>
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
      Your request to join the <strong style="color:#111;">${ws}</strong> workspace was not approved
      by the workspace Admin.
    </p>
    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
      If you believe this was a mistake, contact the workspace Admin directly.
    </p>
  `

  return baseEmail({
    body,
    preheader: `Your request to join ${workspaceName} on Instroom Post Tracker was not approved.`,
  })
}
