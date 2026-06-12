import type { APIRoute } from 'astro'

export const prerender = false

// Creates a Polar checkout session for the given tier and returns a redirect.
// JSON callers receive { url } instead of a redirect.
export const POST: APIRoute = async ({ request }) => {
  const accessToken = process.env.POLAR_ACCESS_TOKEN || import.meta.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'POLAR_ACCESS_TOKEN not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Accept both JSON { tier, interval } and HTML form submissions.
  const contentType = request.headers.get('content-type') ?? ''
  let tier: string
  let interval: string
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { tier?: string; interval?: string }
    tier = body.tier ?? 'professional'
    interval = body.interval ?? 'month'
  } else {
    const formData = await request.formData()
    tier = (formData.get('tier') as string) ?? 'professional'
    interval = (formData.get('interval') as string) ?? 'month'
  }

  if (tier !== 'community' && tier !== 'professional' && tier !== 'team') {
    return new Response(
      JSON.stringify({ error: `unsupported tier: ${tier}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
  // Community is a free, non-recurring product — billing interval does not apply.
  if (tier !== 'community' && interval !== 'month' && interval !== 'year') {
    return new Response(
      JSON.stringify({ error: `unsupported interval: ${interval}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Community resolves to a single free product with no interval suffix;
  // paid tiers resolve to a monthly/yearly product variant.
  const envKey =
    tier === 'community'
      ? 'POLAR_PRODUCT_ID_COMMUNITY'
      : `POLAR_PRODUCT_ID_${tier.toUpperCase()}_${interval === 'year' ? 'YEARLY' : 'MONTHLY'}`
  // process.env first — import.meta.env can carry stale/empty build-time values
  // on Vercel server runtime, and Vite cannot statically replace dynamic keys.
  const productId =
    process.env[envKey] ||
    (import.meta.env as Record<string, string | undefined>)[envKey] ||
    undefined

  if (!productId) {
    return new Response(
      JSON.stringify({ error: `${envKey} not set` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const origin = new URL(request.url).origin
  const successUrl = `${origin}/activate?success=1`

  // Polar API base — sandbox vs production. Defaults to production for back-compat.
  const polarApiBase =
    process.env.POLAR_API_BASE ||
    import.meta.env.POLAR_API_BASE ||
    'https://api.polar.sh'

  // Polar checkout session creation — https://docs.polar.sh/api/reference
  const res = await fetch(`${polarApiBase}/v1/checkouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      success_url: successUrl,
      allow_discount_codes: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[checkout] Polar API error:', res.status, err)
    return new Response(JSON.stringify({ error: 'checkout creation failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = (await res.json()) as { url: string }

  if (contentType.includes('application/json')) {
    return new Response(JSON.stringify({ url: data.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return Response.redirect(data.url, 303)
}
