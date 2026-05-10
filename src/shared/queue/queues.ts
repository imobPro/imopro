import { Queue } from 'bullmq'
import { redisConnection } from './redis'
import type { WhatsAppMessageJob } from './queue.types'

export const WHATSAPP_QUEUE_NAME = 'whatsapp-messages'

export const whatsappQueue = new Queue<WhatsAppMessageJob>(WHATSAPP_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // attempts=3 com backoff exponencial. Cada side effect não-idempotente do
    // worker (zapi.sendText e scoreUp) é envolto em runOnce(jobId, label) para
    // que retries após stalled detection não dupliquem envio nem score.
    // Defesas em camadas: dedup pré-fila por messageId (controller) + flags
    // por (jobId, label) no Redis + UNIQUE(zapi_message_id) na tabela messages.
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 }, // 30s → 1min → 2min
    removeOnComplete: 100, // mantém os últimos 100 jobs concluídos
    removeOnFail: 500,     // mantém os últimos 500 jobs com falha para diagnóstico
  },
})

// -----------------------------------------------------------------------------
// Fila de relatórios automáticos (Sprint 7)
// -----------------------------------------------------------------------------

export const REPORTS_QUEUE_NAME = 'reports'

export type ReportsJobName = 'monthly' | 'weekly' | 'inactive-flag'

export interface ReportsJobData {
  triggeredAt: string // ISO timestamp pra logs/idempotência
}

// NameType deixado como string default: o id do scheduler ('schedule-monthly')
// não bate com ReportsJobName ('monthly'). O Worker faz cast no switch.
export const reportsQueue = new Queue<ReportsJobData>(REPORTS_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // Cada handler é idempotente (upsert por unique key + skip se sent_at), então retry é seguro
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 }, // 1min → 2min → 4min
    removeOnComplete: 50,
    removeOnFail: 200,
  },
})

// -----------------------------------------------------------------------------
// Fila de billing (Fase 3) — cron diário de expiração de trials
// -----------------------------------------------------------------------------

export const BILLING_QUEUE_NAME = 'billing-cron'

export type BillingJobName = 'expire-trials'

export interface BillingJobData {
  triggeredAt: string
}

export const billingQueue = new Queue<BillingJobData>(BILLING_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // expireTrialsByTime é idempotente (UPDATE WHERE status='trial' AND ends_at < now),
    // retry seguro
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
})
