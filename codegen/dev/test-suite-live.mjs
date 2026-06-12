#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Live E2E suite — drives a deployed /api/webhooks/polar endpoint with real
// signed Polar webhooks, then verifies side effects against the real Keygen
// API. No WireMock; no Polar checkout UI. Safe against Preview + Production
// (uses a per-run synthetic order ID so it never collides with real orders).
//
// Required env:
//   WEBHOOK_URL                          full URL, e.g. https://www.codexx-dtdk.com/api/webhooks/polar
//   POLAR_WEBHOOK_SECRET                 polar_whs_…  (matches the signing secret on that deployment)
//   KEYGEN_ACCOUNT_ID                    Keygen account UUID
//   KEYGEN_TOKEN                         env-…  admin/env token for cleanup + status reads
//   KEYGEN_POLICY_ID_PROFESSIONAL        policy UUID expected on Professional licenses
//   POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY  product UUID the deployment maps to Professional/month
//
// Optional env:
//   KEYGEN_API_BASE              default https://api.keygen.sh
//   TEST_EMAIL                   default e2e+<runId>@codexx-dtdk.com
//   KEEP_LICENSE                 if set, skips cleanup (for debugging)
//   VERCEL_PROTECTION_BYPASS     bypass token for Vercel Deployment Protection on
//                                Preview URLs (Project → Settings → Deployment
//                                Protection → Protection Bypass for Automation)
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, randomUUID } from 'node:crypto'

const required = [
  'WEBHOOK_URL',
  'POLAR_WEBHOOK_SECRET',
  'KEYGEN_ACCOUNT_ID',
  'KEYGEN_TOKEN',
  'KEYGEN_POLICY_ID_PROFESSIONAL',
  'POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY',
]
const missing = required.filter(k => !process.env[k])
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  process.exit(2)
}

const WEBHOOK_URL    = process.env.WEBHOOK_URL
const SECRET         = process.env.POLAR_WEBHOOK_SECRET
const KEYGEN_BASE    = process.env.KEYGEN_API_BASE ?? 'https://api.keygen.sh'
const KEYGEN_ACCOUNT = process.env.KEYGEN_ACCOUNT_ID
const KEYGEN_TOKEN   = process.env.KEYGEN_TOKEN
const POLICY_PRO     = process.env.KEYGEN_POLICY_ID_PROFESSIONAL
const PRODUCT_PRO    = process.env.POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY

const BYPASS         = process.env.VERCEL_PROTECTION_BYPASS ?? ''

const RUN_ID         = randomUUID().slice(0, 8)
const TEST_EMAIL     = process.env.TEST_EMAIL ?? `e2e+${RUN_ID}@codexx-dtdk.com`
const ORDER_ID       = `ord_live_${RUN_ID}`
const SUB_ID         = `sub_live_${RUN_ID}`
// Trial-flow uses a separate subscription to avoid collision with E02-E05's
// non-trial order.paid → license flow.
const TRIAL_SUB_ID   = `sub_trial_${RUN_ID}`
const TRIAL_ORDER_ID = `ord_trial_${RUN_ID}`

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', gray: '\x1b[90m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
}

let passed = 0, failed = 0
const ok   = (id, label) => (passed++, console.log(`  ${c.green}✓${c.reset} ${c.gray}${id}${c.reset}  ${label}`))
const fail = (id, label, why) =>
  (failed++,
   console.log(`  ${c.red}✗${c.reset} ${c.gray}${id}${c.reset}  ${label}\n    ${c.red}${why}${c.reset}`))
const group = name => console.log(`\n${c.bold}${c.cyan}━━━ ${name} ${c.reset}`)

// ── Webhook signing (matches Polar SDK: raw UTF-8 bytes of full secret) ──────

function signedWebhookRequest(event, secretOverride) {
  const sec  = secretOverride ?? SECRET
  const body = JSON.stringify(event)
  const id   = `msg_${randomUUID()}`
  const ts   = String(Math.floor(Date.now() / 1000))
  const key  = Buffer.from(sec, 'utf8')
  const sig  = `v1,${createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')}`
  const headers = {
    'Content-Type': 'application/json',
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': sig,
  }
  if (BYPASS) headers['x-vercel-protection-bypass'] = BYPASS
  return fetch(WEBHOOK_URL, { method: 'POST', headers, body })
}

// ── Polar event payloads ─────────────────────────────────────────────────────

const orderPaid = () => ({
  type: 'order.paid',
  data: {
    id: ORDER_ID,
    product: { id: PRODUCT_PRO },
    customer: { email: TEST_EMAIL },
    subscription: { id: SUB_ID, recurringInterval: 'month' },
  },
})

const subRevoked = () => ({
  type: 'subscription.revoked',
  data: { id: SUB_ID, customer: { email: TEST_EMAIL } },
})

const subActive = () => ({
  type: 'subscription.active',
  data: { id: SUB_ID, customer: { email: TEST_EMAIL } },
})

const subCreatedTrialing = (trialDays = 14) => ({
  type: 'subscription.created',
  data: {
    id: TRIAL_SUB_ID,
    status: 'trialing',
    trial_ends_at: new Date(Date.now() + trialDays * 86400_000).toISOString(),
    product: { id: PRODUCT_PRO },
    customer: { email: TEST_EMAIL },
    recurring_interval: 'month',
  },
})

const trialOrderPaid = () => ({
  type: 'order.paid',
  data: {
    id: TRIAL_ORDER_ID,
    product: { id: PRODUCT_PRO },
    customer: { email: TEST_EMAIL },
    subscription: { id: TRIAL_SUB_ID, recurringInterval: 'month' },
  },
})

// ── Keygen API helpers ───────────────────────────────────────────────────────

const kgHeaders = {
  Authorization:  `Bearer ${KEYGEN_TOKEN}`,
  Accept:         'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
  'Keygen-Version': '1.7',
  // env-scoped tokens (env-…) require this. Match what the webhook handler sends.
  ...(process.env.KEYGEN_ENVIRONMENT ? { 'Keygen-Environment': process.env.KEYGEN_ENVIRONMENT } : {}),
}

async function kgGet(path) {
  const url = `${KEYGEN_BASE}/v1/accounts/${KEYGEN_ACCOUNT}${path}`
  const res = await fetch(url, { headers: kgHeaders })
  return { status: res.status, body: res.status === 204 ? null : await res.json() }
}

async function kgDelete(path) {
  const url = `${KEYGEN_BASE}/v1/accounts/${KEYGEN_ACCOUNT}${path}`
  const res = await fetch(url, { method: 'DELETE', headers: kgHeaders })
  return res.status
}

// Find license by polarOrderId metadata. Returns null if none yet.
async function findLicenseByOrder(orderId, { retries = 6, delayMs = 500 } = {}) {
  const path = `/licenses?metadata%5BpolarOrderId%5D=${encodeURIComponent(orderId)}&limit=5`
  for (let i = 0; i < retries; i++) {
    const { status, body } = await kgGet(path)
    if (status === 200 && Array.isArray(body?.data) && body.data.length > 0) return body.data
    await new Promise(r => setTimeout(r, delayMs))
  }
  return null
}

async function findLicenseBySubscription(subId, { retries = 6, delayMs = 500 } = {}) {
  const path = `/licenses?metadata%5BpolarSubscriptionId%5D=${encodeURIComponent(subId)}&limit=5`
  for (let i = 0; i < retries; i++) {
    const { status, body } = await kgGet(path)
    if (status === 200 && Array.isArray(body?.data) && body.data.length > 0) return body.data
    await new Promise(r => setTimeout(r, delayMs))
  }
  return null
}

const licenseStatus = lic => lic?.attributes?.status ?? null
const licensePolicy = lic => lic?.relationships?.policy?.data?.id ?? null

// ── Tests ────────────────────────────────────────────────────────────────────

async function E01_badSignatureRejected() {
  const id = 'E01', label = 'Webhook with wrong signature → 4xx'
  try {
    const res = await signedWebhookRequest(orderPaid(), 'polar_whs_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    if (res.status >= 400 && res.status < 500) ok(id, `${label} (${res.status})`)
    else fail(id, label, `expected 4xx, got ${res.status}`)
  } catch (e) { fail(id, label, e.message) }
}

let createdLicenseId = null

async function E02_orderPaidCreatesLicense() {
  const id = 'E02', label = `order.paid → license created (orderId=${ORDER_ID})`
  try {
    const res = await signedWebhookRequest(orderPaid())
    if (res.status !== 200) return fail(id, label, `webhook returned ${res.status}: ${await res.text()}`)
    const licenses = await findLicenseByOrder(ORDER_ID)
    if (!licenses) return fail(id, label, 'no license found in Keygen after retries')
    if (licenses.length !== 1) return fail(id, label, `expected 1 license, got ${licenses.length}`)
    const lic = licenses[0]
    if (licensePolicy(lic) !== POLICY_PRO)
      return fail(id, label, `policy mismatch: got ${licensePolicy(lic)}, expected ${POLICY_PRO}`)
    createdLicenseId = lic.id
    ok(id, `${label} (license=${lic.id.slice(0, 8)}…)`)
  } catch (e) { fail(id, label, e.message) }
}

async function E03_idempotency() {
  const id = 'E03', label = 'order.paid replay → still 1 license (idempotent)'
  if (!createdLicenseId) return fail(id, label, 'skipped: E02 did not create a license')
  try {
    const res = await signedWebhookRequest(orderPaid())
    if (res.status !== 200) return fail(id, label, `webhook returned ${res.status}`)
    const licenses = await findLicenseByOrder(ORDER_ID, { retries: 2, delayMs: 300 })
    if (licenses?.length !== 1) return fail(id, label, `expected 1 license, got ${licenses?.length}`)
    ok(id, label)
  } catch (e) { fail(id, label, e.message) }
}

async function E04_subscriptionRevokedSuspends() {
  const id = 'E04', label = 'subscription.revoked → license suspended'
  if (!createdLicenseId) return fail(id, label, 'skipped: no license to revoke')
  try {
    const res = await signedWebhookRequest(subRevoked())
    if (res.status !== 200) return fail(id, label, `webhook returned ${res.status}`)
    let status = null
    for (let i = 0; i < 6; i++) {
      const { body } = await kgGet(`/licenses/${createdLicenseId}`)
      status = licenseStatus(body?.data)
      if (status === 'SUSPENDED' || status === 'suspended') break
      await new Promise(r => setTimeout(r, 500))
    }
    if (String(status).toUpperCase() !== 'SUSPENDED')
      return fail(id, label, `expected SUSPENDED, got ${status}`)
    ok(id, label)
  } catch (e) { fail(id, label, e.message) }
}

async function E05_subscriptionActiveReinstates() {
  const id = 'E05', label = 'subscription.active → license reinstated'
  if (!createdLicenseId) return fail(id, label, 'skipped: no license to reinstate')
  try {
    const res = await signedWebhookRequest(subActive())
    if (res.status !== 200) return fail(id, label, `webhook returned ${res.status}`)
    let status = null
    for (let i = 0; i < 6; i++) {
      const { body } = await kgGet(`/licenses/${createdLicenseId}`)
      status = licenseStatus(body?.data)
      if (status && String(status).toUpperCase() !== 'SUSPENDED') break
      await new Promise(r => setTimeout(r, 500))
    }
    if (String(status).toUpperCase() === 'SUSPENDED')
      return fail(id, label, `still SUSPENDED after reinstate`)
    ok(id, `${label} (status=${status})`)
  } catch (e) { fail(id, label, e.message) }
}

async function E06_unknownEventIgnored() {
  const id = 'E06', label = 'Unknown event type → 200 (ignored)'
  try {
    const res = await signedWebhookRequest({ type: 'checkout.completed', data: { id: 'chk_live' } })
    if (res.status === 200) ok(id, label)
    else fail(id, label, `expected 200, got ${res.status}`)
  } catch (e) { fail(id, label, e.message) }
}

let trialLicenseId = null

async function E07_subscriptionCreatedTrialingProvisions() {
  const id = 'E07', label = `subscription.created trialing → license created with trialEnd (subId=${TRIAL_SUB_ID})`
  try {
    const res = await signedWebhookRequest(subCreatedTrialing(14))
    if (res.status !== 200) return fail(id, label, `webhook returned ${res.status}: ${await res.text()}`)
    const licenses = await findLicenseBySubscription(TRIAL_SUB_ID)
    if (!licenses) return fail(id, label, 'no license found by polarSubscriptionId after retries')
    if (licenses.length !== 1) return fail(id, label, `expected 1 license, got ${licenses.length}`)
    const lic = licenses[0]
    if (licensePolicy(lic) !== POLICY_PRO)
      return fail(id, label, `policy mismatch: got ${licensePolicy(lic)}, expected ${POLICY_PRO}`)
    const trialEnd = lic.attributes?.metadata?.subscription?.trialEnd
    if (typeof trialEnd !== 'string' || !trialEnd.length)
      return fail(id, label, `expected metadata.subscription.trialEnd string, got ${JSON.stringify(trialEnd)}`)
    trialLicenseId = lic.id
    ok(id, `${label} (license=${lic.id.slice(0, 8)}…, trialEnd=${trialEnd.slice(0, 10)})`)
  } catch (e) { fail(id, label, e.message) }
}

async function E08_orderPaidLinkedToTrialNoDuplicate() {
  const id = 'E08', label = 'order.paid linked to trialing sub → no duplicate (sub-id dedup)'
  if (!trialLicenseId) return fail(id, label, 'skipped: E07 did not create a trial license')
  try {
    const res = await signedWebhookRequest(trialOrderPaid())
    if (res.status !== 200) return fail(id, label, `webhook returned ${res.status}: ${await res.text()}`)
    const licenses = await findLicenseBySubscription(TRIAL_SUB_ID, { retries: 2, delayMs: 300 })
    if (licenses?.length !== 1) return fail(id, label, `expected 1 license after order.paid, got ${licenses?.length}`)
    if (licenses[0].id !== trialLicenseId)
      return fail(id, label, `license id changed: ${licenses[0].id} vs ${trialLicenseId} (created a new license instead of reusing)`)
    ok(id, label)
  } catch (e) { fail(id, label, e.message) }
}

async function cleanup() {
  if (process.env.KEEP_LICENSE) return
  const ids = [createdLicenseId, trialLicenseId].filter(Boolean)
  if (ids.length === 0) return
  group('Cleanup')
  for (const lid of ids) {
    try {
      const status = await kgDelete(`/licenses/${lid}`)
      if (status === 204 || status === 200)
        console.log(`  ${c.green}✓${c.reset} deleted license ${lid.slice(0, 8)}…`)
      else
        console.log(`  ${c.yellow}!${c.reset} license ${lid.slice(0, 8)}… delete returned ${status} — clean up manually`)
    } catch (e) {
      console.log(`  ${c.yellow}!${c.reset} cleanup error for ${lid.slice(0, 8)}…: ${e.message}`)
    }
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

console.log(`${c.bold}Live E2E suite${c.reset}`)
console.log(`  Webhook   ${c.gray}${WEBHOOK_URL}${c.reset}`)
console.log(`  Keygen    ${c.gray}${KEYGEN_BASE}${c.reset}`)
console.log(`  Account   ${c.gray}${KEYGEN_ACCOUNT}${c.reset}`)
console.log(`  Run ID    ${c.gray}${RUN_ID}${c.reset}`)
console.log(`  Email     ${c.gray}${TEST_EMAIL}${c.reset}`)

group('Live webhook → Keygen E2E')
await E01_badSignatureRejected()
await E02_orderPaidCreatesLicense()
await E03_idempotency()
await E04_subscriptionRevokedSuspends()
await E05_subscriptionActiveReinstates()
await E06_unknownEventIgnored()
await E07_subscriptionCreatedTrialingProvisions()
await E08_orderPaidLinkedToTrialNoDuplicate()

await cleanup()

console.log(`\n${c.bold}${passed} passed${c.reset}, ${failed ? c.red : c.gray}${failed} failed${c.reset}`)
process.exit(failed ? 1 : 0)
