import { describe, it, expect, vi, beforeEach } from 'vitest'

// -----------------------------------------------------------------------------
// Guarda de segurança — autenticação do webhook Z-API por :secret no path.
// -----------------------------------------------------------------------------
//
// Este arquivo testa o middleware requireWebhookSecret e a checagem de
// spoofing no receiveWebhook. Cobre 4 caminhos:
//
//   1. Sem :secret → 401 (rota nova só existe com o path param)
//   2. Secret desconhecido → 401
//   3. Secret válido do tenant B + instanceId spoofado do tenant A → 401
//      (defense in depth: quem tem secret válido não pode se passar por
//      outro tenant no payload)
//   4. Secret válido do tenant + instanceId batendo → 200 + enfileirado
//
// Se algum destes quebrar, a auth do webhook regrediu e alguém que descubra
// um instanceId volta a conseguir injetar mensagens falsas. NÃO afrouxar
// asserções — se o comportamento mudou, discutir o design.
// -----------------------------------------------------------------------------

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('../shared/queue/redis', () => ({
  redisConnection: { set: vi.fn(), del: vi.fn(), rpush: vi.fn(), expire: vi.fn() },
}))

vi.mock('../shared/queue/queues', () => ({
  whatsappQueue: { add: vi.fn().mockResolvedValue({}) },
  WHATSAPP_QUEUE_NAME: 'whatsapp-messages',
}))

vi.mock('../shared/observability/sentry', () => ({
  captureSilentError: vi.fn(),
  addExternalCallBreadcrumb: vi.fn(),
  withJobMonitoring: vi.fn(),
}))

import express, { type Express } from 'express'
import request from 'supertest'
import { supabase } from '../shared/database/supabase'
import { redisConnection } from '../shared/queue/redis'
import { whatsappQueue } from '../shared/queue/queues'
import { whatsappRouter } from '../modules/whatsapp/whatsapp.routes'
import { queueFromResponses } from './helpers/supabase-mock'

const fromMock = supabase.from as ReturnType<typeof vi.fn>
const queueAddMock = whatsappQueue.add as ReturnType<typeof vi.fn>
const redisSetMock = redisConnection.set as ReturnType<typeof vi.fn>

function buildApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/webhook', whatsappRouter)
  return app
}

function validPayload(instanceId: string, messageId = `msg-${Math.random().toString(36).slice(2)}`) {
  return {
    instanceId,
    messageId,
    phone: '5521999999999',
    fromMe: false,
    momment: Date.now(),
    status: 'RECEIVED',
    isGroup: false,
    text: { message: 'oi' },
  }
}

beforeEach(() => {
  fromMock.mockReset()
  queueAddMock.mockReset().mockResolvedValue({})
  redisSetMock.mockReset().mockResolvedValue('OK')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /webhook/whatsapp/:secret — auth por secret', () => {
  const TENANT_A = 'tenant-a'
  const INSTANCE_A = 'inst-a'
  const SECRET_A = 'a'.repeat(64) // 64 hex chars como o backfill gera
  const TENANT_B = 'tenant-b'
  const INSTANCE_B = 'inst-b'
  const SECRET_B = 'b'.repeat(64)

  it('rejeita 401 quando :secret não existe no banco', async () => {
    queueFromResponses(fromMock, [{ data: null, error: null }])
    const app = buildApp()

    const res = await request(app)
      .post(`/webhook/whatsapp/${'x'.repeat(64)}`)
      .send(validPayload(INSTANCE_A))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: { code: 'INVALID_WEBHOOK_SECRET' } })
    expect(queueAddMock).not.toHaveBeenCalled()
  })

  it('rejeita 401 quando :secret é curto demais (nem chega no banco)', async () => {
    const app = buildApp()
    const res = await request(app).post('/webhook/whatsapp/curto').send(validPayload(INSTANCE_A))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: { code: 'INVALID_WEBHOOK_SECRET' } })
    expect(fromMock).not.toHaveBeenCalled()
    expect(queueAddMock).not.toHaveBeenCalled()
  })

  it('rejeita 401 com secret válido de B mas instanceId spoofado de A (defense in depth)', async () => {
    // Middleware resolve tenant=B a partir de SECRET_B; payload traz INSTANCE_A.
    // O controller precisa comparar contra tenant.zapiInstanceId e recusar.
    queueFromResponses(fromMock, [
      { data: { id: TENANT_B, zapi_instance_id: INSTANCE_B }, error: null },
    ])
    const app = buildApp()

    const res = await request(app)
      .post(`/webhook/whatsapp/${SECRET_B}`)
      .send(validPayload(INSTANCE_A))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: { code: 'INSTANCE_MISMATCH' } })
    expect(queueAddMock).not.toHaveBeenCalled()
  })

  it('aceita 200 e enfileira com tenantId correto quando secret e instanceId batem', async () => {
    queueFromResponses(fromMock, [
      { data: { id: TENANT_A, zapi_instance_id: INSTANCE_A }, error: null },
    ])
    const app = buildApp()

    const res = await request(app)
      .post(`/webhook/whatsapp/${SECRET_A}`)
      .send(validPayload(INSTANCE_A))

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ received: true, action: 'queued' })

    // O job precisa ter sido enfileirado com o tenantId do middleware,
    // não com um valor derivado do payload
    expect(queueAddMock).toHaveBeenCalledTimes(1)
    const [, jobData] = queueAddMock.mock.calls[0]
    expect(jobData).toMatchObject({ tenantId: TENANT_A, instanceId: INSTANCE_A })
  })
})
