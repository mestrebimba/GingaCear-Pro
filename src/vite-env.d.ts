/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_SCORES_WEBHOOK: string
  readonly VITE_DISCORD_REGISTRATION_WEBHOOK: string
  readonly VITE_DISCORD_ACCOUNTS_WEBHOOK: string
  readonly VITE_DISCORD_STAFF_WEBHOOK: string
  readonly GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
