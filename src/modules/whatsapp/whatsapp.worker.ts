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
  buildSentimentWaitMessage,
  buildCorretorAlert,
} from './whatsapp.service'
import { generateResponse } from '../ai-engine'
import {
  upsertLead,
  updateLeadStatus,
  scoreUp,
  saveConversationMessages,
  calcScoreDelta,
  getConversationStats,
  getConversationHistory,
  persistAiFailure,
  updateConversationSentiment,
} from '../leads'
import { analyzeSentiment } from '../sentiment'
import { getHandoffTargetPhone } from '../agents'
import type { WhatsAppMessageJob } from '../../shared/queue/queue.types'
import type { ConversationContext, ZApiClient } from './whatsapp.types'
import type { AgentConfig } from '../ai-engine'
import type { IncomingMessage } from '../leads'
import type { SentimentType } from '../sentiment'

const HANDOFF_CHECK_DELAY_MS = 15 * 60 * 1000
const HANDOFF_FLAG_TTL_SECONDS = 1800

function getAgentConfig(tenantId: string): AgentConfig {
  return {
    tenantId,
    agentName: process.env.AGENT_NAME ?? 'Assistente',
    realtyName: process.env.REALTY_NAME ?? 'Imobiliária',
  }
}

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

async function alertCorretor(
  zapi: ZApiClient | null,
  leadPhone: string,
  tenantId: string,
  leadId: string
): Promise<void> {
  if (!zapi) return
  const target = await getHandoffTargetPhone(tenantId, leadId)
  if (!target) {
    console.warn(`[Handoff] tenant=${tenantId} sem corretor ativo para alertar | lead=${leadPhone}`)
    return
  }
  try {
    await zapi.sendText({ phone: target.phone, message: buildCorretorAlert(leadPhone, tenantId) })
    console.log(`[Worker] Alerta enviado ao corretor | agent=${target.agentId} phone=${target.phone}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Worker] Falha ao alertar corretor | ${msg}`)
  }
}

export function startWhatsAppWorker(): Worker<WhatsAppMessageJob> {
  const queue = new Queue<WhatsAppMessageJob>(WHATSAPP_QUEUE_NAME, { connection: redisConnection })

  const worker = new Worker<WhatsAppMessageJob>(
    WHATSAPP_QUEUE_NAME,
    async (job) => {
      const data = job.data
      const { tenantId, phone, instanceId } = data

      // Job de check de handoff
      if (data.jobId.startsWith('handoff-check:')) {
        const active = await isHandoffActive(tenantId, phone)
        if (active) {
          console.log(`[Worker] Corretor não assumiu | tenant=${tenantId} phone=${phone} — IA retoma`)
          await clearHandoff(tenantId, phone)
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
      const instanceToken = process.env.ZAPI_TOKEN
      const zapi = instanceToken ? buildZApiClient(instanceId, instanceToken) : null

      if (!withinHours) {
        if (zapi) {
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
      const lastText = [...pendingMessages].reverse().find((m) => m.text)?.text ?? null
      const detectedProfile = lastText ? detectLeadProfile(lastText) : null
      if (detectedProfile) {
        console.log(`[Worker] Perfil detectado | profile=${detectedProfile} phone=${phone}`)
      }

      // 4. Upsert do lead — antecipado para ter leadId disponível nas etapas seguintes
      let lead
      try {
        lead = await upsertLead({ tenantId, phone, profile: detectedProfile })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Worker] Falha ao registrar lead | ${msg}`)
        return
      }

      // 5. Carregar contexto e histórico persistidos no banco
      const { aiFailedAttempts, messageCount } = await getConversationStats(tenantId, lead.id).catch(() => ({
        aiFailedAttempts: 0,
        messageCount: 0,
      }))

      const history = await getConversationHistory(tenantId, lead.id).catch(() => [])

      // 6a. Verificar gatilhos de transferência (inclui urgência por keywords)
      const context: ConversationContext = {
        tenantId,
        phone,
        messageCount,
        lastText,
        aiFailedAttempts,
        isWithinBusinessHours: withinHours,
      }

      const transferReason = shouldTransferToHuman(context)
      if (transferReason) {
        console.log(`[Worker] Transferência pré-IA | razão=${transferReason} phone=${phone}`)
        if (transferReason === 'sentimento_negativo') {
          if (zapi) {
            await zapi.sendText({ phone, message: buildSentimentWaitMessage() }).catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : String(e)
              console.error(`[Worker] Falha ao enviar mensagem de espera | ${msg}`)
            })
          }
          await alertCorretor(zapi, phone, tenantId, lead.id)
          await updateConversationSentiment(tenantId, lead.id, 'negativo').catch(() => {})
        }
        await scheduleHandoffCheck(queue, data)
        return
      }

      // 6b. Análise de sentimento geral via Haiku (avalia tom acumulado da conversa)
      let currentSentiment: SentimentType = 'neutro'
      if (history.length >= 2) {
        currentSentiment = await analyzeSentiment(history).catch(() => 'neutro' as SentimentType)
        console.log(`[Worker] Sentimento | sentiment=${currentSentiment} phone=${phone}`)

        if (currentSentiment === 'negativo') {
          const alreadyInHandoff = await isHandoffActive(tenantId, phone)
          if (!alreadyInHandoff) {
            if (zapi) {
              await zapi.sendText({ phone, message: buildSentimentWaitMessage() }).catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : String(e)
                console.error(`[Worker] Falha ao enviar mensagem de espera | ${msg}`)
              })
            }
            await alertCorretor(zapi, phone, tenantId, lead.id)
            await updateConversationSentiment(tenantId, lead.id, 'negativo').catch(() => {})
            await scheduleHandoffCheck(queue, data)
            return
          }
        }
      }

      // 7. Gerar resposta via IA
      const config = getAgentConfig(tenantId)

      let aiResponse
      try {
        aiResponse = await generateResponse(pendingMessages, history, config, tenantId, phone)
      } catch {
        const newFailCount = aiFailedAttempts + 1
        console.error(`[Worker] Falha na IA | tentativa=${newFailCount} phone=${phone}`)

        await persistAiFailure(tenantId, lead.id, newFailCount).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e)
          console.error(`[Worker] Falha ao persistir aiFailedAttempts | ${msg}`)
        })

        if (newFailCount >= 2) {
          console.log(`[Worker] Transferência por ia_sem_resposta | phone=${phone}`)
          await scheduleHandoffCheck(queue, data)
        }
        return
      }

      // 8. Enviar resposta ao lead
      if (zapi) {
        try {
          await zapi.sendText({ phone, message: aiResponse.text })
          console.log(`[Worker] Resposta enviada | phone=${phone} intent=${aiResponse.intent}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[Worker] Falha ao enviar resposta | ${msg}`)
        }
      } else {
        console.log(`[Worker] [DEV] Resposta IA | phone=${phone}\n${aiResponse.text}`)
      }

      // 9. Verificar se a IA sinalizou transferência
      if (aiResponse.shouldTransfer) {
        console.log(`[Worker] Transferência via IA | razão=${aiResponse.transferReason ?? 'desconhecida'} phone=${phone}`)
        await scheduleHandoffCheck(queue, data)
      }

      // 10. Persistir score, status e mensagens no Supabase
      try {
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
          aiFailedAttempts: 0,
        })

        console.log(`[Worker] Lead persistido | leadId=${lead.id} status=${lead.status} score=${lead.score}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Worker] Falha ao persistir no banco | ${msg}`)
      }

      // 11. Persistir sentimento para o dashboard
      await updateConversationSentiment(tenantId, lead.id, currentSentiment).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[Worker] Falha ao persistir sentimento | ${msg}`)
      })
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
