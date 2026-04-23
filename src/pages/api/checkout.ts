import type { APIRoute } from 'astro'

export const prerender = false

// Creates a Polar checkout session for the given tier and returns a redirect.
// JSON callers receive { url } instead of a redirect.
export const POST: APIRoute = async ({ request }) => {
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'POLAR_ACCESS_TOKEN not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Accept both JSON { tier } and HTML form submissions.
  const contentType = request.headers.get('content-type') ?? ''
  let tier: string
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { tier?: string }
    tier = body.tier ?? 'professional'
  } else {
    const formData = await request.formData()
    tier = (formData.get('tier') as string) ?? 'professional'
  }

  const productId =
    tier === 'team'
      ? process.env.POLAR_PRODUCT_ID_TEAM
      : process.env.POLAR_PRODUCT_ID_PROFESSIONAL

  if (!productId) {
    return new Response(
      JSON.stringify({ error: `POLAR_PRODUCT_ID_${tier.toUpperCase()} not set` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const origin = new URL(request.url).origin
  const successUrl = `${origin}/activate?success=1`

  // Polar checkout session creation — https://docs.polar.sh/api/reference
  const res = await fetch('https://api.polar.sh/v1/checkouts/custom', {
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
