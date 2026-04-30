import type { APIRoute } from 'astro'

export const prerender = false

// Astro+Vercel SSR: env vars added after the first build may only appear via
// process.env at runtime. Read both as a safety net.
const env = (k: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[k] ?? process.env[k]

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

  if (!valid) {
    const code: string = body?.meta?.code ?? 'INVALID'
    const messages: Record<string, string> = {
      NOT_FOUND: 'License key not found.',
      NO_MACHINES: 'License key not found.',
      SUSPENDED: 'License suspended — subscription may have lapsed.',
      EXPIRED: 'License has expired.',
    }
    return json({ error: messages[code] ?? 'Invalid license key.' }, 422)
  }

  const attrs = body.data?.attributes ?? {}
  const md = attrs.metadata ?? {}

  return json({
    key,
    tier: md.tier ?? 'community',
    email: md.seat?.email ?? '',
    features: md.features ?? {},
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
