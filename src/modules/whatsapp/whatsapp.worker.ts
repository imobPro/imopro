import { Worker, Queue, type Job } from 'bullmq'
import * as Sentry from '@sentry/node'
import { redisConnection } from '../../shared/queue/redis'
import { withJobMonitoring } from '../../shared/observability/sentry'
import { WHATSAPP_QUEUE_NAME } from '../../shared/queue/queues'
import { buildScheduleFromTenant, isWithinBusinessHours } from '../../shared/utils/business-hours'
import { maskPhone } from '../../shared/utils/pii'
import {
  detectLeadProfile,
  shouldTransferToHuman,
  getBusinessHoursMessage,
  buildZApiClient,
  popPendingMessages,
  buildSentimentWaitMessage,
  buildCorretorAlert,
  buildHandoffTimeoutResumeMessage,
  sendTextOnce,
  incrementDailyLeadMessageCount,
  getDailyMessageCapPerLead,
} from './whatsapp.service'
import { runOnce } from '../../shared/queue/idempotency'
import { generateResponse } from '../ai-engine'
import type { PendingMessage } from '../ai-engine/ai-engine.types'
import {
  upsertLead,
  updateLeadStatus,
  scoreUp,
  saveConversationMessages,
  saveIncomingMessagesOnly,
  calcScoreDelta,
  getConversationStats,
  getConversationHistory,
  persistAiFailure,
  updateConversationSentiment,
} from '../leads'
import { analyzeSentiment } from '../sentiment'
import { getHandoffTargetPhone } from '../agents'
import { getTenantSettings, type TenantSettings } from '../tenant-settings'
import {
  getSubscription,
  isAccessAllowed,
  incrementTrialMessageCount,
  expireTrial,
  getTrialMessageLimit,
  type Subscription,
} from '../billing'
import { getZapiStatus, getZapiInstanceCredentials } from '../onboarding'
import type { WhatsAppMessageJob } from '../../shared/queue/queue.types'
import type { ConversationContext, ZApiClient } from './whatsapp.types'
import type { AgentConfig } from '../ai-engine'
import type { IncomingMessage } from '../leads'
import type { SentimentType } from '../sentiment'

const HANDOFF_CHECK_DELAY_MS = 15 * 60 * 1000
const HANDOFF_FLAG_TTL_SECONDS = 1800

function buildAgentConfig(settings: TenantSettings): AgentConfig {
  return {
    tenantId: settings.tenantId,
    agentName: settings.agentName,
    realtyName: settings.realtyName,
    welcomeMessage: settings.welcomeMessage,
  }
}

async function scheduleHandoffCheck(
  queue: Queue<WhatsAppMessageJob>,
  data: WhatsAppMessageJob
): Promise<void> {
  const flagKey = `handoff_active:${data.tenantId}:${data.phone}`
  await redisConnection.set(flagKey, '1', 'EX', HANDOFF_FLAG_TTL_SECONDS)

  const dedupId = `handoff-check:${data.tenantId}:${data.phone}`
  // Handoff-check é idempotente (apenas lê a flag): a deduplication evita dupla
  // agendagem dentro da janela de 15min. O job.id interno do BullMQ (auto-gerado)
  // é único por job e o que runOnce usa como chave — nunca compartilha entre
  // sequências de handoff distintas, mesmo com o mesmo dedup id.
  await queue.add(
    'handoff-check',
    data,
    {
      deduplication: { id: dedupId, ttl: HANDOFF_CHECK_DELAY_MS },
      delay: HANDOFF_CHECK_DELAY_MS,
      attempts: 3,
    }
  )

  console.log(`[Worker] Handoff agendado | tenant=${data.tenantId} phone=${maskPhone(data.phone)} check=15min`)
}

async function isHandoffActive(tenantId: string, phone: string): Promise<boolean> {
  const flagKey = `handoff_active:${tenantId}:${phone}`
  return (await redisConnection.exists(flagKey)) === 1
}

async function clearHandoff(tenantId: string, phone: string): Promise<void> {
  await redisConnection.del(`handoff_active:${tenantId}:${phone}`)
}

/**
 * Salva as mensagens recebidas como "lidas pelo corretor" sem responder com IA.
 * Reusado pelos modos silêncio: toggle desligado E trial expirado/canceled.
 */
async function silenceAndSave(
  data: WhatsAppMessageJob,
  pendingMessages: PendingMessage[],
  reasonLabel: string,
): Promise<void> {
  const { tenantId, phone } = data
  let lead
  try {
    const detected = [...pendingMessages].reverse().find((m) => m.text)?.text ?? null
    lead = await upsertLead({ tenantId, phone, profile: detected ? detectLeadProfile(detected) : null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Worker] ${reasonLabel}: upsertLead falhou | ${msg}`)
    return
  }
  const incoming: IncomingMessage[] = pendingMessages
    .filter((m) => m.text || m.mediaUrl)
    .map((m) => ({
      zapiMessageId: `${data.messageId}-${m.timestamp}`,
      content: m.text ?? '',
      type: m.type,
      mediaUrl: m.mediaUrl,
    }))
  await saveIncomingMessagesOnly({ tenantId, leadId: lead.id, incomingMessages: incoming }).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Worker] ${reasonLabel}: saveIncomingMessagesOnly falhou | ${msg}`)
  })
}

/**
 * Após uma resposta da IA bem-sucedida, contabiliza para o cap do trial e
 * marca expired se atingiu o limite. NO-OP quando subscription não está em
 * trial (active/expired/canceled). Best-effort: falha não derruba a resposta.
 *
 * Exportado para teste — a chamada real vive dentro de processWhatsAppJob.
 */
export async function recordAiResponseForBilling(
  subscription: Subscription | null,
  tenantId: string,
): Promise<void> {
  if (!subscription || subscription.status !== 'trial') return
  const newCount = await incrementTrialMessageCount(tenantId)
  if (newCount === null) return
  if (newCount >= getTrialMessageLimit()) {
    console.log(`[Worker] Trial atingiu cap | tenant=${tenantId} count=${newCount} — marcando expired`)
    await expireTrial(tenantId)
  }
}

async function alertCorretor(
  zapi: ZApiClient | null,
  jobId: string,
  label: string,
  leadPhone: string,
  tenantId: string,
  leadId: string
): Promise<void> {
  if (!zapi) return
  const target = await getHandoffTargetPhone(tenantId, leadId)
  if (!target) {
    console.warn(`[Handoff] tenant=${tenantId} sem corretor ativo para alertar | lead=${maskPhone(leadPhone)}`)
    return
  }
  try {
    const sent = await sendTextOnce(zapi, jobId, label, {
      phone: target.phone,
      message: buildCorretorAlert(leadPhone, tenantId),
    })
    if (sent) {
      console.log(`[Worker] Alerta enviado ao corretor | agent=${target.agentId} phone=${maskPhone(target.phone)}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Worker] Falha ao alertar corretor | ${msg}`)
  }
}

export async function processWhatsAppJob(
  job: Job<WhatsAppMessageJob>,
  queue: Queue<WhatsAppMessageJob>,
): Promise<void> {
  const data = job.data
  const { tenantId, phone } = data
  // job.id é gerado pelo BullMQ, único por job e estável em retries do mesmo job
  // (stalled detection). É o identificador correto para chaves de runOnce — não
  // compartilha entre sequências distintas como o dedup id ou um id derivado de
  // tenant+phone fariam.
  const jobId = job.id ?? `unknown:${data.tenantId}:${data.phone}:${data.timestamp}`

  // Job de check de handoff (job.name é o name passado em queue.add)
  if (job.name === 'handoff-check') {
    const active = await isHandoffActive(tenantId, phone)
    if (active) {
      console.log(`[Worker] Corretor não assumiu | tenant=${tenantId} phone=${maskPhone(phone)} — IA retoma`)
      const creds = await getZapiInstanceCredentials(tenantId)
      const zapi = creds ? buildZApiClient(creds.instanceId, creds.instanceToken) : null
      if (zapi) {
        try {
          const sent = await sendTextOnce(zapi, jobId, 'handoff_resume', {
            phone,
            message: buildHandoffTimeoutResumeMessage(),
          })
          if (sent) console.log(`[Worker] Mensagem de retomada enviada | phone=${maskPhone(phone)}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[Worker] Falha ao enviar mensagem de retomada | ${msg}`)
        }
      }
      await clearHandoff(tenantId, phone)
      console.log(`[Worker] ALERTA CORRETOR: lead ${maskPhone(phone)} (tenant ${tenantId}) sem atendimento após 15min`)
    } else {
      console.log(`[Worker] Handoff assumido pelo corretor | tenant=${tenantId} phone=${maskPhone(phone)}`)
    }
    return
  }

  console.log(`[Worker] Processando | tenant=${tenantId} phone=${maskPhone(phone)} jobId=${jobId}`)

  // 1. Ler lote de mensagens acumuladas no debounce
  const pendingMessages = await popPendingMessages(tenantId, phone)

  if (pendingMessages.length === 0) {
    console.log(`[Worker] Sem mensagens pendentes | tenant=${tenantId} phone=${maskPhone(phone)} — ignorado`)
    return
  }

  // 2. Carregar configurações do tenant (Sprint 8), subscription (Fase 3), status
  // Z-API (Sprint 9.6) e credenciais Z-API do tenant. Os 4 falham em defaults
  // permissivos — atendimento não deve cair por leitura. getZapiStatus retorna
  // 'not_provisioned' em erro. getZapiInstanceCredentials retorna null quando
  // o tenant não tem instância gravada nem há env legacy configurado.
  const [settings, subscription, zapiStatus, zapiCreds] = await Promise.all([
    getTenantSettings(tenantId),
    getSubscription(tenantId),
    getZapiStatus(tenantId),
    getZapiInstanceCredentials(tenantId),
  ])
  const schedule = buildScheduleFromTenant(settings.businessHoursStart, settings.businessHoursEnd)
  const withinHours = isWithinBusinessHours(schedule)
  const zapi = zapiCreds ? buildZApiClient(zapiCreds.instanceId, zapiCreds.instanceToken) : null

  // 2a. Trial expirado/canceled: IA fica em silêncio, mensagem salva no painel.
  // Mesmo padrão do toggle agentActive=false. subscription=null (caso
  // teoricamente impossível pelo trigger) é permissivo — não bloqueia atendimento.
  if (subscription && !isAccessAllowed(subscription)) {
    console.log(`[Worker] Acesso bloqueado | tenant=${tenantId} status=${subscription.status} phone=${maskPhone(phone)} — IA em silêncio`)
    await silenceAndSave(data, pendingMessages, `subscription=${subscription.status}`)
    return
  }

  // 2b. Toggle do agente desligado: salva mensagem do lead, não responde
  if (!settings.agentActive) {
    console.log(`[Worker] Agente desligado | tenant=${tenantId} phone=${maskPhone(phone)} — IA em silêncio`)
    await silenceAndSave(data, pendingMessages, 'agentActive=false')
    return
  }

  // 2c. Z-API desconectado: silenciamos a IA pra não gerar tokens da Anthropic
  // que a Z-API descartaria na hora de enviar. Race: dispositivo cai entre a
  // recepção do callback e o processamento da fila. O banner danger no painel
  // (frontend) cobre a UX — cliente vê que precisa reconectar.
  if (zapiStatus === 'disconnected') {
    console.log(`[Worker] Z-API desconectada | tenant=${tenantId} phone=${maskPhone(phone)} — IA em silêncio`)
    await silenceAndSave(data, pendingMessages, 'zapi=disconnected')
    return
  }

  if (!withinHours) {
    if (zapi) {
      try {
        const sent = await sendTextOnce(zapi, jobId, 'out_of_hours', {
          phone,
          message: getBusinessHoursMessage(settings.outOfHoursMessage, schedule),
        })
        if (sent) console.log(`[Worker] Mensagem de fora de horário enviada | phone=${maskPhone(phone)}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Worker] Falha ao enviar mensagem de horário | ${msg}`)
      }
    }
    return
  }

  // 2d. Cap de mensagens por lead/dia — defesa de custo Claude API contra spam.
  // Um único lead pode disparar milhares de msgs/dia (bot, número comprometido).
  // Cada uma vira 1 Sonnet + possivelmente 1 Whisper. Ao estourar: silêncio
  // como nos demais gates. Falha de Redis é permissiva (count=0 fictício).
  let dailyCount = 0
  try {
    dailyCount = await incrementDailyLeadMessageCount(tenantId, phone)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Worker] incrementDailyLeadMessageCount falhou — cap ignorado | ${msg}`)
  }
  const dailyCap = getDailyMessageCapPerLead()
  if (dailyCount > dailyCap) {
    console.log(`[Worker] Cap diário do lead estourado | tenant=${tenantId} phone=${maskPhone(phone)} count=${dailyCount} cap=${dailyCap} — IA em silêncio`)
    await silenceAndSave(data, pendingMessages, `daily_cap=${dailyCap}`)
    return
  }

  // 3. Detectar perfil do lead pela última mensagem de texto
  const lastText = [...pendingMessages].reverse().find((m) => m.text)?.text ?? null
  const detectedProfile = lastText ? detectLeadProfile(lastText) : null
  if (detectedProfile) {
    console.log(`[Worker] Perfil detectado | profile=${detectedProfile} phone=${maskPhone(phone)}`)
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

  // 5b. Handoff em curso: usar prompt preparatório, não reabrir transferência nem rodar sentimento.
  // Lead já foi transferido; nesta janela de 15min a IA conduz a espera.
  if (await isHandoffActive(tenantId, phone)) {
    console.log(`[Worker] Handoff em curso | tenant=${tenantId} phone=${maskPhone(phone)} — modo preparatório`)
    const config = buildAgentConfig(settings)

    let aiResponse
    try {
      aiResponse = await generateResponse(pendingMessages, history, config, tenantId, phone, {
        handoffMode: true,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Worker] Falha na IA (handoff) | ${msg}`)
      return
    }

    if (zapi) {
      try {
        const sent = await sendTextOnce(zapi, jobId, 'handoff_response', {
          phone,
          message: aiResponse.text,
        })
        if (sent) console.log(`[Worker] Resposta preparatória enviada | phone=${maskPhone(phone)}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Worker] Falha ao enviar resposta preparatória | ${msg}`)
      }
    } else {
      console.log(`[Worker] [DEV] Resposta IA (handoff) | phone=${maskPhone(phone)}\n${aiResponse.text}`)
    }

    await recordAiResponseForBilling(subscription, tenantId)

    try {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Worker] Falha ao persistir mensagens (handoff) | ${msg}`)
    }

    return
  }

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
    console.log(`[Worker] Transferência pré-IA | razão=${transferReason} phone=${maskPhone(phone)}`)
    if (transferReason === 'sentimento_negativo') {
      if (zapi) {
        await sendTextOnce(zapi, jobId, 'sentiment_wait_urgent', {
          phone,
          message: buildSentimentWaitMessage(),
        }).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e)
          console.error(`[Worker] Falha ao enviar mensagem de espera | ${msg}`)
        })
      }
      await alertCorretor(zapi, jobId, 'corretor_alert_urgent', phone, tenantId, lead.id)
      await updateConversationSentiment(tenantId, lead.id, 'negativo').catch(() => {})
    }
    await scheduleHandoffCheck(queue, data)
    return
  }

  // 6b. Análise de sentimento geral via Haiku (avalia tom acumulado da conversa)
  let currentSentiment: SentimentType = 'neutro'
  if (history.length >= 2) {
    currentSentiment = await analyzeSentiment(history).catch(() => 'neutro' as SentimentType)
    console.log(`[Worker] Sentimento | sentiment=${currentSentiment} phone=${maskPhone(phone)}`)

    if (currentSentiment === 'negativo') {
      const alreadyInHandoff = await isHandoffActive(tenantId, phone)
      if (!alreadyInHandoff) {
        if (zapi) {
          await sendTextOnce(zapi, jobId, 'sentiment_wait_haiku', {
            phone,
            message: buildSentimentWaitMessage(),
          }).catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`[Worker] Falha ao enviar mensagem de espera | ${msg}`)
          })
        }
        await alertCorretor(zapi, jobId, 'corretor_alert_haiku', phone, tenantId, lead.id)
        await updateConversationSentiment(tenantId, lead.id, 'negativo').catch(() => {})
        await scheduleHandoffCheck(queue, data)
        return
      }
    }
  }

  // 7. Gerar resposta via IA
  const config = buildAgentConfig(settings)

  let aiResponse
  try {
    aiResponse = await generateResponse(pendingMessages, history, config, tenantId, phone)
  } catch {
    const newFailCount = aiFailedAttempts + 1
    console.error(`[Worker] Falha na IA | tentativa=${newFailCount} phone=${maskPhone(phone)}`)

    await persistAiFailure(tenantId, lead.id, newFailCount).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[Worker] Falha ao persistir aiFailedAttempts | ${msg}`)
    })

    if (newFailCount >= 2) {
      console.log(`[Worker] Transferência por ia_sem_resposta | phone=${maskPhone(phone)}`)
      await scheduleHandoffCheck(queue, data)
    }
    return
  }

  // 8. Enviar resposta ao lead
  if (zapi) {
    try {
      const sent = await sendTextOnce(zapi, jobId, 'ai_response', {
        phone,
        message: aiResponse.text,
      })
      if (sent) {
        console.log(`[Worker] Resposta enviada | phone=${maskPhone(phone)} intent=${aiResponse.intent}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Worker] Falha ao enviar resposta | ${msg}`)
    }
  } else {
    console.log(`[Worker] [DEV] Resposta IA | phone=${maskPhone(phone)}\n${aiResponse.text}`)
  }

  // 8b. Contabiliza a resposta para o cap do trial (no-op se status != trial)
  await recordAiResponseForBilling(subscription, tenantId)

  // 9. Verificar se a IA sinalizou transferência
  if (aiResponse.shouldTransfer) {
    console.log(`[Worker] Transferência via IA | razão=${aiResponse.transferReason ?? 'desconhecida'} phone=${maskPhone(phone)}`)
    await scheduleHandoffCheck(queue, data)
  }

  // 10. Persistir score, status e mensagens no Supabase
  try {
    // scoreUp é INCREMENT — não-idempotente. Em retry após stalled, runOnce
    // garante que o delta só é somado uma vez por job.id.
    await runOnce(jobId, 'score_up', () =>
      scoreUp(lead.id, tenantId, calcScoreDelta(aiResponse.intent)),
    )

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
}

export function startWhatsAppWorker(): Worker<WhatsAppMessageJob> {
  const queue = new Queue<WhatsAppMessageJob>(WHATSAPP_QUEUE_NAME, { connection: redisConnection })

  const worker = new Worker<WhatsAppMessageJob>(
    WHATSAPP_QUEUE_NAME,
    async (job) =>
      withJobMonitoring(
        {
          queue: WHATSAPP_QUEUE_NAME,
          jobId: job.id ?? 'unknown',
          jobName: job.name,
          tenantId: job.data?.tenantId,
        },
        () => processWhatsAppJob(job, queue),
      ),
    {
      connection: redisConnection,
      concurrency: 5,
      // Pipeline (Whisper + Sonnet + Haiku + Supabase + Z-API) pode passar dos 30s default.
      // Sem isso, jobs longos viram stalled e geram resposta duplicada ao lead.
      lockDuration: 120_000,
    },
  )

  // withJobMonitoring no processor já captura no Sentry; aqui só log local.
  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job falhou | jobId=${job?.id} tentativa=${job?.attemptsMade} erro=${err.message}`)
  })

  worker.on('error', (err) => {
    console.error('[Worker] Erro no worker:', err.message)
    Sentry.captureException(err, {
      tags: { queue: WHATSAPP_QUEUE_NAME, kind: 'worker_error' },
    })
  })

  console.log('[Worker] WhatsApp worker iniciado')

  return worker
}
