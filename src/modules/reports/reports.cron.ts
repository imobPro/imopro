import { Worker } from 'bullmq'
import * as Sentry from '@sentry/node'
import { redisConnection } from '../../shared/queue/redis'
import { withJobMonitoring } from '../../shared/observability/sentry'
import {
  reportsQueue,
  REPORTS_QUEUE_NAME,
  type ReportsJobData,
  type ReportsJobName,
} from '../../shared/queue/queues'
import { runReportsForAllAgents } from './reports.service'
import { flagInactiveLeadsAllTenants } from '../leads/leads.service'

// Cron strings (UTC). Railway/Supabase rodam em UTC; horário comercial BR seria ~ -3h
//   monthly  : dia 1 do mês às 09:00 UTC = 06:00 BRT
//   weekly   : toda segunda às 09:00 UTC = 06:00 BRT
//   inactive : todo dia às 06:00 UTC = 03:00 BRT (baixo tráfego)
const SCHEDULES: Record<ReportsJobName, { cron: string; tz?: string }> = {
  monthly: { cron: '0 9 1 * *' },
  weekly: { cron: '0 9 * * 1' },
  'inactive-flag': { cron: '0 6 * * *' },
}

export async function registerReportsSchedules(): Promise<void> {
  for (const jobName of Object.keys(SCHEDULES) as ReportsJobName[]) {
    const { cron } = SCHEDULES[jobName]
    await reportsQueue.upsertJobScheduler(
      `schedule-${jobName}`,
      { pattern: cron },
      {
        name: jobName,
        data: { triggeredAt: new Date().toISOString() },
      }
    )
  }
  console.log('[Reports] Schedules registrados | monthly | weekly | inactive-flag')
}

export function startReportsWorker(): Worker<ReportsJobData> {
  const worker = new Worker<ReportsJobData>(
    REPORTS_QUEUE_NAME,
    async (job) =>
      withJobMonitoring(
        { queue: REPORTS_QUEUE_NAME, jobId: job.id ?? 'unknown', jobName: job.name },
        async () => {
          const start = Date.now()
          const name = job.name as ReportsJobName
          console.log(`[Reports] Job recebido | name=${name}`)

          switch (name) {
            case 'monthly':
              await runReportsForAllAgents('monthly')
              break
            case 'weekly':
              await runReportsForAllAgents('weekly')
              break
            case 'inactive-flag': {
              const result = await flagInactiveLeadsAllTenants()
              console.log(`[Reports] Inativos | tenants=${result.tenants} flagged=${result.flagged}`)
              break
            }
            default:
              throw new Error(`[Reports] Job desconhecido: ${String(name)}`)
          }

          console.log(`[Reports] Job ${name} concluído | ${Date.now() - start}ms`)
        },
      ),
    {
      connection: redisConnection,
      concurrency: 1, // Processamento serial — geração+envio podem ser caros
      lockDuration: 600_000, // 10 min: relatórios para vários tenants podem demorar
    }
  )

  // withJobMonitoring no processor já captura no Sentry; aqui só log local.
  worker.on('failed', (job, err) => {
    console.error(`[Reports] Job ${job?.name ?? '?'} falhou: ${err.message}`)
  })

  worker.on('error', (err) => {
    console.error('[Reports] Erro no worker:', err.message)
    Sentry.captureException(err, {
      tags: { queue: REPORTS_QUEUE_NAME, kind: 'worker_error' },
    })
  })

  return worker
}
