import { escapeHtml } from '../index'

interface SubscriptionReceiptOptions {
  userName: string
  planLabel: string
  billingLabel: string
  totalFormatted: string
  subscriptionRef: string
  billingSettingsUrl: string
}

export function subscriptionReceiptEmail({
  userName,
  planLabel,
  billingLabel,
  totalFormatted,
  subscriptionRef,
  billingSettingsUrl,
}: SubscriptionReceiptOptions): string {
  const name = escapeHtml(userName)
  const plan = escapeHtml(planLabel)
  const billing = escapeHtml(billingLabel)
  const total = escapeHtml(totalFormatted)
  const billingUrl = escapeHtml(billingSettingsUrl)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const preheader = `Your ${plan} subscription is now active — ${total}.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Payment confirmed — Instroom Post Tracker</title>
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

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F4;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

          <!-- Green accent bar -->
          <tr>
            <td style="background-color:#1FAE5B;height:4px;border-radius:10px 10px 0 0;line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border:0.5px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;padding:32px;">

              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:24px;border-bottom:0.5px solid #ebebeb;">
                    <img src="https://instroom-post-tracker.vercel.app/POST_TRACKER.png" alt="Instroom Post Tracker" width="150" style="display:block;border:0;outline:none;text-decoration:none;max-width:150px;height:auto;" />
                  </td>
                </tr>
              </table>

              <!-- Checkmark badge -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px;height:36px;background-color:#E6F8EE;border-radius:50%;text-align:center;vertical-align:middle;font-size:18px;">&#10003;</td>
                        <td style="padding-left:10px;vertical-align:middle;">
                          <span style="font-size:15px;font-weight:600;color:#1FAE5B;">Payment confirmed</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;line-height:1.3;">Your subscription is active</p>
                    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">Hi ${name}, thank you for subscribing to Instroom Post Tracker. Your account has been upgraded and is ready to use.</p>
                  </td>
                </tr>
              </table>

              <!-- Order summary box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                <tr>
                  <td style="background-color:#F7F7F7;border:0.5px solid #E2E2E2;border-radius:8px;padding:16px 18px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#888;letter-spacing:0.5px;text-transform:uppercase;">Order summary</p>

                    <!-- Plan row -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td style="font-size:12px;color:#555;">Plan</td>
                        <td style="font-size:12px;color:#111;font-weight:500;text-align:right;">${plan} &mdash; ${billing}</td>
                      </tr>
                    </table>

                    <!-- Amount row -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td style="font-size:12px;color:#555;">Amount charged</td>
                        <td style="font-size:14px;color:#111;font-weight:700;text-align:right;">${total}</td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0;">
                      <tr><td style="border-top:0.5px solid #E2E2E2;font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>

                    <!-- Ref + date -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:11px;color:#888;">Ref: ${subscriptionRef}</td>
                        <td style="font-size:11px;color:#888;text-align:right;">${today}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td>
                    <a href="${billingUrl}" target="_blank" style="display:block;background-color:#1FAE5B;color:#fff;text-align:center;border-radius:7px;padding:13px 20px;font-size:13px;font-weight:500;text-decoration:none;">View billing settings &rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- Footer note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">Your subscription renews automatically. You can manage, view invoices, or cancel from your billing settings.</p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="border-top:0.5px solid #f0f0f0;padding-top:14px;text-align:center;">
                    <p style="margin:0;font-size:10px;color:#bbb;line-height:1.6;">
                      You received this because you subscribed to Instroom Post Tracker.<br />
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

interface SubscriptionRenewalOptions {
  userName: string
  planLabel: string
  nextBillingDate: string
  billingSettingsUrl: string
}

export function subscriptionRenewalEmail({
  userName,
  planLabel,
  nextBillingDate,
  billingSettingsUrl,
}: SubscriptionRenewalOptions): string {
  const name = escapeHtml(userName)
  const plan = escapeHtml(planLabel)
  const nextDate = escapeHtml(nextBillingDate)
  const settingsUrl = escapeHtml(billingSettingsUrl)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const preheader = `Your ${plan} subscription has been renewed successfully.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Subscription renewed — Instroom Post Tracker</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
    body{margin:0;padding:0;width:100%!important;}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="display:none;font-size:1px;color:#F4F4F4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F4;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

          <tr>
            <td style="background-color:#1FAE5B;height:4px;border-radius:10px 10px 0 0;line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;border:0.5px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;padding:32px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:24px;border-bottom:0.5px solid #ebebeb;">
                    <img src="https://instroom-post-tracker.vercel.app/POST_TRACKER.png" alt="Instroom Post Tracker" width="150" style="display:block;border:0;outline:none;text-decoration:none;max-width:150px;height:auto;" />
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;line-height:1.3;">Subscription renewed</p>
                    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">Hi ${name}, your <strong style="color:#111;">${plan}</strong> subscription has been renewed successfully on ${today}.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="background-color:#F7F7F7;border:0.5px solid #E2E2E2;border-radius:8px;padding:14px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#555;">Next renewal</td>
                        <td style="font-size:12px;color:#111;font-weight:500;text-align:right;">${nextDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td>
                    <a href="${settingsUrl}" target="_blank" style="display:block;background-color:#1FAE5B;color:#fff;text-align:center;border-radius:7px;padding:13px 20px;font-size:13px;font-weight:500;text-decoration:none;">Manage billing &rarr;</a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="border-top:0.5px solid #f0f0f0;padding-top:14px;text-align:center;">
                    <p style="margin:0;font-size:10px;color:#bbb;line-height:1.6;">
                      You received this because you subscribed to Instroom Post Tracker.<br />
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

interface SubscriptionPaymentFailedOptions {
  userName: string
  planLabel: string
  updatePaymentUrl: string
}

export function subscriptionPaymentFailedEmail({
  userName,
  planLabel,
  updatePaymentUrl,
}: SubscriptionPaymentFailedOptions): string {
  const name = escapeHtml(userName)
  const plan = escapeHtml(planLabel)
  const payUrl = escapeHtml(updatePaymentUrl)
  const preheader = `Action required: your ${plan} payment failed. Please update your payment method.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Payment failed — Instroom Post Tracker</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
    body{margin:0;padding:0;width:100%!important;}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="display:none;font-size:1px;color:#F4F4F4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F4;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

          <!-- Red accent bar for urgency -->
          <tr>
            <td style="background-color:#E53E3E;height:4px;border-radius:10px 10px 0 0;line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;border:0.5px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;padding:32px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:24px;border-bottom:0.5px solid #ebebeb;">
                    <img src="https://instroom-post-tracker.vercel.app/POST_TRACKER.png" alt="Instroom Post Tracker" width="150" style="display:block;border:0;outline:none;text-decoration:none;max-width:150px;height:auto;" />
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111;line-height:1.3;">Payment failed</p>
                    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">Hi ${name}, we were unable to process your payment for the <strong style="color:#111;">${plan}</strong> subscription. Your access has been suspended until the payment is resolved.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="background-color:#FFF5F5;border:0.5px solid #FED7D7;border-radius:8px;padding:14px 18px;">
                    <p style="margin:0;font-size:12px;color:#C53030;line-height:1.6;">To restore access, please update your payment method. LemonSqueezy will automatically retry the charge once your card is updated.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td>
                    <a href="${payUrl}" target="_blank" style="display:block;background-color:#E53E3E;color:#fff;text-align:center;border-radius:7px;padding:13px 20px;font-size:13px;font-weight:500;text-decoration:none;">Update payment method &rarr;</a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="border-top:0.5px solid #f0f0f0;padding-top:14px;text-align:center;">
                    <p style="margin:0;font-size:10px;color:#bbb;line-height:1.6;">
                      You received this because you subscribed to Instroom Post Tracker.<br />
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
