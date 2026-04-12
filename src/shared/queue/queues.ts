import { Queue } from 'bullmq'
import { redisConnection } from './redis'
import type { WhatsAppMessageJob } from './queue.types'

export const WHATSAPP_QUEUE_NAME = 'whatsapp-messages'

export const whatsappQueue = new Queue<WhatsAppMessageJob>(WHATSAPP_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s → 2s → 4s
    },
    removeOnComplete: 100, // mantém os últimos 100 jobs concluídos
    removeOnFail: 500,     // mantém os últimos 500 jobs com falha para diagnóstico
  },
})
