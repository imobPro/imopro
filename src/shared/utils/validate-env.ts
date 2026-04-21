const REQUIRED_VARS: string[] = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'REDIS_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'ZAPI_CLIENT_TOKEN',
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
