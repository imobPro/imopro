import { Queue } from 'bullmq'
import { redisConnection } from './redis'
import type { WhatsAppMessageJob } from './queue.types'

export const WHATSAPP_QUEUE_NAME = 'whatsapp-messages'

export const whatsappQueue = new Queue<WhatsAppMessageJob>(WHATSAPP_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // attempts=1 para evitar reenvio duplicado ao lead caso o job falhe após zapi.sendText.
    // Idempotência ainda não está garantida no pipeline; retry só será reativado quando houver flag de mensagem entregue.
    attempts: 1,
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
