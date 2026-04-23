import { Resend } from 'resend'
import type { Tier } from './licensing/schema'

const FROM = 'Codegen <noreply@codexx-dtdk.com>'

function resend() {
  return new Resend(import.meta.env.RESEND_API_KEY)
}

export async function sendActivationEmail(params: {
  to: string
  key: string
  tier: Tier
}): Promise<void> {
  const { to, key, tier } = params
  const tierLabel = tier === 'team' ? 'Team' : tier === 'professional' ? 'Professional' : 'Community'

  const { error } = await resend().emails.send({
    from: FROM,
    to,
    subject: `Your Codegen ${tierLabel} license key`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',system-ui,sans-serif;color:#e0e0e0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden">

        <!-- header -->
        <tr><td style="background:#111;padding:24px 32px;border-bottom:1px solid #2a2a2a">
          <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#fff">codegen</span>
          <span style="margin-left:8px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.08em">${tierLabel}</span>
        </td></tr>

        <!-- body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:15px;color:#999">Your license key</p>
          <div style="background:#111;border:1px solid #2a2a2a;border-radius:6px;padding:16px 20px;margin-bottom:24px">
            <code style="font-family:'Courier New',monospace;font-size:15px;letter-spacing:0.04em;color:#a8e6cf;word-break:break-all">${key}</code>
          </div>

          <p style="margin:0 0 16px;font-size:14px;color:#999;line-height:1.6">
            Run this command to activate codegen on your machine:
          </p>
          <div style="background:#111;border:1px solid #2a2a2a;border-radius:6px;padding:14px 20px;margin-bottom:28px">
            <code style="font-family:'Courier New',monospace;font-size:13px;color:#89b4fa">codegen license activate ${key}</code>
          </div>

          <p style="margin:0 0 8px;font-size:13px;color:#666;line-height:1.6">
            You can activate on up to ${tier === 'community' ? 'unlimited' : '5'} machines.
            To check your license status at any time: <code style="color:#89b4fa">codegen license check</code>
          </p>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a">
          <p style="margin:0;font-size:12px;color:#444;line-height:1.5">
            Questions? Reply to this email or visit
            <a href="https://codexx-dtdk.com" style="color:#666;text-decoration:none">codexx-dtdk.com</a>.
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
