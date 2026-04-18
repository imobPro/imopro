import { Worker, Queue } from 'bullmq'
import { redisConnection } from '../../shared/queue/redis'
import { WHATSAPP_QUEUE_NAME } from '../../shared/queue/queues'
import { isWithinBusinessHours } from '../../shared/utils/business-hours'
import {
  detectLeadProfile,
  shouldTransferToHuman,
  getBusinessHoursMessage,
  buildZApiClient,
  popPendingMessages,
} from './whatsapp.service'
import { generateResponse } from '../ai-engine'
import {
  upsertLead,
  updateLeadStatus,
  scoreUp,
  saveConversationMessages,
  calcScoreDelta,
} from '../leads'
import type { WhatsAppMessageJob } from '../../shared/queue/queue.types'
import type { ConversationContext } from './whatsapp.types'
import type { AgentConfig } from '../ai-engine'
import type { IncomingMessage } from '../leads'

const HANDOFF_CHECK_DELAY_MS = 15 * 60 * 1000 // 15 minutos
const HANDOFF_FLAG_TTL_SECONDS = 1800           // 30 minutos

// ---------------------------------------------------------------------------
// Configuração padrão do agente — Sprint 5 buscará do banco por tenant
// ---------------------------------------------------------------------------

function getAgentConfig(tenantId: string): AgentConfig {
  return {
    tenantId,
    agentName: process.env.AGENT_NAME ?? 'Assistente',
    realtyName: process.env.REALTY_NAME ?? 'Imobiliária',
  }
}

// ---------------------------------------------------------------------------
// Handoff: flag Redis + job de check após 15 minutos
// ---------------------------------------------------------------------------

async function scheduleHandoffCheck(
  queue: Queue<WhatsAppMessageJob>,
  job: WhatsAppMessageJob
): Promise<void> {
  const flagKey = `handoff_active:${job.tenantId}:${job.phone}`
  await redisConnection.set(flagKey, '1', 'EX', HANDOFF_FLAG_TTL_SECONDS)

  const checkJobId = `handoff-check:${job.tenantId}:${job.phone}`
  await queue.add(
    checkJobId,
    { ...job, jobId: checkJobId },
    { jobId: checkJobId, delay: HANDOFF_CHECK_DELAY_MS }
  )

  console.log(`[Worker] Handoff agendado | tenant=${job.tenantId} phone=${job.phone} check=15min`)
}

async function isHandoffActive(tenantId: string, phone: string): Promise<boolean> {
  const flagKey = `handoff_active:${tenantId}:${phone}`
  return (await redisConnection.exists(flagKey)) === 1
}

async function clearHandoff(tenantId: string, phone: string): Promise<void> {
  await redisConnection.del(`handoff_active:${tenantId}:${phone}`)
}

// ---------------------------------------------------------------------------
// Worker principal
// ---------------------------------------------------------------------------

export function startWhatsAppWorker(): Worker<WhatsAppMessageJob> {
  const queue = new Queue<WhatsAppMessageJob>(WHATSAPP_QUEUE_NAME, { connection: redisConnection })

  const worker = new Worker<WhatsAppMessageJob>(
    WHATSAPP_QUEUE_NAME,
    async (job) => {
      const data = job.data
      const { tenantId, phone, instanceId } = data

      // Job de check de handoff — verifica se corretor assumiu
      if (data.jobId.startsWith('handoff-check:')) {
        const active = await isHandoffActive(tenantId, phone)
        if (active) {
          console.log(`[Worker] Corretor não assumiu | tenant=${tenantId} phone=${phone} — IA retoma`)
          await clearHandoff(tenantId, phone)
          // Sprint 6: notificará pelo painel
          console.log(`[Worker] ALERTA CORRETOR: lead ${phone} (tenant ${tenantId}) sem atendimento após 15min`)
        } else {
          console.log(`[Worker] Handoff assumido pelo corretor | tenant=${tenantId} phone=${phone}`)
        }
        return
      }

      console.log(`[Worker] Processando | tenant=${tenantId} phone=${phone} jobId=${data.jobId}`)

      // 1. Ler lote de mensagens acumuladas no debounce
      const pendingMessages = await popPendingMessages(tenantId, phone)

      if (pendingMessages.length === 0) {
        console.log(`[Worker] Sem mensagens pendentes | tenant=${tenantId} phone=${phone} — ignorado`)
        return
      }

      // 2. Verificar horário comercial
      const withinHours = isWithinBusinessHours()

      if (!withinHours) {
        const instanceToken = process.env.ZAPI_TOKEN
        if (instanceToken) {
          const zapi = buildZApiClient(instanceId, instanceToken)
          try {
            await zapi.sendText({ phone, message: getBusinessHoursMessage(tenantId) })
            console.log(`[Worker] Mensagem de fora de horário enviada | phone=${phone}`)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`[Worker] Falha ao enviar mensagem de horário | ${msg}`)
          }
        }
        return
      }

      // 3. Detectar perfil do lead pela última mensagem de texto
      const lastText = [...pendingMessages].reverse().find((m: { text: string | null }) => m.text)?.text ?? null
      const detectedProfile = lastText ? detectLeadProfile(lastText) : null
      if (detectedProfile) {
        console.log(`[Worker] Perfil detectado | profile=${detectedProfile} phone=${phone}`)
      }

      // 4. Montar contexto para avaliação de transferência
      // Sprint 3 buscará messageCount e aiFailedAttempts do banco
      const context: ConversationContext = {
        tenantId,
        phone,
        messageCount: pendingMessages.length,
        lastText,
        aiFailedAttempts: 0,
        isWithinBusinessHours: withinHours,
      }

      // 5. Verificar gatilhos de transferência antes da IA
      const transferReason = shouldTransferToHuman(context)
      if (transferReason && transferReason !== 'ia_sem_resposta') {
        console.log(`[Worker] Transferência pré-IA | razão=${transferReason} phone=${phone}`)
        await scheduleHandoffCheck(queue, data)
        // Sprint 6: notificará corretor pelo painel com resumo e razão
        return
      }

      // 6. Gerar resposta via IA
      const config = getAgentConfig(tenantId)
      const instanceToken = process.env.ZAPI_TOKEN
      const zapi = instanceToken ? buildZApiClient(instanceId, instanceToken) : null

      let aiResponse
      try {
        aiResponse = await generateResponse(pendingMessages, tenantId, phone, config)
      } catch {
        context.aiFailedAttempts += 1
        console.error(`[Worker] Falha na IA | tentativa=${context.aiFailedAttempts} phone=${phone}`)

        if (context.aiFailedAttempts >= 2) {
          console.log(`[Worker] Transferência por ia_sem_resposta | phone=${phone}`)
          await scheduleHandoffCheck(queue, data)
        }
        return
      }

      // 7. Enviar resposta ao lead
      if (zapi) {
        try {
          await zapi.sendText({ phone, message: aiResponse.text })
          console.log(`[Worker] Resposta enviada | phone=${phone} intent=${aiResponse.intent}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[Worker] Falha ao enviar resposta | ${msg}`)
        }
      } else {
        // Ambiente de desenvolvimento sem Z-API configurada
        console.log(`[Worker] [DEV] Resposta IA | phone=${phone}\n${aiResponse.text}`)
      }

      // 8. Verificar se a IA sinalizou transferência
      if (aiResponse.shouldTransfer) {
        console.log(`[Worker] Transferência via IA | razão=${aiResponse.transferReason ?? 'desconhecida'} phone=${phone}`)
        await scheduleHandoffCheck(queue, data)
      }

      // 9. Persistir lead e mensagens no Supabase
      try {
        const lead = await upsertLead({
          tenantId,
          phone,
          profile: detectedProfile,
          intent: aiResponse.intent,
        })

        await scoreUp(lead.id, tenantId, calcScoreDelta(aiResponse.intent))

        if (aiResponse.shouldTransfer) {
          await updateLeadStatus(lead.id, 'transferido', tenantId)
        }

        const incomingMessages: IncomingMessage[] = pendingMessages
          .filter((m) => m.text || m.mediaUrl)
          .map((m) => ({
            zapiMessageId: `${data.messageId}-${m.timestamp}`,
            content: m.text ?? '',
            type: m.type,
            mediaUrl: m.mediaUrl,
          }))

        await saveConversationMessages({
          tenantId,
          leadId: lead.id,
          incomingMessages,
          aiResponseText: aiResponse.text,
          aiFailedAttempts: context.aiFailedAttempts,
        })

        console.log(`[Worker] Lead persistido | leadId=${lead.id} status=${lead.status} score=${lead.score}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Worker] Falha ao persistir no banco | ${msg}`)
        // Não relança — falha de persistência não deve derrubar o atendimento
      }
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
