// Setup executado antes de cada arquivo de teste
// Define variáveis de ambiente dummy para que os módulos não lancem erro na importação
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.ZAPI_CLIENT_TOKEN = 'test-zapi-token'
