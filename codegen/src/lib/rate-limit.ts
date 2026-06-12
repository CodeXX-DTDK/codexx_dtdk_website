// Rate limiting backed by Upstash Redis. The "Vercel KV" product was
// deprecated; the canonical replacement is Upstash Redis, provisioned via the
// Vercel Marketplace. Fixed-window counter: cheap, ~accurate enough for our
// use case (one-shot abuse, not precise QPS shaping).
//
// Required env (auto-injected when the Upstash integration is provisioned):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// If either is missing OR the network call fails, we FAIL-OPEN (allow the
// request) and log loudly. Rate limiting is defense-in-depth here — outages
// must not take checkout / activation offline.

import { Redis } from '@upstash/redis'

const env = (k: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[k] ?? process.env[k]

let cached: Redis | null | undefined

function client(): Redis | null {
  if (cached !== undefined) return cached
  const url = env('UPSTASH_REDIS_REST_URL')
  const token = env('UPSTASH_REDIS_REST_TOKEN')
  if (!url || !token) {
    console.warn('[rate-limit] Upstash env vars missing — failing open')
    cached = null
    return null
  }
  cached = new Redis({ url, token })
  return cached
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

  const redis = client()
  if (!redis) return fallback

  const key = `rl:${bucket}:${id}`
  try {
    const count = await redis.incr(key)
    if (count === 1) {
      // Best-effort; if EXPIRE fails the key just lives until manually evicted.
      await redis.expire(key, windowSec)
    }
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetSec: windowSec,
    }
  } catch (err) {
    console.error('[rate-limit] Upstash error — failing open:', err)
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
