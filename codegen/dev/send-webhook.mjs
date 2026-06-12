/**
 * Sends a mock Polar webhook with a valid Standard Webhooks signature.
 *
 * Usage:
 *   node dev/send-webhook.mjs <event> [options]
 *
 * Events:
 *   order.paid                  (default)
 *   order.refunded
 *   subscription.created        (use --trial for trialing flow)
 *   subscription.active
 *   subscription.revoked
 *
 * Options:
 *   --tier <community|professional|team>  default: professional
 *   --interval <month|year>               default: month
 *   --trial <14|30>                       subscription.created: mark trialing, set trial_ends_at
 *   --sub-id <id>                         explicit subscription id (default: generated)
 *   --order-id <id>                       explicit order id (default: generated)
 *   --email <addr>                        customer email (default: test+<ts>@example.com)
 *   --link-subscription                   on order.paid, attach a subscription id to the order
 *
 * Local WireMock (default):
 *   node dev/send-webhook.mjs subscription.created --trial 14 --tier professional
 *   node dev/send-webhook.mjs order.paid --tier team --interval year
 *
 * Sandbox:
 *   POLAR_WEBHOOK_SECRET=polar_whs_xxx \
 *   POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY=... \
 *   POLAR_PRODUCT_ID_TEAM_MONTHLY=... \
 *   node dev/send-webhook.mjs subscription.created --trial 14
 */
import { createHmac, randomUUID } from 'node:crypto'

// ── Arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const positional = args.filter(a => !a.startsWith('--'))
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  if (i === -1) return fallback
  // boolean flag if next arg is another --flag or absent
  const next = args[i + 1]
  return next === undefined || next.startsWith('--') ? true : next
}

const EVENT    = positional[0] ?? 'order.paid'
const TIER     = flag('tier',     'professional')
const INTERVAL = flag('interval', 'month')
const TRIAL    = flag('trial',    null)  // '14' or '30' or null
const EMAIL    = flag('email',    null)
const SUB_ID   = flag('sub-id',   null)
const ORDER_ID = flag('order-id', null)
const LINK_SUB = flag('link-subscription', false)

const VALID_EVENTS = new Set([
  'order.paid', 'order.refunded',
  'subscription.created', 'subscription.active', 'subscription.revoked',
])
if (!VALID_EVENTS.has(EVENT)) {
  console.error(`Unknown event: ${EVENT}`)
  console.error(`Valid: ${[...VALID_EVENTS].join(', ')}`)
  process.exit(2)
}

// ── Config ────────────────────────────────────────────────────────────────────

const URL = process.env.WEBHOOK_URL ?? 'http://localhost:4321/api/webhooks/polar'
const SECRET = process.env.POLAR_WEBHOOK_SECRET
  ?? 'whsec_dGVzdHNlY3JldGZvcmxvY2FsZGV2dGVzdGluZw=='

// Product ID resolution — first the new (tier × interval) env, then a legacy
// single-tier env (sandbox `.env.preview` may still use the old names), then
// a mock value for WireMock-only flows.
function productIdFor(tier, interval) {
  if (tier === 'community') {
    return process.env.POLAR_PRODUCT_ID_COMMUNITY ?? 'prod_community_mock'
  }
  const TIER_UPPER = tier.toUpperCase()
  const INTERVAL_UPPER = interval === 'year' ? 'YEARLY' : 'MONTHLY'
  return (
    process.env[`POLAR_PRODUCT_ID_${TIER_UPPER}_${INTERVAL_UPPER}`]
    ?? process.env[`POLAR_PRODUCT_ID_${TIER_UPPER}`]   // legacy
    ?? `prod_${tier}_mock`
  )
}

const productId = productIdFor(TIER, INTERVAL)
const ts = Date.now()
const subId   = SUB_ID   ?? `sub_test_${ts}`
const orderId = ORDER_ID ?? `ord_test_${ts}`
const email   = EMAIL    ?? `test+${ts}@example.com`

// ── Event payload builder ─────────────────────────────────────────────────────

function buildPayload() {
  switch (EVENT) {
    case 'order.paid': {
      const data = {
        id: orderId,
        product: { id: productId },
        customer: { email },
        subscription: { recurringInterval: INTERVAL },
      }
      if (LINK_SUB) data.subscription.id = subId
      return { type: 'order.paid', data }
    }
    case 'order.refunded': {
      return { type: 'order.refunded', data: { id: orderId } }
    }
    case 'subscription.created': {
      const trialDays = TRIAL ? Number(TRIAL) : null
      const trialEnd = trialDays
        ? new Date(Date.now() + trialDays * 86400_000).toISOString()
        : null
      return {
        type: 'subscription.created',
        data: {
          id: subId,
          status: trialEnd ? 'trialing' : 'active',
          ...(trialEnd ? { trial_ends_at: trialEnd } : {}),
          product: { id: productId },
          customer: { email },
          recurring_interval: INTERVAL,
          current_period_end: trialEnd ?? new Date(Date.now() + 30 * 86400_000).toISOString(),
        },
      }
    }
    case 'subscription.active':
    case 'subscription.revoked': {
      return { type: EVENT, data: { id: subId } }
    }
  }
}

const event = buildPayload()

// ── Sign + send ───────────────────────────────────────────────────────────────

const body = JSON.stringify(event)
const webhookId = `msg_${randomUUID()}`
const webhookTimestamp = String(Math.floor(Date.now() / 1000))

// Mirror the handler: HMAC key is the raw UTF-8 of the full secret (incl. prefix)
// — Polar `polar_whs_` convention, not standardwebhooks base64-after-strip.
const key = Buffer.from(SECRET, 'utf8')
const toSign = `${webhookId}.${webhookTimestamp}.${body}`
const sig = `v1,${createHmac('sha256', key).update(toSign).digest('base64')}`

const res = await fetch(URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'webhook-id': webhookId,
    'webhook-timestamp': webhookTimestamp,
    'webhook-signature': sig,
  },
  body,
})

console.log(`POST ${URL}`)
console.log(`  event   ${EVENT}${TRIAL ? ` (trial ${TRIAL}d)` : ''}`)
console.log(`  tier    ${TIER} (${INTERVAL})`)
console.log(`  sub-id  ${subId}`)
console.log(`  ord-id  ${orderId}`)
console.log(`  email   ${email}`)
console.log(`  → ${res.status} ${await res.text()}`)
