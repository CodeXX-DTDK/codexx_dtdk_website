#!/usr/bin/env node
/**
 * Backfill: re-point a Keygen license's owner to its real buyer.
 *
 * Before the keygen.ts `upsertUser` fix, the buggy `?filter[email]=` lookup hit
 * a query param Keygen does not support — it was silently ignored, so the call
 * degraded to "the first user in the account". Every license after the first
 * was therefore assigned the wrong owner (and a wrong `metadata.seat.userId`).
 *
 * This script fixes ONE license: it locates the license by its Polar order id,
 * retrieves-or-creates a Keygen user matching the real buyer email, re-points
 * the license `owner` relationship, and rewrites `metadata.seat.userId`.
 *
 * Usage:
 *   KEYGEN_ACCOUNT_ID=<uuid> KEYGEN_TOKEN=<env-token> [KEYGEN_ENVIRONMENT=<scope>] \
 *   node website/dev/backfill-license-owner.mjs --order <polarOrderId> --email <buyerEmail> [--apply]
 *
 * Defaults to a DRY RUN. Pass --apply to perform the writes.
 *
 * The community license in the current data set is already correct (its buyer
 * was the first user created); only the team license needs the backfill:
 *   --order 56da7bb6-7960-4a6d-8961-22074366b35c --email theyoungprogrammer06@gmail.com
 */

const API_BASE  = process.env.KEYGEN_API_BASE ?? 'https://api.keygen.sh'
const ACCOUNT   = process.env.KEYGEN_ACCOUNT_ID
const TOKEN     = process.env.KEYGEN_TOKEN
const ENV_SCOPE = process.env.KEYGEN_ENVIRONMENT

const arg = name => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 ? process.argv[i + 1] : undefined
}
const ORDER = arg('order')
const EMAIL = arg('email')
const APPLY = process.argv.includes('--apply')

const die = msg => { console.error(`✗ ${msg}`); process.exit(1) }

if (!ACCOUNT || !TOKEN) die('set KEYGEN_ACCOUNT_ID and KEYGEN_TOKEN in the environment')
if (!ORDER || !EMAIL)   die('usage: --order <polarOrderId> --email <buyerEmail> [--apply]')

const BASE = `${API_BASE}/v1/accounts/${ACCOUNT}`

const headers = () => {
  const h = {
    'Content-Type': 'application/vnd.api+json',
    Accept: 'application/vnd.api+json',
    Authorization: `Bearer ${TOKEN}`,
    'Keygen-Version': '1.7',
  }
  // env-scoped tokens (env-…) require this header, else 401 TOKEN_INVALID.
  if (ENV_SCOPE) h['Keygen-Environment'] = ENV_SCOPE
  return h
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const err = new Error(json.errors?.[0]?.detail ?? `Keygen HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return json
}

// ── 1. Locate the license by its Polar order id ───────────────────────────────
// Keygen's metadata filter is flat-key only; polarOrderId lives at the top level.
const list = await api('GET', `/licenses?metadata[polarOrderId]=${encodeURIComponent(ORDER)}&limit=1`)
if (!list.data?.length) die(`no license found with metadata[polarOrderId]=${ORDER}`)

const licId = list.data[0].id
// Re-fetch the single resource — a single-resource GET reliably carries the
// to-one `owner` relationship linkage.
const lic = (await api('GET', `/licenses/${licId}`)).data
const metadata   = lic.attributes.metadata ?? {}
const curOwnerId = lic.relationships?.owner?.data?.id
                ?? lic.relationships?.user?.data?.id ?? null

console.log(`license       ${licId}  key=${lic.attributes.key}`)
console.log(`tier          ${metadata.tier ?? '(none)'}`)
console.log(`current owner ${curOwnerId ?? '(none)'}`)
console.log(`seat.email    ${metadata.seat?.email ?? '(none)'}`)
console.log(`seat.userId   ${metadata.seat?.userId ?? '(none)'}`)

// ── 2. Retrieve-or-create the Keygen user for the real buyer ───────────────────
// Same logic as the fixed keygen.ts upsertUser: retrieve by email, 404 → create.
let user
try {
  user = (await api('GET', `/users/${encodeURIComponent(EMAIL)}`)).data
} catch (err) {
  if (err.status !== 404) throw err
  if (!APPLY) {
    console.log(`\n(dry run) user ${EMAIL} does not exist — would be created`)
    user = { id: '<new-user-id>' }
  } else {
    user = (await api('POST', '/users', {
      data: { type: 'users', attributes: { email: EMAIL } },
    })).data
    console.log(`created user  ${user.id}  ${EMAIL}`)
  }
}
const newOwnerId = user.id
console.log(`target owner  ${newOwnerId}  ${EMAIL}`)

// ── 3. Diff ────────────────────────────────────────────────────────────────────
const ownerWrong = curOwnerId !== newOwnerId
const seatWrong  = metadata.seat?.userId !== newOwnerId
if (!ownerWrong && !seatWrong) {
  console.log('\n✓ already correct — nothing to do')
  process.exit(0)
}

if (!APPLY) {
  console.log('\n── DRY RUN — would apply ──')
  if (ownerWrong) console.log(`  PUT   /licenses/${licId}/owner            → ${newOwnerId}`)
  if (seatWrong)  console.log(`  PATCH /licenses/${licId}  seat.userId      → ${newOwnerId}`)
  console.log('\nre-run with --apply to perform the writes')
  process.exit(0)
}

// ── 4. Re-point the owner relationship ─────────────────────────────────────────
if (ownerWrong) {
  await api('PUT', `/licenses/${licId}/owner`, {
    data: { type: 'users', id: newOwnerId },
  })
  console.log(`✓ owner relationship → ${newOwnerId}`)
}

// ── 5. Rewrite metadata.seat.userId ────────────────────────────────────────────
// Keygen REPLACES the metadata object wholesale on PATCH (no deep merge), so the
// full object is sent back with only seat.userId changed.
if (seatWrong) {
  const next = { ...metadata, seat: { ...metadata.seat, userId: newOwnerId } }
  await api('PATCH', `/licenses/${licId}`, {
    data: { type: 'licenses', attributes: { metadata: next } },
  })
  console.log(`✓ metadata.seat.userId → ${newOwnerId}`)
}

console.log('\n✓ backfill complete')
