# legal — legal.codexx-dtdk.com

Static, build-less Vercel project serving CodeXX DTDK legal PDFs. No web page:
`vercel.json` rewrites clean slugs to the right PDF, geo-selected by
`x-vercel-ip-country` (IT → Italian doc, everyone else → English).

## Public URLs (stable — reference these from other pages)

| Slug | Document | Aliases |
|---|---|---|
| `/eula` | EULA | |
| `/nda` | NDA | |
| `/privacy` | Privacy Policy | `/privacy-policy` |
| `/terms` | Terms of Service | `/tos` |

Slugs are stable across version bumps; the versioned PDF lives behind the
rewrite, so links never break.

The Enterprise Order Form is intentionally **not** exposed via a slug — it is
sent directly to enterprise customers during inquiry. Its PDFs still live in
`it/` and `en/` and are reachable at their direct versioned paths, so a link
can be handed out manually.

## Layout

- `it/*.pdf` — Italian documents (served when country == IT)
- `en/*.pdf` — English documents (default)
- `vercel.json` — redirects (aliases) + geo rewrites (slug → PDF)

## Vercel project setup

Separate top-level project (like `codegen` / `docsgen`):
- Root Directory: `legal`
- Framework Preset: Other (no build, no install)
- Domain: `legal.codexx-dtdk.com`

PDFs are committed as normal git blobs (not LFS — Vercel does not pull LFS).

## Bumping a document version

1. Drop the new versioned PDF into `it/` or `en/`.
2. Update that document's `destination` in `vercel.json` to the new filename.
3. Remove the superseded PDF.

The geo `has` rule must precede the English fallback for each slug (first
match wins).
