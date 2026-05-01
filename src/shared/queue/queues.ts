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
