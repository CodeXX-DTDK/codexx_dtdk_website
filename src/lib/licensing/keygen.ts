// Astro+Vercel SSR: process.env is authoritative at runtime. import.meta.env
// is a build-time snapshot and can carry stale or empty values if a variable
// changed after the bundle was produced. Use `||` (not `??`) so an empty
// string in either source falls through rather than shadowing the other.
const env = (k: string): string | undefined =>
  process.env[k] || (import.meta.env as Record<string, string | undefined>)[k] || undefined

const BASE = () =>
  `${env('KEYGEN_API_BASE') ?? 'https://api.keygen.sh'}/v1/accounts/${env('KEYGEN_ACCOUNT_ID')}`

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/vnd.api+json',
    Accept: 'application/vnd.api+json',
    Authorization: `Bearer ${env('KEYGEN_TOKEN')}`,
    'Keygen-Version': '1.7',
  }
  // Required for environment-scoped tokens (env-…); 401 TOKEN_INVALID without it.
  const scope = env('KEYGEN_ENVIRONMENT')
  if (scope) headers['Keygen-Environment'] = scope
  return headers
}

export interface KeygenUser {
  id: string
  email: string
}

export interface KeygenLicense {
  id: string
  key: string
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init.headers ?? {}) },
  })
  const body = await res.json() as any
  if (!res.ok) {
    const detail = body.errors?.[0]?.detail ?? `Keygen HTTP ${res.status}`
    throw new Error(detail)
  }
  return body as T
}

export async function upsertUser(email: string): Promise<KeygenUser> {
  const fetchByEmail = () =>
    apiFetch<any>(`/users?filter[email]=${encodeURIComponent(email)}&limit=1`)

  const existing = await fetchByEmail()
  if (existing.data?.length > 0) {
    const u = existing.data[0]
    return { id: u.id as string, email: u.attributes.email as string }
  }

  try {
    const created = await apiFetch<any>('/users', {
      method: 'POST',
      body: JSON.stringify({
        data: { type: 'users', attributes: { email } },
      }),
    })
    return {
      id: created.data.id as string,
      email: created.data.attributes.email as string,
    }
  } catch (err) {
    // Race between concurrent webhook invocations, or pre-existing user from a prior
    // partially-failed run: Keygen returns 422 EMAIL_TAKEN. Re-fetch and return.
    const msg = err instanceof Error ? err.message : String(err)
    if (!/already been taken|EMAIL_TAKEN/i.test(msg)) throw err
    const retry = await fetchByEmail()
    if (retry.data?.length > 0) {
      const u = retry.data[0]
      return { id: u.id as string, email: u.attributes.email as string }
    }
    throw err
  }
}

export async function findLicenseByOrderId(
  polarOrderId: string,
): Promise<KeygenLicense | null> {
  // Keygen metadata filter: ?metadata[key]=value
  const list = await apiFetch<any>(
    `/licenses?metadata[polarOrderId]=${encodeURIComponent(polarOrderId)}&limit=1`,
  )
  if (!list.data?.length) return null
  const l = list.data[0]
  return { id: l.id as string, key: l.attributes.key as string }
}

export async function findLicenseBySubscriptionId(
  polarSubscriptionId: string,
): Promise<KeygenLicense | null> {
  const list = await apiFetch<any>(
    `/licenses?metadata[polarSubscriptionId]=${encodeURIComponent(polarSubscriptionId)}&limit=1`,
  )
  if (!list.data?.length) return null
  const l = list.data[0]
  return { id: l.id as string, key: l.attributes.key as string }
}

export async function createLicense(params: {
  policyId: string
  userId: string
  metadata: object
  maxMachines: number | null
}): Promise<KeygenLicense> {
  const attrs: Record<string, unknown> = { metadata: params.metadata }
  if (params.maxMachines != null) attrs.maxMachines = params.maxMachines

  const body = await apiFetch<any>('/licenses', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'licenses',
        attributes: attrs,
        relationships: {
          policy: { data: { type: 'policies', id: params.policyId } },
          user: { data: { type: 'users', id: params.userId } },
        },
      },
    }),
  })
  return {
    id: body.data.id as string,
    key: body.data.attributes.key as string,
  }
}

export async function suspendLicense(licenseId: string): Promise<void> {
  await apiFetch(`/licenses/${licenseId}/actions/suspend`, { method: 'POST' })
}

export async function reinstateLicense(licenseId: string): Promise<void> {
  await apiFetch(`/licenses/${licenseId}/actions/reinstate`, { method: 'POST' })
}
