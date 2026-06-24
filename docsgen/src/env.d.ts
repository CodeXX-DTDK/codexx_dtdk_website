/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Optional doc-chat pane (off unless PAGE_DOC_CHAT_ENABLED=1 at build time).
  readonly PUBLIC_DOC_CHAT_PROVIDER: 'openai' | 'claude' | 'gemini' | undefined
  readonly PUBLIC_DOC_CHAT_MODEL: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
