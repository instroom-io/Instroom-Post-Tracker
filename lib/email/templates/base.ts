/**
 * Base email layout — shared by all transactional emails.
 * Uses hardcoded hex values from the Instroom design system
 * (CSS variables don't work in email clients).
 */

interface BaseEmailOptions {
  body: string
  preheader?: string
}

export function baseEmail({ body, preheader = '' }: BaseEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Instroom Post Tracker</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; }
    a { color: #1FAE5B; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  ${preheader ? `<div style="display:none;font-size:1px;color:#F4F4F4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F4;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0">

          <!-- Green accent bar -->
          <tr>
            <td style="background-color:#1FAE5B;height:6px;border-radius:12px 12px 0 0;"></td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background-color:#FFFFFF;border:1px solid #E8E8E8;border-top:none;border-radius:0 0 12px 12px;padding:40px 48px;">

              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:28px;border-bottom:1px solid #F0F0F0;">
                    <img src="${process.env.NEXT_PUBLIC_APP_URL}/POST_TRACKER.png" alt="Instroom Post Tracker" width="160" style="display:block;border:0;outline:none;text-decoration:none;max-width:160px;height:auto;" />
                  </td>
                </tr>
              </table>

              <!-- Injected body content -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-top:28px;">
                    ${body}
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-top:40px;border-top:1px solid #F0F0F0;margin-top:40px;">
                    <p style="margin:0;font-size:12px;color:#B8B8B8;line-height:1.6;">
                      You received this email because you're associated with an Instroom account.
                      If you did not expect this email, you can safely ignore it.
                    </p>
                    <p style="margin:8px 0 0;font-size:12px;color:#B8B8B8;">
                      &copy; ${new Date().getFullYear()} Instroom Post Tracker. All rights reserved.
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

/** Reusable green CTA button */
export function ctaButton(label: string, url: string): string {
  return `<a href="${url}" target="_blank" style="display:inline-block;background-color:#1FAE5B;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;margin-top:24px;letter-spacing:-0.1px;">${label} &rarr;</a>`
}

/** Muted expiry / disclaimer line */
export function expiryNote(text: string): string {
  return `<p style="margin:16px 0 0;font-size:12px;color:#858585;">${text}</p>`
}
