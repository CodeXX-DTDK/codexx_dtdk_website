// Rate limiting backed by Vercel KV (provisioned via Vercel Dashboard →
// Storage). Fixed-window counter: cheap, ~accurate enough for our use case
// (one-shot abuse, not precise QPS shaping).
//
// Required env (auto-injected when a KV store is linked to the project):
//   KV_REST_API_URL
//   KV_REST_API_TOKEN
//
// If either is missing OR the network call fails, we FAIL-OPEN (allow the
// request) and log loudly. Rate limiting is defense-in-depth here — outages
// must not take checkout / activation offline.

import { kv } from '@vercel/kv'

const env = (k: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[k] ?? process.env[k]

function kvAvailable(): boolean {
  return !!(env('KV_REST_API_URL') && env('KV_REST_API_TOKEN'))
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetSec: number
}

// Increment a fixed-window counter. Returns whether the request is within the
// limit. The first hit in a window sets EXPIRE so the key self-evicts.
export async function rateLimit(params: {
  bucket: string         // logical group, e.g. "portal-link"
  id: string             // identifier within the group, e.g. email or IP
  limit: number          // max requests per window
  windowSec: number      // window length in seconds
}): Promise<RateLimitResult> {
  const { bucket, id, limit, windowSec } = params
  const fallback: RateLimitResult = { allowed: true, remaining: limit, resetSec: windowSec }

  if (!kvAvailable()) {
    console.warn('[rate-limit] KV env vars missing — failing open')
    return fallback
  }

  const key = `rl:${bucket}:${id}`
  try {
    const count = await kv.incr(key)
    if (count === 1) {
      // Best-effort; if EXPIRE fails the key just lives until manually evicted.
      await kv.expire(key, windowSec)
    }
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetSec: windowSec,
    }
  } catch (err) {
    console.error('[rate-limit] KV error — failing open:', err)
    return fallback
  }
}

// Best-effort client IP from common proxy headers. Falls back to "unknown"
// which makes all anonymous callers share one bucket — acceptable for our
// low-volume endpoints.
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
