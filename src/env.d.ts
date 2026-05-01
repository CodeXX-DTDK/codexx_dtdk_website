/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Keygen
  readonly KEYGEN_ACCOUNT_ID: string
  readonly KEYGEN_TOKEN: string
  readonly KEYGEN_ENVIRONMENT: string | undefined
  readonly KEYGEN_API_BASE: string | undefined
  readonly KEYGEN_POLICY_ID_COMMUNITY: string
  readonly KEYGEN_POLICY_ID_PROFESSIONAL: string
  readonly KEYGEN_POLICY_ID_TEAM: string

  // Email
  readonly RESEND_API_KEY: string

  // Polar
  readonly POLAR_WEBHOOK_SECRET: string
  readonly POLAR_ACCESS_TOKEN: string
  readonly POLAR_API_BASE: string | undefined
  readonly POLAR_PRODUCT_ID_PROFESSIONAL: string
  readonly POLAR_PRODUCT_ID_TEAM: string

  // Upstash Redis (Vercel Marketplace) — for rate limiting
  readonly UPSTASH_REDIS_REST_URL: string | undefined
  readonly UPSTASH_REDIS_REST_TOKEN: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
