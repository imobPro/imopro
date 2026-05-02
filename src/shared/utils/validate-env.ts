// SUPABASE_JWT_SECRET removido: auth.ts agora usa JWKS (chaves assimétricas
// do Supabase via /auth/v1/.well-known/jwks.json). O segredo HMAC não é mais
// usado pelo backend.
const REQUIRED_VARS: string[] = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'REDIS_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ZAPI_CLIENT_TOKEN',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
]

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error('[Env] Variáveis de ambiente obrigatórias não definidas:')
    missing.forEach((key) => console.error(`  - ${key}`))
    process.exit(1)
  }

  console.log('[Env] Todas as variáveis obrigatórias estão definidas.')
}
