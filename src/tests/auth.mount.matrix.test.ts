import { describe, it, expect, vi } from 'vitest'

// -----------------------------------------------------------------------------
// P3 — trava T3 do CLAUDE.md traduzida para o produto atual (sem sistema de
// roles). Este teste roda os routers REAIS montados como em src/index.ts e
// prova que toda rota /api/* devolve 401 MISSING_AUTH para request sem
// Authorization header.
//
// O que este teste protege:
//   - Alguém adicionar uma rota nova sob /api/* e esquecer de aplicar
//     requireAuth (no app.use ou por rota, como o onboarding faz).
//   - Alguém remover o requireAuth do bloco `/api/onboarding` seletivamente
//     e deixar uma rota autenticada exposta.
//   - Regressão que troque MISSING_AUTH por algo distinto para uma rota só.
//
// A rota pública POST /api/onboarding/signup fica FORA da matriz — é a única
// exceção documentada em src/index.ts:55-58. Se um dia essa rota deixar de
// ser pública, este teste continua verde (sinal certo, não vaza).
//
// Mocks: seguimos o padrão de webhook-secret.test.ts — mockar apenas as
// dependências transitivas que fazem I/O na importação dos módulos. O
// middleware requireAuth falha ANTES de qualquer chamada externa (checa
// header primeiro), então não precisamos mockar jose/JWKS.
// -----------------------------------------------------------------------------

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { admin: { createUser: vi.fn(), deleteUser: vi.fn(), getUserById: vi.fn() } }, storage: { from: vi.fn() } },
}))

vi.mock('../shared/queue/redis', () => ({
  redisConnection: { set: vi.fn(), del: vi.fn(), rpush: vi.fn(), expire: vi.fn(), get: vi.fn() },
}))

vi.mock('../shared/queue/queues', () => ({
  whatsappQueue: { add: vi.fn().mockResolvedValue({}) },
  reportsQueue: { add: vi.fn().mockResolvedValue({}) },
  billingQueue: { add: vi.fn().mockResolvedValue({}) },
  WHATSAPP_QUEUE_NAME: 'whatsapp-messages',
  REPORTS_QUEUE_NAME: 'reports',
  BILLING_QUEUE_NAME: 'billing',
}))

vi.mock('../shared/observability/sentry', () => ({
  captureSilentError: vi.fn(),
  addExternalCallBreadcrumb: vi.fn(),
  withJobMonitoring: vi.fn(),
}))

vi.mock('../shared/email/email.service', () => ({
  sendSignupWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))

import express, { type Express } from 'express'
import request from 'supertest'
import { requireAuth } from '../shared/middleware/auth'
import { authRouter } from '../modules/auth'
import { onboardingRouter } from '../modules/onboarding'
import { reportsRouter } from '../modules/reports'
import { tenantSettingsRouter } from '../modules/tenant-settings'
import { billingRouter } from '../modules/billing'

// Reproduz os mounts de src/index.ts, sem workers/schedules/rate-limit — só o
// que importa para provar a trava de auth. Se você mexer em src/index.ts,
// atualize aqui também (deliberadamente duplicado para o teste ser autônomo).
function buildApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/onboarding', onboardingRouter)
  app.use('/api', requireAuth, authRouter)
  app.use('/api/reports', requireAuth, reportsRouter)
  app.use('/api/settings', requireAuth, tenantSettingsRouter)
  app.use('/api/subscription', requireAuth, billingRouter)
  return app
}

// Matriz de rotas que DEVEM exigir token. Derivada dos routers em:
//   - modules/auth/auth.routes.ts
//   - modules/onboarding/onboarding.routes.ts (apenas as auth-required)
//   - modules/reports/reports.routes.ts
//   - modules/tenant-settings/tenant-settings.routes.ts
//   - modules/billing/billing.routes.ts
// Se alguém adicionar rota nova sob /api/*, adicionar aqui — o teste é a
// documentação viva da superfície de API autenticada.
const AUTHENTICATED_ROUTES: ReadonlyArray<readonly ['get' | 'post' | 'patch' | 'put' | 'delete', string]> = [
  ['get', '/api/me'],
  ['post', '/api/onboarding/provision-zapi'],
  ['get', '/api/onboarding/connection'],
  ['get', '/api/reports'],
  ['get', '/api/reports/some-report-id/download'],
  ['get', '/api/settings'],
  ['patch', '/api/settings/tenant'],
  ['patch', '/api/settings/visibility'],
  ['patch', '/api/settings/my-phone'],
  ['get', '/api/subscription'],
  ['post', '/api/subscription/activate'],
]

// Rotas explicitamente públicas — não devem entrar na matriz acima e o teste
// abaixo prova que elas seguem acessíveis sem token. Se um dia deixarem de
// ser públicas, mover para AUTHENTICATED_ROUTES.
const PUBLIC_ROUTES: ReadonlyArray<readonly ['post', string]> = [
  ['post', '/api/onboarding/signup'],
]

describe('P3 — toda rota /api/* protegida exige token (matriz de mount)', () => {
  const app = buildApp()

  it.each(AUTHENTICATED_ROUTES)(
    '%s %s sem Authorization → 401 MISSING_AUTH',
    async (method, path) => {
      const res = await request(app)[method](path).send({})
      expect(res.status).toBe(401)
      expect(res.body).toEqual({
        error: { code: 'MISSING_AUTH', message: 'Authorization header ausente ou inválido' },
      })
    },
  )
})

describe('P3 — rotas públicas continuam acessíveis sem token', () => {
  const app = buildApp()

  it.each(PUBLIC_ROUTES)('%s %s não deve retornar MISSING_AUTH', async (method, path) => {
    // Payload deliberadamente inválido — não queremos exercitar a lógica de
    // signup aqui, só provar que a rota chegou no controller (e não foi
    // barrada por requireAuth). O 401 MISSING_AUTH seria bug; qualquer
    // outra resposta (incluindo 400 de validação) prova que a rota é pública.
    const res = await request(app)[method](path).send({})
    if (res.status === 401) {
      const body = res.body as { error?: { code?: string } }
      expect(body.error?.code).not.toBe('MISSING_AUTH')
    }
  })
})
