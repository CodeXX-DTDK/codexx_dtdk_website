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

  // Polar SDK base64-encodes the raw secret then standardwebhooks base64-decodes it,
  // so the HMAC key is the UTF-8 bytes of the post-prefix string — not base64-decoded.
  const key = Buffer.from(secret.replace(/^(?:whsec_|polar_whs_)/, ''), 'utf8')
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
function productToTier(productId: string): Tier {
  if (productId === import.meta.env.POLAR_PRODUCT_ID_PROFESSIONAL) return 'professional'
  if (productId === import.meta.env.POLAR_PRODUCT_ID_TEAM) return 'team'
  return 'community'
}

function policyIdForTier(tier: Tier): string {
  const map: Record<Tier, string | undefined> = {
    community: import.meta.env.KEYGEN_POLICY_ID_COMMUNITY,
    professional: import.meta.env.KEYGEN_POLICY_ID_PROFESSIONAL,
    team: import.meta.env.KEYGEN_POLICY_ID_TEAM,
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
  sendActivationEmail({ to: email, key: license.key, tier }).catch(err =>
    console.error('[polar-webhook] activation email failed (non-fatal):', err),
  )
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
export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text()
  const secret = import.meta.env.POLAR_WEBHOOK_SECRET

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
