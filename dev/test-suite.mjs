/**
 * Pre-go-live licensing system test suite.
 *
 * Group W — Webhook endpoint  (requires Astro dev server + WireMock)
 * Group L — C++ CLI           (requires codegen binary compiled against WireMock)
 *
 * Run from project root or codegen/website/:
 *   node codegen/website/dev/test-suite.mjs
 *   node dev/test-suite.mjs                           (from codegen/website/)
 *
 * Env overrides (all optional):
 *   WEBHOOK_URL         default http://localhost:4321/api/webhooks/polar
 *   KEYGEN_MOCK_URL     default http://localhost:4010
 *   POLAR_WEBHOOK_SECRET   default (local WireMock secret)
 *   CODEGEN_BINARY      explicit path to codegen binary
 *
 * CLI args:
 *   --binary <path>     override CODEGEN_BINARY
 *   --group W|L         run only one group
 */
import { createHmac, randomUUID }             from 'node:crypto'
import { spawnSync }                          from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname }             from 'node:path'
import { homedir }                            from 'node:os'
import { fileURLToPath }                      from 'node:url'

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

// ── Config ────────────────────────────────────────────────────────────────────

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'http://localhost:4321/api/webhooks/polar'
const MOCK_URL    = process.env.KEYGEN_MOCK_URL ?? 'http://localhost:4010'
const ADMIN       = `${MOCK_URL}/__admin`
const SECRET      = process.env.POLAR_WEBHOOK_SECRET
  ?? 'whsec_dGVzdHNlY3JldGZvcmxvY2FsZGV2dGVzdGluZw=='

const binaryFlagIdx = process.argv.indexOf('--binary')
const groupFlag     = process.argv[process.argv.indexOf('--group') + 1]?.toUpperCase()

const BINARY_CANDIDATES = [
  binaryFlagIdx !== -1 ? process.argv[binaryFlagIdx + 1] : null,
  process.env.CODEGEN_BINARY,
  // Linux/macOS — cmake -B build
  resolve(ROOT, 'build/codegen/codegen'),
  resolve(ROOT, 'build/Debug/codegen'),
  resolve(ROOT, 'build/Release/codegen'),
  // Windows multi-config
  resolve(ROOT, 'build/codegen/Debug/codegen.exe'),
  resolve(ROOT, 'build/codegen/Release/codegen.exe'),
].filter(Boolean)

const BINARY = BINARY_CANDIDATES.find(p => existsSync(p)) ?? null

// ── ANSI colors ───────────────────────────────────────────────────────────────

const USE_COLOR = process.stdout.isTTY !== false
const c = USE_COLOR
  ? { reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m', red: '\x1b[31m',
      yellow: '\x1b[33m', gray: '\x1b[90m', cyan: '\x1b[36m' }
  : Object.fromEntries(['reset','bold','green','red','yellow','gray','cyan'].map(k => [k, '']))

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0
const failures = []

const pass = (id, label) => {
  passed++
  console.log(`  ${c.green}✓${c.reset} ${c.gray}${id}${c.reset}  ${label}`)
}
const fail = (id, label, reason) => {
  failed++
  failures.push({ id, label, reason })
  console.log(`  ${c.red}✗${c.reset} ${c.gray}${id}${c.reset}  ${label}`)
  console.log(`       ${c.red}↳ ${reason}${c.reset}`)
}
const skip = (id, label, reason) =>
  (skipped++,
   console.log(`  ${c.yellow}○${c.reset} ${c.gray}${id}${c.reset}  ${label} ${c.gray}(${reason})${c.reset}`))

const group = name =>
  console.log(`\n${c.bold}${c.cyan}━━━ ${name} ${c.reset}`)

// ── Webhook helpers ───────────────────────────────────────────────────────────

function signedWebhookRequest(event, secretOverride) {
  const sec  = secretOverride ?? SECRET
  const body = JSON.stringify(event)
  const id   = `msg_${randomUUID()}`
  const ts   = String(Math.floor(Date.now() / 1000))
  const key  = Buffer.from(sec.replace(/^(?:whsec_|polar_whs_)/, ''), 'base64')
  const sig  = `v1,${createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')}`
  return fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': ts,
      'webhook-signature': sig,
    },
    body,
  })
}

const orderPaid = (orderId, productId = 'prod_professional_mock') => ({
  type: 'order.paid',
  data: {
    id: orderId,
    product: { id: productId },
    customer: { email: `test+${orderId}@example.com` },
    subscription: { recurringInterval: 'month' },
  },
})

// ── WireMock admin helpers ────────────────────────────────────────────────────

// WireMock 3.x: DELETE /__admin/requests (POST /reset does not exist in v3)
const wmResetJournal = () =>
  fetch(`${ADMIN}/requests`, { method: 'DELETE' })

async function wmCount(pattern) {
  const res = await fetch(`${ADMIN}/requests/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pattern),
  })
  return ((await res.json()).count) ?? 0
}

async function wmAddStub(stub) {
  const res = await fetch(`${ADMIN}/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stub),
  })
  return (await res.json()).id // WireMock UUID for later removal
}

const wmRemoveStub = id =>
  fetch(`${ADMIN}/mappings/${id}`, { method: 'DELETE' })

// Stub that makes GET /licenses (any query) return an existing license.
// Uses urlPathPattern (path only) — matching on query string is unreliable because
// WireMock may see URL-encoded brackets (metadata%5BpolarOrderId%5D vs metadata[polarOrderId]).
// Priority 1 overrides the default list-licenses-empty stub (priority 5).
// The stub is added immediately before each test and removed after, so tests don't overlap.
const licenseExistsStub = (_orderId, licId = 'lic_mock_existing') => ({
  priority: 1,
  request: {
    method: 'GET',
    urlPathPattern: '/v1/accounts/[^/]+/licenses',
  },
  response: {
    status: 200,
    headers: { 'Content-Type': 'application/vnd.api+json' },
    jsonBody: {
      data: [{ id: licId, type: 'licenses', attributes: { key: 'CODEGEN-EXISTING-MOCK-KEY', metadata: {} } }],
      meta: { count: 1 },
    },
  },
})

// ── C++ CLI helpers ───────────────────────────────────────────────────────────

function tokenFilePath() {
  if (process.platform === 'win32')
    return join(process.env.APPDATA ?? homedir(), 'codegen', 'license.token')
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'codegen', 'license.token')
}

function runBinary(...args) {
  const r = spawnSync(BINARY, ['license', ...args], {
    encoding: 'utf8',
    timeout: 20_000,
    // Always redirect the binary at the local WireMock instance.
    // LicenseValidator reads KEYGEN_API_BASE via std::getenv(), so this works
    // even when the binary was compiled with the production URL.
    env: {
      ...process.env,
      KEYGEN_API_BASE:    MOCK_URL,
      KEYGEN_ACCOUNT_ID:  'ee46e85e-a395-4f97-aae6-cfb2d5a2597b',
    },
  })
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

// ── Prerequisite check ────────────────────────────────────────────────────────

async function checkPrereqs() {
  let wireMockOk = false
  try { wireMockOk = (await fetch(`${ADMIN}/health`)).ok } catch { /* noop */ }

  let astroOk = false
  try {
    const r = await fetch(WEBHOOK_URL, {
      method: 'POST', body: '{}',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
    })
    astroOk = r.status > 0
  } catch { /* noop */ }

  return { wireMockOk, astroOk }
}

// ── Group W: Webhook endpoint tests ──────────────────────────────────────────

async function runWebhookTests() {
  group('Webhook Endpoint (W)')

  // W01 — Wrong signature → 400
  {
    const res  = await signedWebhookRequest(orderPaid(`ord_w01_${Date.now()}`),
                                            'whsec_d3JvbmdzZWNyZXQ=')
    const text = await res.text()
    res.status === 400 && text.includes('invalid signature')
      ? pass('W01', 'wrong secret → 400 invalid signature')
      : fail('W01', 'wrong secret → 400 invalid signature', `got ${res.status} "${text}"`)
  }

  // W02 — order.paid → 200 + createLicense called in Keygen
  {
    await wmResetJournal()
    const res    = await signedWebhookRequest(orderPaid(`ord_w02_${Date.now()}`))
    const text   = await res.text()
    const creates = await wmCount({ method: 'POST', urlPattern: '/v1/accounts/.*/licenses$' })
    res.status === 200 && creates >= 1
      ? pass('W02', 'order.paid → 200, license created in Keygen')
      : fail('W02', 'order.paid → 200, license created in Keygen',
             `status=${res.status} "${text}", createLicense calls=${creates}`)
  }

  // W03 — order.paid idempotency → 200, no duplicate create
  {
    const orderId = 'ord_idem_test'
    const sid  = await wmAddStub(licenseExistsStub(orderId))
    await wmResetJournal()
    const res  = await signedWebhookRequest(orderPaid(orderId))
    const text = await res.text()
    const creates = await wmCount({ method: 'POST', urlPattern: '/v1/accounts/.*/licenses$' })
    await wmRemoveStub(sid)
    res.status === 200 && creates === 0
      ? pass('W03', 'order.paid idempotency → 200, no duplicate create')
      : fail('W03', 'order.paid idempotency → 200, no duplicate create',
             `status=${res.status} "${text}", createLicense calls=${creates} (expected 0)`)
  }

  // W04 — order.refunded → 200 + suspend called
  {
    const orderId = 'ord_refund_test', licId = 'lic_mock_refund'
    const sid  = await wmAddStub(licenseExistsStub(orderId, licId))
    await wmResetJournal()
    const res  = await signedWebhookRequest({ type: 'order.refunded', data: { id: orderId } })
    const text = await res.text()
    const suspends = await wmCount({ method: 'POST',
      urlPattern: `/v1/accounts/.*/licenses/${licId}/actions/suspend` })
    await wmRemoveStub(sid)
    res.status === 200 && suspends >= 1
      ? pass('W04', 'order.refunded → 200, license suspended')
      : fail('W04', 'order.refunded → 200, license suspended',
             `status=${res.status} "${text}", suspend calls=${suspends}`)
  }

  // W05 — subscription.revoked → 200 + suspend called
  {
    const orderId = 'ord_revoke_test', licId = 'lic_mock_revoke'
    const sid  = await wmAddStub(licenseExistsStub(orderId, licId))
    await wmResetJournal()
    const res  = await signedWebhookRequest({ type: 'subscription.revoked', data: { id: orderId } })
    const text = await res.text()
    const suspends = await wmCount({ method: 'POST',
      urlPattern: `/v1/accounts/.*/licenses/${licId}/actions/suspend` })
    await wmRemoveStub(sid)
    res.status === 200 && suspends >= 1
      ? pass('W05', 'subscription.revoked → 200, license suspended')
      : fail('W05', 'subscription.revoked → 200, license suspended',
             `status=${res.status} "${text}", suspend calls=${suspends}`)
  }

  // W06 — subscription.active → 200 + reinstate called
  {
    const orderId = 'ord_revive_test', licId = 'lic_mock_revive'
    const sid  = await wmAddStub(licenseExistsStub(orderId, licId))
    await wmResetJournal()
    const res  = await signedWebhookRequest({ type: 'subscription.active', data: { id: orderId } })
    const text = await res.text()
    const reinstates = await wmCount({ method: 'POST',
      urlPattern: `/v1/accounts/.*/licenses/${licId}/actions/reinstate` })
    await wmRemoveStub(sid)
    res.status === 200 && reinstates >= 1
      ? pass('W06', 'subscription.active → 200, license reinstated')
      : fail('W06', 'subscription.active → 200, license reinstated',
             `status=${res.status} "${text}", reinstate calls=${reinstates}`)
  }

  // W07 — unknown event type → 200 (acknowledged, not handled)
  {
    const res  = await signedWebhookRequest({ type: 'checkout.completed', data: { id: 'chk_test' } })
    const text = await res.text()
    res.status === 200
      ? pass('W07', 'unknown event type → 200 (acknowledged, not handled)')
      : fail('W07', 'unknown event type → 200 (acknowledged, not handled)',
             `got ${res.status} "${text}"`)
  }
}

// ── Group L: C++ CLI tests ────────────────────────────────────────────────────

async function runCliTests() {
  group('C++ CLI (L)')

  const L_TESTS = [
    ['L01', 'fingerprint → 64-char hex'],
    ['L02', 'activate → success'],
    ['L03', 'check → valid (cached token)'],
    ['L04', 'machine fingerprint tamper → MachineMismatch'],
    ['L05', 'check after fingerprint restore → valid'],
    ['L06', 'JSON corruption → CacheCorrupt'],
    ['L07', 'check after JSON restore → valid'],
    ['L08', 'deactivate → DELETE /machines called in Keygen'],
    ['L09', 'check after deactivate → Unreachable'],
    ['L10', 're-activate → success'],
  ]

  if (!BINARY) {
    for (const [id, label] of L_TESTS)
      skip(id, label, 'binary not found — set CODEGEN_BINARY or build the project first')
    return
  }

  const TOKEN = tokenFilePath()

  // L01 — fingerprint
  {
    const r  = runBinary('fingerprint')
    const fp = r.stdout.trim()
    const isHex64 = r.code === 0 && /^[0-9a-f]{64}$/.test(fp)
    if (isHex64)
      pass('L01', `fingerprint → 64-char hex  ${c.gray}(${fp.slice(0, 12)}…)${c.reset}`)
    else
      fail('L01', 'fingerprint → 64-char hex', `exit=${r.code}, output="${fp}"`)
  }

  // L02 — activate
  {
    const r = runBinary('activate', 'CODEGEN-TEST-MOCK-KEY')
    if (r.code === 0 && r.stdout.toLowerCase().includes('activated')) {
      pass('L02', 'activate → success')
    } else {
      fail('L02', 'activate → success', `exit=${r.code}: ${(r.stderr || r.stdout).trim()}`)
      const why = 'activate failed — binary may not be compiled with KEYGEN_API_BASE=http://localhost:4010'
      for (const [id, label] of L_TESTS.slice(2)) skip(id, label, why)
      return
    }
  }

  // L03 — check (from cache)
  {
    const r = runBinary('check')
    r.code === 0 && r.stdout.toLowerCase().includes('valid')
      ? pass('L03', 'check → valid (cached token)')
      : fail('L03', 'check → valid (cached token)', `exit=${r.code}: ${(r.stderr || r.stdout).trim()}`)
  }

  // L04 — tamper machine_fingerprint in token → MachineMismatch
  {
    let backup = null
    try {
      backup = readFileSync(TOKEN, 'utf8')
      const tok = JSON.parse(backup)
      tok.machine_fingerprint = 'a'.repeat(64)
      writeFileSync(TOKEN, JSON.stringify(tok, null, 2))
      const r = runBinary('check')
      r.code !== 0 && (r.stderr + r.stdout).toLowerCase().includes('machine')
        ? pass('L04', 'machine fingerprint tamper → MachineMismatch')
        : fail('L04', 'machine fingerprint tamper → MachineMismatch',
               `exit=${r.code}: ${(r.stderr || r.stdout).trim()}`)
    } catch (e) {
      fail('L04', 'machine fingerprint tamper → MachineMismatch', String(e))
    } finally {
      if (backup) writeFileSync(TOKEN, backup)
    }
  }

  // L05 — check after fingerprint restore
  {
    const r = runBinary('check')
    r.code === 0
      ? pass('L05', 'check after fingerprint restore → valid')
      : fail('L05', 'check after fingerprint restore → valid',
             `exit=${r.code}: ${(r.stderr || r.stdout).trim()}`)
  }

  // L06 — corrupt JSON → CacheCorrupt
  {
    let backup = null
    try {
      backup = readFileSync(TOKEN, 'utf8')
      writeFileSync(TOKEN, '{corrupted json [[[')
      const r = runBinary('check')
      // CacheCorrupt: exit 1, message mentions "corrupt"
      r.code !== 0 && (r.stderr + r.stdout).toLowerCase().includes('corrupt')
        ? pass('L06', 'JSON corruption → CacheCorrupt')
        : fail('L06', 'JSON corruption → CacheCorrupt',
               `exit=${r.code}: ${(r.stderr || r.stdout).trim()}`)
    } catch (e) {
      fail('L06', 'JSON corruption → CacheCorrupt', String(e))
    } finally {
      if (backup) writeFileSync(TOKEN, backup)
    }
  }

  // L07 — check after JSON restore
  {
    const r = runBinary('check')
    r.code === 0
      ? pass('L07', 'check after JSON restore → valid')
      : fail('L07', 'check after JSON restore → valid',
             `exit=${r.code}: ${(r.stderr || r.stdout).trim()}`)
  }

  // L08 — deactivate → DELETE /machines called
  {
    await wmResetJournal()
    const r = runBinary('deactivate')
    const deletes = await wmCount({ method: 'DELETE', urlPattern: '/v1/accounts/.*/machines/.*' })
    if (r.code === 0 && deletes >= 1) {
      pass('L08', 'deactivate → DELETE /machines called in Keygen')
    } else if (r.code === 0 && deletes === 0) {
      fail('L08', 'deactivate → DELETE /machines called in Keygen',
           'local token cleared but DELETE /machines not sent — keygen_machine_id missing from token (did L02 activate complete successfully?)')
    } else {
      fail('L08', 'deactivate → DELETE /machines called in Keygen',
           `exit=${r.code}: ${(r.stderr || r.stdout).trim()}`)
    }
  }

  // L09 — check after deactivate → should fail (no token)
  {
    const r = runBinary('check')
    r.code !== 0
      ? pass('L09', 'check after deactivate → Unreachable (no local token)')
      : fail('L09', 'check after deactivate → Unreachable', `expected exit 1, got 0: ${r.stdout.trim()}`)
  }

  // L10 — re-activate
  {
    const r = runBinary('activate', 'CODEGEN-TEST-MOCK-KEY')
    r.code === 0 && r.stdout.toLowerCase().includes('activated')
      ? pass('L10', 're-activate → success')
      : fail('L10', 're-activate → success', `exit=${r.code}: ${(r.stderr || r.stdout).trim()}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}Licensing system test suite${c.reset}`)
  console.log(`  Webhook   ${c.gray}${WEBHOOK_URL}${c.reset}`)
  console.log(`  Keygen    ${c.gray}${MOCK_URL}${c.reset}`)
  console.log(`  Binary    ${BINARY ? c.gray + BINARY : c.yellow + 'not found'}${c.reset}`)

  const { wireMockOk, astroOk } = await checkPrereqs()
  const needsWebhook = !groupFlag || groupFlag === 'W'
  const needsCli     = !groupFlag || groupFlag === 'L'

  if (needsWebhook && !wireMockOk) {
    console.log(`\n${c.red}✗ WireMock not reachable at ${MOCK_URL}${c.reset}`)
    console.log(`  ${c.gray}docker compose up keygen-mock -d${c.reset}`)
    process.exit(1)
  }
  if (needsWebhook && !astroOk) {
    console.log(`\n${c.red}✗ Astro dev server not reachable at ${WEBHOOK_URL}${c.reset}`)
    console.log(`  ${c.gray}cd codegen/website && pnpm dev${c.reset}`)
    process.exit(1)
  }

  if (needsWebhook) await runWebhookTests()
  if (needsCli)     await runCliTests()

  const total = passed + failed + skipped
  console.log(`\n${c.bold}━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`)
  console.log(
    `  ${failed === 0 ? c.green : c.red}${passed}/${total - skipped} passed${c.reset}  ` +
    `${failed > 0 ? c.red : c.gray}${failed} failed${c.reset}  ` +
    `${skipped > 0 ? c.yellow : c.gray}${skipped} skipped${c.reset}`
  )
  if (failures.length) {
    console.log(`\n${c.red}Failures:${c.reset}`)
    for (const { id, label, reason } of failures)
      console.log(`  ${c.red}${id}${c.reset}  ${label}\n     ${c.red}↳${c.reset} ${reason}`)
  }
  console.log()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(err => {
  console.error(`\n${c.red}Fatal: ${err.message}${c.reset}`)
  process.exit(1)
})
