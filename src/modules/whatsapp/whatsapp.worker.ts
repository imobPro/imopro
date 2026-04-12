import { Worker } from 'bullmq'
import { redisConnection } from '../../shared/queue/redis'
import { WHATSAPP_QUEUE_NAME } from '../../shared/queue/queues'
import { isWithinBusinessHours } from '../../shared/utils/business-hours'
import {
  detectLeadProfile,
  shouldTransferToHuman,
  getBusinessHoursMessage,
  buildZApiClient,
} from './whatsapp.service'
import type { WhatsAppMessageJob } from '../../shared/queue/queue.types'
import type { ConversationContext } from './whatsapp.types'

export function startWhatsAppWorker(): Worker<WhatsAppMessageJob> {
  const worker = new Worker<WhatsAppMessageJob>(
    WHATSAPP_QUEUE_NAME,
    async (job) => {
      const data = job.data

      console.log(`[Worker] Processando mensagem | tenant=${data.tenantId} phone=${data.phone} type=${data.type}`)

      // 1. Verificar horário comercial
      const withinHours = isWithinBusinessHours()

      // 2. Montar contexto da conversa para avaliação de transferência
      // Sprint 3 buscará dados reais do banco — por ora usa valores do job
      const context: ConversationContext = {
        tenantId: data.tenantId,
        phone: data.phone,
        messageCount: 1,       // Sprint 3: buscar do banco
        lastText: data.text,
        aiFailedAttempts: 0,   // Sprint 2: atualizar após tentativa da IA
        isWithinBusinessHours: withinHours,
      }

      // 3. Avaliar gatilhos de transferência
      const transferReason = shouldTransferToHuman(context)

      if (transferReason) {
        console.log(`[Worker] Transferência detectada | razão=${transferReason} phone=${data.phone}`)
        // Sprint 2/6: notificar corretor no painel com nome, resumo e razão
      }

      // 4. Detectar perfil do lead (texto disponível)
      if (data.text) {
        const profile = detectLeadProfile(data.text)
        if (profile) {
          console.log(`[Worker] Perfil detectado | profile=${profile} phone=${data.phone}`)
        }
      }

      // 5. Fora do horário comercial: enviar mensagem automática de retorno
      if (!withinHours || transferReason === 'fora_horario_comercial') {
        const instanceToken = process.env.ZAPI_TOKEN

        if (instanceToken) {
          const zapi = buildZApiClient(data.instanceId, instanceToken)
          const message = getBusinessHoursMessage(data.tenantId)

          try {
            await zapi.sendText({ phone: data.phone, message })
            console.log(`[Worker] Mensagem de fora de horário enviada | phone=${data.phone}`)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`[Worker] Falha ao enviar mensagem de horário comercial: ${msg}`)
            // Não relança — não queremos reprocessar o job por falha de envio
          }
        }
      }

      // 6. TODO Sprint 2: chamar ai-engine para gerar resposta
      // const aiResponse = await aiEngine.generateResponse(data, context)
      // await zapi.sendText({ phone: data.phone, message: aiResponse })

      // 7. TODO Sprint 3: persistir mensagem e lead no Supabase
      // await leadService.upsertLead({ tenantId: data.tenantId, phone: data.phone, ... })
      // await conversationService.saveMessage(data)

      console.log(`[Worker] Mensagem processada | messageId=${data.messageId}`)
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job falhou | jobId=${job?.id} tentativa=${job?.attemptsMade} erro=${err.message}`)
  })

  worker.on('error', (err) => {
    console.error('[Worker] Erro no worker:', err.message)
  })

  console.log('[Worker] WhatsApp worker iniciado')

  return worker
}
