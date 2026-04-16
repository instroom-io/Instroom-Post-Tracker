import { escapeHtml } from '../index'

interface TeamInviteEmailOptions {
  workspaceName: string
  role: string
  inviteUrl: string
  inviterName: string
}

// Role → theme colours
function getTheme(role: string) {
  if (role === 'viewer') {
    return {
      accent: '#378ADD',
      btnBg: '#378ADD',
      boxBg: '#E6F1FB',
      boxBorder: '#B5D4F4',
      boxTitleColor: '#0C447C',
      checkYesBg: '#378ADD',
      checkNoBg: '#e0e0e0',
      checkNoColor: '#aaa',
      permYesColor: '#185FA5',
      permNoColor: '#aaa',
      senderRowBg: '#f0f6fd',
      roleColor: '#185FA5',
      label: 'Viewer',
    }
  }
  // admin, manager, editor — all green
  return {
    accent: '#1D9E75',
    btnBg: '#1D9E75',
    boxBg: '#E1F5EE',
    boxBorder: '#9FE1CB',
    boxTitleColor: '#085041',
    checkYesBg: '#1D9E75',
    checkNoBg: '#e0e0e0',
    checkNoColor: '#aaa',
    permYesColor: '#0F6E56',
    permNoColor: '#aaa',
    senderRowBg: '#f7f7f7',
    roleColor: '#0F6E56',
    label: role.charAt(0).toUpperCase() + role.slice(1),
  }
}

// Permission rows per role
function getPermissions(role: string, t: ReturnType<typeof getTheme>): string {
  const yes = (text: string) => `
    <tr>
      <td style="padding:0 0 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:16px;height:16px;background-color:${t.checkYesBg};border-radius:50%;text-align:center;vertical-align:middle;font-size:9px;color:#fff;font-weight:700;">&#10003;</td>
            <td style="padding-left:7px;font-size:12px;color:${t.permYesColor};">${text}</td>
          </tr>
        </table>
      </td>
    </tr>`

  const no = (text: string) => `
    <tr>
      <td style="padding:0 0 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:16px;height:16px;background-color:${t.checkNoBg};border-radius:50%;text-align:center;vertical-align:middle;font-size:9px;color:${t.checkNoColor};font-weight:700;">&#10005;</td>
            <td style="padding-left:7px;font-size:12px;color:${t.permNoColor};">${text}</td>
          </tr>
        </table>
      </td>
    </tr>`

  if (role === 'viewer') {
    return `
      ${yes('Browse tracked influencer posts')}
      ${yes('View campaign reports and analytics')}
      ${no('Create or edit campaigns (Manager only)')}
      ${no('Invite or manage members (Admin only)')}`
  }
  if (role === 'admin') {
    return `
      ${yes('Track and manage influencer posts')}
      ${yes('Create and manage campaigns')}
      ${yes('View workspace analytics')}
      ${yes('Invite and manage members')}`
  }
  // manager, editor
  return `
    ${yes('Track and manage influencer posts')}
    ${yes('Create and manage campaigns')}
    ${yes('View workspace analytics')}
    ${no('Invite or manage members (Admin only)')}`
}

function getBodyText(role: string, inviterName: string, workspaceName: string): string {
  const name = escapeHtml(inviterName)
  const ws = `<strong style="color:#111;">${escapeHtml(workspaceName)}</strong>`
  if (role === 'viewer') {
    return `${name} has shared the ${ws} workspace with you. As a Viewer, you'll be able to browse tracked posts and campaign reports.`
  }
  if (role === 'admin') {
    return `${name} added you as an Admin to the ${ws} workspace. You'll have full access to manage campaigns, track influencer posts, and manage team members.`
  }
  return `${name} added you as a ${escapeHtml(role.charAt(0).toUpperCase() + role.slice(1))} to the ${ws} workspace. You'll have full access to create and manage campaigns and track influencer posts.`
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
    || name.charAt(0).toUpperCase()
    || '?'
}

export function teamInviteEmail({
  workspaceName,
  role,
  inviteUrl,
  inviterName,
}: TeamInviteEmailOptions): string {
  const t = getTheme(role)
  const perms = getPermissions(role, t)
  const bodyText = getBodyText(role, inviterName, workspaceName)
  const inv = escapeHtml(inviterName)
  const ws = escapeHtml(workspaceName)
  const avi = initials(inviterName)
  const preheader = `${inv} invited you to join ${ws} on Instroom Post Tracker as ${t.label}.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>You're invited to ${ws} — Instroom Post Tracker</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
    body{margin:0;padding:0;width:100%!important;}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#F4F4F4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>

  <!-- Outer -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F4;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card wrapper -->
        <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

          <!-- Top accent bar -->
          <tr>
            <td style="background-color:${t.accent};height:4px;border-radius:10px 10px 0 0;line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background-color:#ffffff;border:0.5px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;padding:28px 32px;">

              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:22px;border-bottom:0.5px solid #ebebeb;">
                    <img src="https://instroom-post-tracker.vercel.app/POST_TRACKER.png" alt="Instroom Post Tracker" width="150" style="display:block;border:0;outline:none;text-decoration:none;max-width:150px;height:auto;" />
                  </td>
                </tr>
              </table>

              <!-- Sender row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                <tr>
                  <td style="background-color:${t.senderRowBg};border-radius:8px;padding:10px 14px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Initials avatar -->
                        <td style="width:34px;height:34px;background-color:${t.accent};border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:500;color:#fff;">${avi}</td>
                        <td style="padding-left:10px;vertical-align:middle;">
                          <div style="font-size:13px;font-weight:500;color:#1a1a1a;">${inv} <span style="font-weight:400;color:#888;">invited you to join</span> ${ws}</div>
                          <div style="font-size:11px;color:#888;margin-top:1px;">as <strong style="color:${t.roleColor};">${t.label}</strong> &middot; Instroom Post Tracker</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-size:18px;font-weight:600;color:#111;line-height:1.3;">You're invited to ${ws}</p>
                    <p style="margin:0 0 16px;font-size:13px;color:#444;line-height:1.65;">${bodyText}</p>
                  </td>
                </tr>
              </table>

              <!-- Permissions box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
                <tr>
                  <td style="background-color:${t.boxBg};border:0.5px solid ${t.boxBorder};border-radius:8px;padding:12px 14px;">
                    <p style="margin:0 0 7px;font-size:11px;font-weight:500;color:${t.boxTitleColor};">As a ${t.label}, you can:</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${perms}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <td>
                    <a href="${inviteUrl}" target="_blank" style="display:block;background-color:${t.btnBg};color:#fff;text-align:center;border-radius:7px;padding:12px 20px;font-size:13px;font-weight:500;text-decoration:none;">Accept invitation &rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- Expiry -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0;font-size:11px;color:#aaa;">This link expires in 7 days.</p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="border-top:0.5px solid #f0f0f0;padding-top:14px;text-align:center;">
                    <p style="margin:0;font-size:10px;color:#bbb;line-height:1.6;">
                      Not expecting this? You can safely ignore this email &mdash; nothing will change.<br />
                      Sent by Instroom Post Tracker &middot; &copy; ${new Date().getFullYear()} All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
}
