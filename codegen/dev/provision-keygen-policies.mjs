/**
 * One-time script: creates the 3 Keygen policies required by the fulfillment function.
 * Run once against your Keygen sandbox, copy the printed policy IDs into .env.
 *
 * Usage:
 *   KEYGEN_ACCOUNT_ID=xxx KEYGEN_ADMIN_TOKEN=yyy node dev/provision-keygen-policies.mjs
 */

const BASE = `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}`
const HEADERS = {
  'Content-Type': 'application/vnd.api+json',
  Accept: 'application/vnd.api+json',
  Authorization: `Bearer ${process.env.KEYGEN_ADMIN_TOKEN}`,
  'Keygen-Version': '1.7',
}

async function createPolicy(name, attrs) {
  const res = await fetch(`${BASE}/policies`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      data: {
        type: 'policies',
        attributes: { name, ...attrs },
      },
    }),
  })
  const body = await res.json()
  if (!res.ok) {
    console.error(`Failed to create ${name}:`, body.errors?.[0]?.detail)
    return null
  }
  return body.data.id
}

const policies = [
  [
    'codegen-community',
    {
      duration: null,       // perpetual
      maxMachines: null,    // unlimited
      floating: true,
      strict: false,
      authenticationStrategy: 'LICENSE',
      expirationStrategy: 'MAINTAIN_ACCESS',
      scheme: 'ED25519_SIGN',
    },
  ],
  [
    'codegen-professional',
    {
      duration: null,       // subscription managed by Polar (we suspend/reinstate)
      maxMachines: 5,
      floating: true,
      strict: true,
      authenticationStrategy: 'LICENSE',
      expirationStrategy: 'RESTRICT_ACCESS',
      scheme: 'ED25519_SIGN',
    },
  ],
  [
    'codegen-team',
    {
      duration: null,
      maxMachines: 5,       // per seat
      floating: true,
      strict: true,
      authenticationStrategy: 'LICENSE',
      expirationStrategy: 'RESTRICT_ACCESS',
      scheme: 'ED25519_SIGN',
    },
  ],
]

console.log('Provisioning Keygen policies...\n')
for (const [name, attrs] of policies) {
  const id = await createPolicy(name, attrs)
  if (id) console.log(`${name}: ${id}`)
}
console.log('\nAdd these IDs to your .env as KEYGEN_POLICY_ID_COMMUNITY / _PROFESSIONAL / _TEAM')
