import type { APIRoute } from 'astro'
import { rateLimit, clientIp } from '../../lib/rate-limit'

export const prerender = false

// Astro+Vercel SSR: env vars added after the first build may only appear via
// process.env at runtime. Read both as a safety net (matches activate.ts).
const env = (k: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[k] ?? process.env[k]

// The DTDK Manager releases repo is PRIVATE. This endpoint resolves the latest
// `stable/manager@*` GitHub Release server-side. For asset requests it
// 302-redirects the caller to GitHub's short-lived signed URL; for `meta` it
// returns the resolved tag/version as JSON (consumed by the bootstrap scripts
// so they can install without a user-supplied PAT). The PAT is used only here
// — it is never sent to the client.
const DEFAULT_REPO = 'CodeXX-DTDK/codexx_dtdk'
const CHANNEL = 'stable' // the proxy only ever serves stable manager builds

const PLATFORMS = ['linux', 'windows', 'macos'] as const
const ASSET_KINDS = ['archive', 'sha256', 'sigstore', 'meta'] as const
type Platform = (typeof PLATFORMS)[number]
type AssetKind = (typeof ASSET_KINDS)[number]

// Release archives label the arch inconsistently (linux: x86_64, windows: x64).
// Callers pass a normalized arch; each maps to the labels that may appear.
const ARCH_ALIASES: Record<string, string[]> = {
  x64: ['x64', 'x86_64', 'amd64'],
  arm64: ['arm64', 'aarch64'],
}

const DL_LIMIT = 30
const DL_WINDOW_SEC = 60

interface GhAsset {
  name: string
  url: string
}
interface GhRelease {
  tag_name: string
  draft: boolean
  assets: GhAsset[]
}

// stable/manager@X.Y.Z with an optional -rc.N / -rev.N pre-release suffix.
const TAG_RE = new RegExp(`^${CHANNEL}/manager@(\\d+)\\.(\\d+)\\.(\\d+)(?:-(rc|rev)\\.(\\d+))?$`)

// Total order over matching tags: X.Y.Z first, then bare > rev.N > rc.N at the
// same X.Y.Z. Mirrors the ranking in scripts/install.{sh,ps1}.
function rank(m: RegExpMatchArray): number {
  const [, maj, min, pat, kind, n] = m
  const extra = !kind ? 2 : kind === 'rev' ? 1 : 0
  return Number(maj) * 1e12 + Number(min) * 1e9 + Number(pat) * 1e6 + extra * 1e3 + (n ? Number(n) : 0)
}

export const GET: APIRoute = async ({ request, url }) => {
  const kind = (url.searchParams.get('asset') ?? 'archive').toLowerCase()
  if (!ASSET_KINDS.includes(kind as AssetKind)) {
    return json({ error: `unknown asset: ${kind} — expected archive | sha256 | sigstore | meta` }, 400)
  }

  // `meta` is release-wide (tag/version); a platform is only needed to locate a
  // per-platform archive asset.
  const platform = (url.searchParams.get('platform') ?? '').toLowerCase()
  if (kind !== 'meta' && !PLATFORMS.includes(platform as Platform)) {
    return json({ error: `unknown platform: ${platform || '(none)'} — expected linux | windows | macos` }, 400)
  }

  const arch = (url.searchParams.get('arch') ?? '').toLowerCase()
  if (arch && !(arch in ARCH_ALIASES)) {
    return json({ error: `unknown arch: ${arch} — expected x64 | arm64` }, 400)
  }

  const ip = clientIp(request.headers)
  const bucket = await rateLimit({
    bucket: 'download:ip',
    id: ip,
    limit: DL_LIMIT,
    windowSec: DL_WINDOW_SEC,
  })
  if (!bucket.allowed) {
    return json({ error: 'Too many requests. Please wait a moment and try again.' }, 429)
  }

  const pat = env('CODEXX_RELEASES_PAT')
  if (!pat) return json({ error: 'CODEXX_RELEASES_PAT not set' }, 500)
  const repo = env('CODEXX_RELEASES_REPO') || DEFAULT_REPO
  const apiBase = env('CODEXX_RELEASES_API_BASE') || 'https://api.github.com'

  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'codexx-dtdk-website',
  }

  // Resolve the highest stable/manager@* release. The list response embeds each
  // release's assets, so no second per-tag request is needed.
  let releases: GhRelease[]
  try {
    const res = await fetch(`${apiBase}/repos/${repo}/releases?per_page=100`, { headers: ghHeaders })
    if (!res.ok) return json({ error: `GitHub API error (${res.status}) listing releases.` }, 502)
    const body = (await res.json()) as unknown
    if (!Array.isArray(body)) return json({ error: 'Unexpected GitHub API response.' }, 502)
    releases = body as GhRelease[]
  } catch {
    return json({ error: 'Could not reach GitHub.' }, 502)
  }

  let best: { rel: GhRelease; r: number } | null = null
  for (const rel of releases) {
    if (rel.draft) continue
    const m = rel.tag_name.match(TAG_RE)
    if (!m) continue
    const r = rank(m)
    if (!best || r > best.r) best = { rel, r }
  }
  if (!best) return json({ error: `No ${CHANNEL}/manager release has been published yet.` }, 404)

  // meta: the resolved release identity, for the bootstrap scripts.
  if (kind === 'meta') {
    return json({
      channel: CHANNEL,
      tag: best.rel.tag_name,
      version: best.rel.tag_name.split('@').pop() ?? '',
    })
  }

  // Locate the per-platform archive. Asset schema (ADR-037 §2) is
  // codexx_dtdk_manager-<version>-<platform>-<arch>.<ext>; match platform +
  // extension, and the arch token only when an arch was requested.
  const archPart = arch ? `(?:${ARCH_ALIASES[arch].join('|')})` : '[^.]+'
  const archiveRe = new RegExp(`^codexx_dtdk_manager-.*-${platform}-${archPart}\\.(?:tar\\.gz|zip)$`)
  const archive = best.rel.assets.find((a) => archiveRe.test(a.name))
  if (!archive) {
    return json(
      { error: `No DTDK Manager build for ${platform}${arch ? `/${arch}` : ''} in ${best.rel.tag_name}.` },
      404,
    )
  }

  const wantName =
    kind === 'sha256' ? `${archive.name}.sha256` : kind === 'sigstore' ? `${archive.name}.sigstore` : archive.name
  const asset = best.rel.assets.find((a) => a.name === wantName)
  if (!asset) return json({ error: `Asset ${wantName} not found in ${best.rel.tag_name}.` }, 404)

  // Ask GitHub for the asset bytes; with redirect:'manual' we capture the 302
  // to the signed CDN URL and bounce the caller straight there.
  let assetRes: Response
  try {
    assetRes = await fetch(asset.url, {
      headers: { ...ghHeaders, Accept: 'application/octet-stream' },
      redirect: 'manual',
    })
  } catch {
    return json({ error: 'Could not reach GitHub asset storage.' }, 502)
  }

  const location = assetRes.headers.get('location')
  if ([301, 302, 303, 307, 308].includes(assetRes.status) && location) {
    return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } })
  }

  // Fallback: GitHub streamed the bytes directly (no redirect) — proxy them.
  if (assetRes.ok && assetRes.body) {
    return new Response(assetRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${wantName}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  return json({ error: `GitHub asset fetch failed (${assetRes.status}).` }, 502)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
