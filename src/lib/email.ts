import { Resend } from 'resend'
import type { Tier } from './licensing/schema'

const FROM = 'Codegen <noreply@codexx-dtdk.com>'
const SITE = 'https://www.codexx-dtdk.com'

function resend() {
  return new Resend(process.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY)
}

export async function sendActivationEmail(params: {
  to: string
  key: string
  tier: Tier
  trialEnd?: string | null
}): Promise<void> {
  const { to, key, tier, trialEnd } = params
  const tierLabel = tier === 'team' ? 'Team' : tier === 'professional' ? 'Professional' : 'Community'
  const machinesNote = tier === 'community' ? 'unlimited machines' : 'up to 5 machines'
  const activateUrl = `${SITE}/activate?key=${encodeURIComponent(key)}`
  const cmd = `codegen license activate ${key}`

  // Trial-aware copy. trialEnd is an ISO-8601 string from Polar; render it as
  // a plain calendar date in the user's locale-agnostic format (YYYY-MM-DD).
  const trialDate = trialEnd ? trialEnd.slice(0, 10) : null
  const trialBanner = trialDate
    ? `<div style="background:#0d0d0d;border:1px solid #2a2a2a;border-left:3px solid #a8e6cf;border-radius:6px;padding:12px 16px;margin:0 0 24px;font-size:13px;line-height:1.55;color:#cfd6cf">
        <strong style="color:#a8e6cf">Your free trial has started.</strong> Full ${tierLabel} access through <strong style="color:#fff">${trialDate}</strong>. Your card is charged when the trial ends; cancel anytime before then for no charge.
      </div>`
    : ''
  const headline = trialDate ? 'Your trial is ready' : 'Your license is ready'
  const subject = trialDate
    ? `Your Codegen ${tierLabel} trial has started`
    : `Your Codegen ${tierLabel} license key`

  // Note: HTML email cannot run JS, so true click-to-copy buttons don't work
  // cross-client. Instead the CTA links to /activate?key=… on the website
  // where real copy buttons function. Code blocks remain easy to long-press
  // / tap-and-hold on mobile to select + copy.
  const { error } = await resend().emails.send({
    from: FROM,
    to,
    subject,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Your ${tierLabel} license key</title>
  <style>
    /* Reset for popular clients */
    body,table,td,a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table,td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }

    /* Mobile */
    @media only screen and (max-width:600px) {
      .container { width:100% !important; max-width:100% !important; border-radius:0 !important; border-left:none !important; border-right:none !important; }
      .px { padding-left:20px !important; padding-right:20px !important; }
      .py { padding-top:24px !important; padding-bottom:24px !important; }
      .h1 { font-size:20px !important; }
      .key-block { font-size:13px !important; padding:14px !important; }
      .cmd-block { font-size:12px !important; padding:12px !important; }
      .cta { display:block !important; width:100% !important; box-sizing:border-box !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#e0e0e0">
  <!-- preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
    ${trialDate ? `Your ${tierLabel} trial has started — full access through ${trialDate}.` : `Your ${tierLabel} license key is ready. Activate on ${machinesNote}.`}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden">

        <!-- header -->
        <tr><td class="px py" style="background:#111;padding:22px 32px;border-bottom:1px solid #2a2a2a">
          <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#fff">codegen</span>
          <span style="margin-left:8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em">${tierLabel}</span>
        </td></tr>

        <!-- body -->
        <tr><td class="px py" style="padding:32px">
          <h1 class="h1" style="margin:0 0 6px;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em">${headline}</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#999">
            Tap and hold the key below to copy on mobile, or use the activate button to open it on the website with one-click copy.
          </p>

          ${trialBanner}

          <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em">License key</p>
          <div class="key-block" style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:16px 20px;margin-bottom:20px;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:13px;line-height:1.5;color:#a8e6cf;word-break:break-all;-webkit-user-select:all;user-select:all">${key}</div>

          <!-- CTA: link to /activate?key=… where copy actually works -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr><td>
              <a href="${activateUrl}" class="cta" style="display:inline-block;background:#a8e6cf;color:#0f0f0f;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;letter-spacing:-0.01em">
                Activate &amp; copy on web →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em">Or run on each machine</p>
          <div class="cmd-block" style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:14px 18px;margin-bottom:24px;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:13px;color:#89b4fa;word-break:break-all;-webkit-user-select:all;user-select:all">${cmd}</div>

          <p style="margin:0;font-size:13px;line-height:1.6;color:#888">
            You can activate on ${machinesNote}.
            Check status anytime with <code style="color:#89b4fa;background:#0d0d0d;padding:2px 6px;border-radius:4px;font-size:12px">codegen license check</code>.
          </p>
        </td></tr>

        <!-- footer -->
        <tr><td class="px" style="padding:18px 32px;border-top:1px solid #2a2a2a;background:#111">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#666">
            Questions? Reply to this email or visit
            <a href="${SITE}" style="color:#999;text-decoration:none">codexx-dtdk.com</a>.<br>
            This key is tied to your account — do not share it publicly.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })

  if (error) throw new Error(`Resend: ${error.message}`)
}

export async function sendPortalLinkEmail(params: {
  to: string
  url: string
  expiresAt?: string
}): Promise<void> {
  const { to, url, expiresAt } = params

  // Best-effort human-readable expiry; falls back to a generic note.
  let expiryNote = 'This link expires shortly for security.'
  if (expiresAt) {
    const ms = Date.parse(expiresAt) - Date.now()
    if (Number.isFinite(ms) && ms > 0) {
      const hours = Math.round(ms / 3_600_000)
      expiryNote =
        hours <= 1
          ? 'This link expires in about an hour.'
          : `This link expires in about ${hours} hours.`
    }
  }

  const { error } = await resend().emails.send({
    from: FROM,
    to,
    subject: 'Your Codegen subscription portal link',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Your subscription portal link</title>
  <style>
    body,table,td,a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table,td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; max-width:100% !important; border-radius:0 !important; border-left:none !important; border-right:none !important; }
      .px { padding-left:20px !important; padding-right:20px !important; }
      .py { padding-top:24px !important; padding-bottom:24px !important; }
      .h1 { font-size:20px !important; }
      .url-block { font-size:12px !important; padding:12px !important; }
      .cta { display:block !important; width:100% !important; box-sizing:border-box !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#e0e0e0">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
    Manage your Codegen subscription — open the portal link below.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden">

        <tr><td class="px py" style="background:#111;padding:22px 32px;border-bottom:1px solid #2a2a2a">
          <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#fff">codegen</span>
          <span style="margin-left:8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em">Subscription portal</span>
        </td></tr>

        <tr><td class="px py" style="padding:32px">
          <h1 class="h1" style="margin:0 0 6px;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em">Manage your subscription</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#999">
            Use the button below to open your customer portal. From there you can update billing details, change plans, or cancel.
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr><td>
              <a href="${url}" class="cta" style="display:inline-block;background:#a8e6cf;color:#0f0f0f;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;letter-spacing:-0.01em">
                Open subscription portal →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em">Or paste this URL</p>
          <div class="url-block" style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:14px 18px;margin-bottom:24px;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:12px;line-height:1.5;color:#89b4fa;word-break:break-all;-webkit-user-select:all;user-select:all">${url}</div>

          <p style="margin:0;font-size:13px;line-height:1.6;color:#888">
            ${expiryNote} If you didn't request this, you can safely ignore the email.
          </p>
        </td></tr>

        <tr><td class="px" style="padding:18px 32px;border-top:1px solid #2a2a2a;background:#111">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#666">
            Questions? Reply to this email or visit
            <a href="${SITE}" style="color:#999;text-decoration:none">codexx-dtdk.com</a>.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })

  if (error) throw new Error(`Resend: ${error.message}`)
}
