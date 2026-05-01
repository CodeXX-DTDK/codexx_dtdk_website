import type { APIRoute } from 'astro'
import { rateLimit, clientIp } from '../../lib/rate-limit'
import { sendPortalLinkEmail } from '../../lib/email'

export const prerender = false

// Astro+Vercel SSR: env vars added after the first build may only appear via
// process.env at runtime. Read both as a safety net.
const env = (k: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[k] ?? process.env[k]

// Redact PII so we don't leak full emails into logs that may be screenshotted
// or shared in incident postmortems.
const redact = (e: string) => e.replace(/(.{2}).*(@.*)/, '$1***$2')

// Two-tier rate limit:
//   per-email — one portal-link per email per 60s   (legitimate users)
//   per-ip    — at most 30 portal-link calls/min/IP (deters scrapers spraying
//               many emails to enumerate Polar customers via timing).
const PER_EMAIL_LIMIT = 1
const PER_EMAIL_WINDOW_SEC = 60
const PER_IP_LIMIT = 30
const PER_IP_WINDOW_SEC = 60

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST: APIRoute = async ({ request }) => {
  let email: string
  try {
    const body = (await request.json()) as { email?: string }
    email = (body.email ?? '').trim().toLowerCase()
  } catch {
    return json({ error: 'invalid JSON body' }, 400)
  }

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'valid email required' }, 400)
  }

  // Generic success response for non-enumeration: same shape regardless of
  // whether the email matched a Polar customer or hit the rate limit.
  const ok = () => json({ ok: true })

  const ip = clientIp(request.headers)
  const ipBucket = await rateLimit({
    bucket: 'portal-link:ip', id: ip,
    limit: PER_IP_LIMIT, windowSec: PER_IP_WINDOW_SEC,
  })
  if (!ipBucket.allowed) return ok()

  const emailBucket = await rateLimit({
    bucket: 'portal-link:email', id: email,
    limit: PER_EMAIL_LIMIT, windowSec: PER_EMAIL_WINDOW_SEC,
  })
  if (!emailBucket.allowed) return ok()

  const token = env('POLAR_ACCESS_TOKEN')
  if (!token) {
    console.error('[portal-link] POLAR_ACCESS_TOKEN not set')
    return ok()
  }

  const polarBase = env('POLAR_API_BASE') ?? 'https://api.polar.sh'
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  let customerId: string | null = null
  try {
    const lookup = await fetch(
      `${polarBase}/v1/customers/?email=${encodeURIComponent(email)}&limit=1`,
      { headers },
    )
    if (!lookup.ok) {
      console.error('[portal-link] customer lookup failed:', lookup.status, await lookup.text())
      return ok()
    }
    const data = (await lookup.json()) as { items?: Array<{ id: string }> }
    customerId = data.items?.[0]?.id ?? null
  } catch (err) {
    console.error('[portal-link] customer lookup network error:', err)
    return ok()
  }

  if (!customerId) {
    console.log(`[portal-link] no Polar customer for ${redact(email)} — silent ok`)
    return ok()
  }

  const origin = new URL(request.url).origin
  let portalUrl: string
  let expiresAt: string | undefined
  try {
    const sess = await fetch(`${polarBase}/v1/customer-sessions/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer_id: customerId,
        return_url: `${origin}/activate`,
      }),
    })
    if (!sess.ok) {
      console.error('[portal-link] session creation failed:', sess.status, await sess.text())
      return ok()
    }
    const sd = (await sess.json()) as { customer_portal_url: string; expires_at?: string }
    portalUrl = sd.customer_portal_url
    expiresAt = sd.expires_at
  } catch (err) {
    console.error('[portal-link] session network error:', err)
    return ok()
  }

  try {
    await sendPortalLinkEmail({ to: email, url: portalUrl, expiresAt })
    console.log(`[portal-link] portal email sent to ${redact(email)}`)
  } catch (err) {
    console.error('[portal-link] email send failed (non-fatal):', err)
  }

  return ok()
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
