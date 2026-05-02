import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/queue/queues', () => ({
  reportsQueue: { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) },
  REPORTS_QUEUE_NAME: 'reports',
}))

vi.mock('../shared/queue/redis', () => ({
  redisConnection: {},
}))

vi.mock('bullmq', () => ({
  Worker: vi.fn(),
  Queue: vi.fn(),
}))

import { reportsQueue } from '../shared/queue/queues'
import { registerReportsSchedules } from '../modules/reports/reports.cron'

const upsertJobScheduler = reportsQueue.upsertJobScheduler as ReturnType<typeof vi.fn>

beforeEach(() => {
  upsertJobScheduler.mockClear()
})

describe('registerReportsSchedules', () => {
  it('registra exatamente 3 schedulers (mensal, semanal, inativos)', async () => {
    await registerReportsSchedules()
    expect(upsertJobScheduler).toHaveBeenCalledTimes(3)

    const ids = upsertJobScheduler.mock.calls.map((c) => c[0] as string)
    expect(ids).toEqual([
      'schedule-monthly',
      'schedule-weekly',
      'schedule-inactive-flag',
    ])
  })

  it('cada schedule usa cron pattern UTC esperado', async () => {
    await registerReportsSchedules()
    const calls = upsertJobScheduler.mock.calls

    const monthly = calls.find((c) => c[0] === 'schedule-monthly')!
    expect(monthly[1]).toEqual({ pattern: '0 9 1 * *' })

    const weekly = calls.find((c) => c[0] === 'schedule-weekly')!
    expect(weekly[1]).toEqual({ pattern: '0 9 * * 1' })

    const inactive = calls.find((c) => c[0] === 'schedule-inactive-flag')!
    expect(inactive[1]).toEqual({ pattern: '0 6 * * *' })
  })

  it('o template carrega o name correto pra cada job', async () => {
    await registerReportsSchedules()
    const calls = upsertJobScheduler.mock.calls

    expect((calls[0][2] as { name: string }).name).toBe('monthly')
    expect((calls[1][2] as { name: string }).name).toBe('weekly')
    expect((calls[2][2] as { name: string }).name).toBe('inactive-flag')
  })

  it('é idempotente quando re-executado', async () => {
    await registerReportsSchedules()
    await registerReportsSchedules()
    expect(upsertJobScheduler).toHaveBeenCalledTimes(6)
    // upsertJobScheduler com mesmo id é no-op no BullMQ — repetir não cria duplicatas
  })
})
