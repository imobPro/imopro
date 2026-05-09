import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/queue/redis', () => ({
  redisConnection: {
    set: vi.fn(),
    del: vi.fn(),
  },
}))

import { markOnce, clearOnce, runOnce, buildOnceKey } from '../shared/queue/idempotency'
import { redisConnection } from '../shared/queue/redis'

const set = redisConnection.set as ReturnType<typeof vi.fn>
const del = redisConnection.del as ReturnType<typeof vi.fn>

describe('buildOnceKey', () => {
  it('namespace once: + jobId + label', () => {
    expect(buildOnceKey('job-1', 'sendText:ai_response')).toBe('once:job-1:sendText:ai_response')
  })
})

describe('markOnce', () => {
  beforeEach(() => {
    set.mockReset()
  })

  it('retorna true e usa SET NX EX quando o slot está livre', async () => {
    set.mockResolvedValueOnce('OK')

    const claimed = await markOnce('job-1', 'ai_response')

    expect(claimed).toBe(true)
    expect(set).toHaveBeenCalledWith('once:job-1:ai_response', '1', 'EX', 86400, 'NX')
  })

  it('retorna false quando o slot já foi marcado', async () => {
    set.mockResolvedValueOnce(null)

    const claimed = await markOnce('job-1', 'ai_response')

    expect(claimed).toBe(false)
  })

  it('aceita TTL customizado', async () => {
    set.mockResolvedValueOnce('OK')

    await markOnce('job-1', 'short_ttl', 60)

    expect(set).toHaveBeenCalledWith('once:job-1:short_ttl', '1', 'EX', 60, 'NX')
  })
})

describe('clearOnce', () => {
  beforeEach(() => {
    del.mockReset()
  })

  it('remove a chave correspondente', async () => {
    del.mockResolvedValueOnce(1)
    await clearOnce('job-1', 'ai_response')
    expect(del).toHaveBeenCalledWith('once:job-1:ai_response')
  })
})

describe('runOnce', () => {
  beforeEach(() => {
    set.mockReset()
    del.mockReset()
  })

  it('executa fn e retorna { ran: true, value } quando o slot está livre', async () => {
    set.mockResolvedValueOnce('OK')
    const fn = vi.fn().mockResolvedValueOnce('ok')

    const result = await runOnce('job-1', 'ai_response', fn)

    expect(result).toEqual({ ran: true, value: 'ok' })
    expect(fn).toHaveBeenCalledOnce()
    expect(del).not.toHaveBeenCalled()
  })

  it('pula fn e retorna { ran: false } quando o slot já foi marcado', async () => {
    set.mockResolvedValueOnce(null)
    const fn = vi.fn()

    const result = await runOnce('job-1', 'ai_response', fn)

    expect(result).toEqual({ ran: false })
    expect(fn).not.toHaveBeenCalled()
  })

  it('libera a flag quando fn lança e propaga o erro', async () => {
    set.mockResolvedValueOnce('OK')
    del.mockResolvedValueOnce(1)
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom'))

    await expect(runOnce('job-1', 'ai_response', fn)).rejects.toThrow('boom')
    expect(del).toHaveBeenCalledWith('once:job-1:ai_response')
  })

  it('não relança se a liberação da flag falhar — erro original tem prioridade', async () => {
    set.mockResolvedValueOnce('OK')
    del.mockRejectedValueOnce(new Error('redis down'))
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom original'))

    await expect(runOnce('job-1', 'ai_response', fn)).rejects.toThrow('boom original')
  })

  // Regressão: o jobId precisa ser único por job BullMQ (job.id), não derivado
  // de tenant+phone. Quando era `debounce:tenant:phone` constante, a 2ª conversa
  // do mesmo lead em 24h tinha sendText pulado — lead nunca recebia resposta.
  it('isola por jobId — runs diferentes com a mesma label não compartilham flag', async () => {
    set.mockResolvedValueOnce('OK').mockResolvedValueOnce('OK')
    const fn = vi.fn().mockResolvedValue('ok')

    const a = await runOnce('job-bullmq-1', 'ai_response', fn)
    const b = await runOnce('job-bullmq-2', 'ai_response', fn)

    expect(a).toEqual({ ran: true, value: 'ok' })
    expect(b).toEqual({ ran: true, value: 'ok' })
    expect(fn).toHaveBeenCalledTimes(2)
    expect(set).toHaveBeenNthCalledWith(1, 'once:job-bullmq-1:ai_response', '1', 'EX', 86400, 'NX')
    expect(set).toHaveBeenNthCalledWith(2, 'once:job-bullmq-2:ai_response', '1', 'EX', 86400, 'NX')
  })
})
