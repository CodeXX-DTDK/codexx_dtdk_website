/**
 * Sends a mock Polar `order.paid` webhook with a valid Standard Webhooks signature.
 *
 * Local WireMock (default):
 *   node dev/send-webhook.mjs [community|professional|team]
 *
 * Sandbox (pass secret explicitly — shell env, not .env.sandbox.local):
 *   POLAR_WEBHOOK_SECRET=polar_whs_xxx \
 *   POLAR_PRODUCT_ID_PROFESSIONAL=e194eec3-... \
 *   POLAR_PRODUCT_ID_TEAM=acce8699-... \
 *   node dev/send-webhook.mjs professional
 */
import { createHmac, randomUUID } from 'node:crypto'

const TIER = process.argv[2] ?? 'professional'
const URL = process.env.WEBHOOK_URL ?? 'http://localhost:4321/api/webhooks/polar'
const SECRET = process.env.POLAR_WEBHOOK_SECRET ?? 'whsec_dGVzdHNlY3JldGZvcmxvY2FsZGV2dGVzdGluZw=='

const PRODUCT_IDS = {
  community: 'prod_community_mock',
  professional: process.env.POLAR_PRODUCT_ID_PROFESSIONAL ?? 'prod_professional_mock',
  team: process.env.POLAR_PRODUCT_ID_TEAM ?? 'prod_team_mock',
}

const event = {
  type: 'order.paid',
  data: {
    id: `ord_test_${Date.now()}`,
    product: { id: PRODUCT_IDS[TIER] ?? PRODUCT_IDS.professional },
    customer: { email: `test+${Date.now()}@example.com` },
    subscription: { recurringInterval: 'month' },
  },
}

const body = JSON.stringify(event)
const webhookId = `msg_${randomUUID()}`
const webhookTimestamp = String(Math.floor(Date.now() / 1000))

const key = Buffer.from(SECRET.replace(/^(?:whsec_|polar_whs_)/, ''), 'base64')
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

console.log(`POST ${URL} → ${res.status} ${await res.text()}`)
