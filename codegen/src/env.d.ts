/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Email
  readonly RESEND_API_KEY: string

  // Upstash Redis (Vercel Marketplace) — for rate limiting
  readonly UPSTASH_REDIS_REST_URL: string | undefined
  readonly UPSTASH_REDIS_REST_TOKEN: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
