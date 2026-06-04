import { Worker } from 'bullmq'
import * as Sentry from '@sentry/node'
import { redisConnection } from '../../shared/queue/redis'
import { withJobMonitoring } from '../../shared/observability/sentry'
import {
  billingQueue,
  BILLING_QUEUE_NAME,
  type BillingJobData,
  type BillingJobName,
} from '../../shared/queue/queues'
import { expireTrialsByTime } from './billing.service'

// Cron string (UTC). Roda 1x por dia às 05:00 UTC = 02:00 BRT (baixo tráfego).
const SCHEDULES: Record<BillingJobName, { cron: string }> = {
  'expire-trials': { cron: '0 5 * * *' },
}

export async function registerBillingSchedules(): Promise<void> {
  for (const jobName of Object.keys(SCHEDULES) as BillingJobName[]) {
    const { cron } = SCHEDULES[jobName]
    await billingQueue.upsertJobScheduler(
      `schedule-${jobName}`,
      { pattern: cron },
      {
        name: jobName,
        data: { triggeredAt: new Date().toISOString() },
      },
    )
  }
  console.log('[Billing] Schedules registrados | expire-trials')
}

export function startBillingWorker(): Worker<BillingJobData> {
  const worker = new Worker<BillingJobData>(
    BILLING_QUEUE_NAME,
    async (job) =>
      withJobMonitoring(
        { queue: BILLING_QUEUE_NAME, jobId: job.id ?? 'unknown', jobName: job.name },
        async () => {
          const start = Date.now()
          const name = job.name as BillingJobName
          console.log(`[Billing] Job recebido | name=${name}`)

          switch (name) {
            case 'expire-trials': {
              const expired = await expireTrialsByTime()
              console.log(`[Billing] Trials expirados por prazo | count=${expired}`)
              break
            }
            default:
              throw new Error(`[Billing] Job desconhecido: ${String(name)}`)
          }

          console.log(`[Billing] Job ${name} concluído | ${Date.now() - start}ms`)
        },
      ),
    {
      connection: redisConnection,
      concurrency: 1,
      lockDuration: 120_000,
    },
  )

  // withJobMonitoring no processor já captura no Sentry; aqui só log local.
  worker.on('failed', (job, err) => {
    console.error(`[Billing] Job ${job?.name ?? '?'} falhou: ${err.message}`)
  })

  worker.on('error', (err) => {
    console.error('[Billing] Erro no worker:', err.message)
    Sentry.captureException(err, {
      tags: { queue: BILLING_QUEUE_NAME, kind: 'worker_error' },
    })
  })

  return worker
}
