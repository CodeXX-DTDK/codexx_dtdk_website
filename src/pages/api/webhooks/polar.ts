import type { APIRoute } from 'astro'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { buildLicenseMetadata, type Tier } from '../../../lib/licensing/schema'
import {
  upsertUser,
  findLicenseByOrderId,
  createLicense,
  suspendLicense,
  reinstateLicense,
} from '../../../lib/licensing/keygen'
import { sendActivationEmail } from '../../../lib/email'

export const prerender = false

// ── Polar webhook signature verification ─────────────────────────────────────
// Standard Webhooks spec: sign = HMAC-SHA256(key, "{id}.{timestamp}.{body}")
function verifySignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  const id = headers.get('webhook-id')
  const ts = headers.get('webhook-timestamp')
  const sigs = headers.get('webhook-signature')
  if (!id || !ts || !sigs) return false

  // Reject payloads older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false

  // Polar SDK does btoa(secret) then standardwebhooks strips only `whsec_` and base64-decodes.
  // Since the secret starts with `polar_whs_` (not stripped), the HMAC key ends up being the
  // raw UTF-8 bytes of the FULL secret including the `polar_whs_` prefix.
  const key = Buffer.from(secret, 'utf8')
  const expected = createHmac('sha256', key)
    .update(`${id}.${ts}.${rawBody}`)
    .digest('base64')

  return sigs.split(' ').some(sig => {
    const value = sig.replace(/^v1,/, '')
    try {
      return timingSafeEqual(Buffer.from(value, 'base64'), Buffer.from(expected, 'base64'))
    } catch {
      return false
    }
  })
}

// ── Tier resolution ───────────────────────────────────────────────────────────
const env = (k: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[k] ?? process.env[k]

function productToTier(productId: string): Tier {
  if (productId === env('POLAR_PRODUCT_ID_PROFESSIONAL')) return 'professional'
  if (productId === env('POLAR_PRODUCT_ID_TEAM')) return 'team'
  return 'community'
}

function policyIdForTier(tier: Tier): string {
  const map: Record<Tier, string | undefined> = {
    community: env('KEYGEN_POLICY_ID_COMMUNITY'),
    professional: env('KEYGEN_POLICY_ID_PROFESSIONAL'),
    team: env('KEYGEN_POLICY_ID_TEAM'),
  }
  const id = map[tier]
  if (!id) throw new Error(`KEYGEN_POLICY_ID_${tier.toUpperCase()} not set`)
  return id
}

// ── Handlers ─────────────────────────────────────────────────────────────────
async function handleOrderPaid(order: any): Promise<void> {
  const productId: string =
    order.product?.id ?? order.product_id ?? order.items?.[0]?.product_id ?? ''
  const email: string = order.customer?.email ?? order.billing_email ?? ''
  const polarOrderId: string = order.id

  if (!email) throw new Error('order.paid: missing customer email')

  // Idempotency guard
  const existing = await findLicenseByOrderId(polarOrderId)
  if (existing) {
    console.log(`[polar-webhook] order ${polarOrderId} already provisioned → ${existing.key}`)
    return
  }

  const tier = productToTier(productId)
  const user = await upsertUser(email)
  const metadata = buildLicenseMetadata({
    tier,
    userId: user.id,
    email,
    orgId: null,
    polarOrderId,
    polarProductId: productId,
    interval: order.subscription?.recurringInterval ?? null,
    trialEnd: null,
  })

  const license = await createLicense({
    policyId: policyIdForTier(tier),
    userId: user.id,
    metadata,
    maxMachines: metadata.limits.maxMachines,
  })

  console.log(`[polar-webhook] provisioned ${tier} license ${license.key} for ${email}`)
  // Must await — Vercel lambda terminates on response, killing in-flight fetches.
  // If Resend errors, log but don't fail the webhook (license already exists).
  try {
    await sendActivationEmail({ to: email, key: license.key, tier })
    console.log(`[polar-webhook] activation email sent to ${email}`)
  } catch (err) {
    console.error('[polar-webhook] activation email failed (non-fatal):', err)
  }
}

async function handleOrderRefunded(order: any): Promise<void> {
  const polarOrderId: string = order.id
  const license = await findLicenseByOrderId(polarOrderId)
  if (!license) {
    console.warn(`[polar-webhook] order.refunded: no license found for order ${polarOrderId}`)
    return
  }
  await suspendLicense(license.id)
  console.log(`[polar-webhook] suspended license ${license.id} (refund)`)
}

async function handleSubscriptionRevoked(sub: any): Promise<void> {
  const polarOrderId: string = sub.order_id ?? sub.orderId ?? sub.id
  const license = await findLicenseByOrderId(polarOrderId)
  if (!license) {
    console.warn(`[polar-webhook] subscription.revoked: no license found for order ${polarOrderId}`)
    return
  }
  await suspendLicense(license.id)
  console.log(`[polar-webhook] suspended license ${license.id}`)
}

async function handleSubscriptionActive(sub: any): Promise<void> {
  const polarOrderId: string = sub.order_id ?? sub.orderId ?? sub.id
  const license = await findLicenseByOrderId(polarOrderId)
  if (!license) return
  await reinstateLicense(license.id)
  console.log(`[polar-webhook] reinstated license ${license.id}`)
}

// ── Route ─────────────────────────────────────────────────────────────────────
// Real Polar payloads are <8KB. Cap conservatively to bound CPU/memory under
// abuse — signature verification reads the full body, so the cap goes BEFORE
// any signature work.
const MAX_BODY_BYTES = 64 * 1024

export const POST: APIRoute = async ({ request }) => {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) {
    return new Response('payload too large', { status: 413 })
  }

  const rawBody = await request.text()
  // Re-check after reading: content-length header is advisory; chunked encoding
  // or a lying client could send more bytes than declared.
  if (rawBody.length > MAX_BODY_BYTES) {
    return new Response('payload too large', { status: 413 })
  }

  const secret = env('POLAR_WEBHOOK_SECRET')

  if (!secret) {
    console.error('[polar-webhook] POLAR_WEBHOOK_SECRET not set')
    return new Response('misconfigured', { status: 500 })
  }

  if (!verifySignature(rawBody, request.headers, secret)) {
    return new Response('invalid signature', { status: 400 })
  }

  let event: { type: string; data: any }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response('invalid json', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'order.paid':
        await handleOrderPaid(event.data)
        break
      case 'order.refunded':
        await handleOrderRefunded(event.data)
        break
      case 'subscription.revoked':
        await handleSubscriptionRevoked(event.data)
        break
      case 'subscription.active':
        await handleSubscriptionActive(event.data)
        break
      default:
        // acknowledged but not handled
        break
    }
  } catch (err) {
    console.error(`[polar-webhook] ${event.type} failed:`, err)
    return new Response('internal error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}
