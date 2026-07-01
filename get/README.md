# get — get.codexx-dtdk.com

The CodeXX DTDK **distribution surface**. A dedicated Vercel project, split out
from `landing` so the installer and its download proxy deploy on their own
cadence — a marketing redeploy can never affect `curl | bash`, and vice versa.

Hosts two things:

1. **Bootstrap installers** (static, `public/`) — the canonical, byte-authoritative
   copies. There is no copy elsewhere; edit them here.
   - `install.sh` / `install.ps1`
   - `uninstall.sh` / `uninstall.ps1`
2. **Download proxy** (SSR, `src/pages/api/download.ts`, `prerender=false`) — the
   DTDK Manager releases repo is **private**; this endpoint resolves the latest
   `stable/manager@*` GitHub Release server-side using a read-only PAT and
   302-redirects the caller to GitHub's short-lived signed URL (or returns the
   resolved tag as JSON for `asset=meta`). The PAT never reaches the client. The
   bootstrap scripts call `${proxy}/api/download?...`, where `proxy` defaults to
   `https://get.codexx-dtdk.com` (this host) and is overridable via
   `--proxy` / `$CODEXX_DOWNLOAD_PROXY`.

## Public URLs (stable — reference these from docs)

| URL | Purpose |
|---|---|
| `https://get.codexx-dtdk.com/install.sh` | POSIX installer (`curl … \| bash`) |
| `https://get.codexx-dtdk.com/install.ps1` | Windows installer |
| `https://get.codexx-dtdk.com/uninstall.sh` | POSIX uninstaller |
| `https://get.codexx-dtdk.com/uninstall.ps1` | Windows uninstaller |
| `https://get.codexx-dtdk.com/api/download?asset=meta` | Resolved manager tag/version (JSON) |
| `https://get.codexx-dtdk.com/api/download?...&asset=archive` | 302 → signed release archive URL |

`.sh`/`.ps1` are served as `text/plain` (readable in a browser) with a short
cache; see `vercel.json`.

## Resolution algorithm — keep in sync (ADR-038 §5b)

The "which tag is latest" ranking MUST stay byte-equivalent across:

- `public/install.{sh,ps1}` (in this package)
- `src/pages/api/download.ts` (in this package)
- `libs/updater/src/github_client.cpp` (main repo)

## Vercel project setup

Separate top-level project (like `codegen` / `docsgen` / `legal`):

- **Root Directory:** `get`
- **Framework Preset:** Astro
- **Domain:** `get.codexx-dtdk.com`

### Environment variables

| Var | Required | Purpose |
|---|---|---|
| `CODEXX_RELEASES_PAT` | **yes** | Read-only PAT for the private releases repo. Server-side only. |
| `CODEXX_RELEASES_REPO` | no | Override releases repo (default `CodeXX-DTDK/codexx_dtdk`). |
| `CODEXX_RELEASES_API_BASE` | no | Override GitHub API base (default `https://api.github.com`). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | no | Rate-limiting for `/api/download`. Missing → fails open. |

Without `CODEXX_RELEASES_PAT` the proxy cannot resolve releases; the static
installers still serve, but `asset` requests fail.
