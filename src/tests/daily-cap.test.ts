import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('../shared/queue/redis', () => ({
  redisConnection: {
    incr: vi.fn(),
    expire: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('../shared/queue/queues', () => ({
  whatsappQueue: { add: vi.fn() },
  WHATSAPP_QUEUE_NAME: 'whatsapp-messages',
}))

import { redisConnection } from '../shared/queue/redis'
import {
  incrementDailyLeadMessageCount,
  getDailyMessageCapPerLead,
} from '../modules/whatsapp/whatsapp.service'

const incrMock = redisConnection.incr as ReturnType<typeof vi.fn>
const expireMock = redisConnection.expire as ReturnType<typeof vi.fn>

const ORIG_CAP = process.env.DAILY_MESSAGE_CAP_PER_LEAD

beforeEach(() => {
  incrMock.mockReset()
  expireMock.mockReset()
})

afterEach(() => {
  if (ORIG_CAP === undefined) delete process.env.DAILY_MESSAGE_CAP_PER_LEAD
  else process.env.DAILY_MESSAGE_CAP_PER_LEAD = ORIG_CAP
})

describe('incrementDailyLeadMessageCount', () => {
  it('primeira mensagem do dia dispara EXPIRE de 24h', async () => {
    incrMock.mockResolvedValueOnce(1)

    const count = await incrementDailyLeadMessageCount('t-1', '5521999999999')

    expect(count).toBe(1)
    expect(incrMock).toHaveBeenCalledWith('daily_msg:t-1:5521999999999')
    expect(expireMock).toHaveBeenCalledWith('daily_msg:t-1:5521999999999', 24 * 60 * 60)
  })

  it('mensagens subsequentes NÃO renovam o TTL — janela é fixa desde a primeira', async () => {
    incrMock.mockResolvedValueOnce(2)

    const count = await incrementDailyLeadMessageCount('t-1', '5521999999999')

    expect(count).toBe(2)
    expect(expireMock).not.toHaveBeenCalled()
  })

  it('chave é escopada por (tenant, phone) — leads diferentes não interferem', async () => {
    incrMock.mockResolvedValueOnce(1)
    await incrementDailyLeadMessageCount('t-1', '5521888887777')
    expect(incrMock).toHaveBeenCalledWith('daily_msg:t-1:5521888887777')

    incrMock.mockResolvedValueOnce(1)
    await incrementDailyLeadMessageCount('t-2', '5521888887777')
    expect(incrMock).toHaveBeenLastCalledWith('daily_msg:t-2:5521888887777')
  })
})

describe('getDailyMessageCapPerLead', () => {
  it('default de 100 quando env var não setada', () => {
    delete process.env.DAILY_MESSAGE_CAP_PER_LEAD
    expect(getDailyMessageCapPerLead()).toBe(100)
  })

  it('respeita valor válido da env var', () => {
    process.env.DAILY_MESSAGE_CAP_PER_LEAD = '250'
    expect(getDailyMessageCapPerLead()).toBe(250)
  })

  it('ignora valor inválido e volta pro default (não deixar cap=0 acidentalmente)', () => {
    process.env.DAILY_MESSAGE_CAP_PER_LEAD = 'abc'
    expect(getDailyMessageCapPerLead()).toBe(100)

    process.env.DAILY_MESSAGE_CAP_PER_LEAD = '0'
    expect(getDailyMessageCapPerLead()).toBe(100)

    process.env.DAILY_MESSAGE_CAP_PER_LEAD = '-5'
    expect(getDailyMessageCapPerLead()).toBe(100)
  })
})
