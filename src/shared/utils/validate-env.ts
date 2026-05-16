// SUPABASE_JWT_SECRET removido: auth.ts agora usa JWKS (chaves assimétricas
// do Supabase via /auth/v1/.well-known/jwks.json). O segredo HMAC não é mais
// usado pelo backend.
const REQUIRED_VARS: string[] = [
  'ANTHROPIC_API_KEY',
  'REDIS_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ZAPI_CLIENT_TOKEN',
]

// Opcionais por enquanto — feature é desabilitada quando a chave falta.
// Quando todas as features entrarem em prod, mover para REQUIRED_VARS.
//
// OPENAI_API_KEY: transcrição de áudio (Whisper). Áudios chegam como fallback
//   de texto quando ausente.
// RESEND_API_KEY / RESEND_FROM_EMAIL: envio dos relatórios mensais por e-mail.
//   Cron continua rodando e gerando o PDF; o passo de envio falha com warning.
// ZAPI_ACCOUNT_TOKEN / BACKEND_PUBLIC_URL: provisionamento de instância Z-API no
//   onboarding (POST /api/onboarding/provision-zapi). Sem eles a rota responde
//   500 SERVER_MISCONFIGURED; o restante do sistema (piloto manual) segue normal.
// SENTRY_DSN: relatórios de erro. Ausente em dev local; configurar em produção.
const OPTIONAL_VARS: string[] = [
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'ZAPI_ACCOUNT_TOKEN',
  'BACKEND_PUBLIC_URL',
  'SENTRY_DSN',
]

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error('[Env] Variáveis de ambiente obrigatórias não definidas:')
    missing.forEach((key) => console.error(`  - ${key}`))
    process.exit(1)
  }

  const missingOptional = OPTIONAL_VARS.filter((key) => !process.env[key])
  if (missingOptional.length > 0) {
    console.warn('[Env] Variáveis opcionais ausentes (features desabilitadas):')
    missingOptional.forEach((key) => console.warn(`  - ${key}`))
  }

  console.log('[Env] Todas as variáveis obrigatórias estão definidas.')
}
