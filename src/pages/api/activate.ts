import type { APIRoute } from 'astro'
import { rateLimit, clientIp } from '../../lib/rate-limit'

export const prerender = false

// Astro+Vercel SSR: env vars added after the first build may only appear via
// process.env at runtime. Read both as a safety net.
const env = (k: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[k] ?? process.env[k]

// Two-tier rate limit:
//   per-ip  — 30 validations/min/IP   (deters distributed brute force from
//             a single host and burns less Keygen quota)
//   per-key — 10 validations/min/key  (deters distributed enumeration on a
//             single guessed key, even from many IPs)
const PER_IP_LIMIT = 30
const PER_IP_WINDOW_SEC = 60
const PER_KEY_LIMIT = 10
const PER_KEY_WINDOW_SEC = 60

// Validates a license key against Keygen without machine registration.
// Returns tier + features for display on the /activate page.
// The actual machine binding happens locally via `codegen license activate <key>`.
export const POST: APIRoute = async ({ request }) => {
  let key: string
  try {
    const body = (await request.json()) as { key?: string }
    key = (body.key ?? '').trim()
  } catch {
    return json({ error: 'invalid JSON body' }, 400)
  }

  if (!key) return json({ error: 'key required' }, 400)

  const ip = clientIp(request.headers)
  const ipBucket = await rateLimit({
    bucket: 'activate:ip', id: ip,
    limit: PER_IP_LIMIT, windowSec: PER_IP_WINDOW_SEC,
  })
  if (!ipBucket.allowed) {
    return json({ error: 'Too many requests. Please wait a moment and try again.' }, 429)
  }

  // Per-key bucket uses a hash so we don't store full license keys in Redis.
  // The key itself is high-entropy, but a key collision in the rate-limit
  // bucket is harmless — we just want a stable identifier.
  const keyId = await sha256Hex(key)
  const keyBucket = await rateLimit({
    bucket: 'activate:key', id: keyId,
    limit: PER_KEY_LIMIT, windowSec: PER_KEY_WINDOW_SEC,
  })
  if (!keyBucket.allowed) {
    return json({ error: 'Too many requests. Please wait a moment and try again.' }, 429)
  }

  const accountId = env('KEYGEN_ACCOUNT_ID')
  if (!accountId) return json({ error: 'KEYGEN_ACCOUNT_ID not set' }, 500)

  const base = env('KEYGEN_API_BASE') ?? 'https://api.keygen.sh'
  const url = `${base}/v1/accounts/${accountId}/licenses/actions/validate-key`

  const headers: Record<string, string> = {
    'Content-Type': 'application/vnd.api+json',
    Accept: 'application/vnd.api+json',
    'Keygen-Version': '1.7',
  }
  // validate-key is unauthenticated but environment-scoped: without this header
  // Keygen searches the wrong scope and returns NOT_FOUND for env-scoped licenses.
  const envScope = env('KEYGEN_ENVIRONMENT')
  if (envScope) headers['Keygen-Environment'] = envScope

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ meta: { key } }),
    })
  } catch {
    return json({ error: 'Could not reach Keygen — check your network.' }, 502)
  }

  const body = (await res.json()) as any
  const valid: boolean = body?.meta?.valid ?? false
  const code: string = body?.meta?.code ?? 'INVALID'

  // A freshly-issued key is not yet bound to a machine — for this display-only
  // check that is success, not failure. Machine binding happens later, in the
  // DTDK manager. Keygen still returns the license `data` for these codes, so
  // tier + features below resolve correctly.
  const UNBOUND_BUT_VALID = new Set(['NO_MACHINE', 'NO_MACHINES'])

  if (!valid && !UNBOUND_BUT_VALID.has(code)) {
    const messages: Record<string, string> = {
      NOT_FOUND: 'License key not found.',
      SUSPENDED: 'License suspended — subscription may have lapsed.',
      EXPIRED: 'License has expired.',
    }
    return json({ error: messages[code] ?? 'Invalid license key.' }, 422)
  }

  const attrs = body.data?.attributes ?? {}
  const md = attrs.metadata ?? {}

  // NOTE: deliberately do NOT return seat.email — turns a leaked key into an
  // email-discovery oracle. The /activate page only needs tier + features.
  return json({
    key,
    tier: md.tier ?? 'community',
    features: md.features ?? {},
  })
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
