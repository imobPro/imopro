import { supabase } from '../../shared/database/supabase'
import { whatsappQueue } from '../../shared/queue/queues'
import { redisConnection } from '../../shared/queue/redis'
import { runOnce } from '../../shared/queue/idempotency'
import { addExternalCallBreadcrumb } from '../../shared/observability/sentry'
import { getNextBusinessDay, type BusinessHoursConfig } from '../../shared/utils/business-hours'
import { maskPhone } from '../../shared/utils/pii'
import type { WhatsAppMessageJob, MessageType } from '../../shared/queue/queue.types'
import type { PendingMessage } from '../../shared/types/domain'
import type {
  ZApiWebhookPayload,
  LeadProfile,
  TransferReason,
  ConversationContext,
  ZApiClient,
  ZApiSendTextPayload,
} from './whatsapp.types'

const DEBOUNCE_DELAY_MS = 8000
const PENDING_TTL_SECONDS = 300 // 5 minutos
const SEEN_MESSAGE_TTL_SECONDS = 24 * 60 * 60 // 24h
const DAILY_MESSAGE_TTL_SECONDS = 24 * 60 * 60 // 24h — sliding window por primeira msg do dia
const DEFAULT_DAILY_MESSAGE_CAP = 100

export function getDailyMessageCapPerLead(): number {
  const raw = process.env.DAILY_MESSAGE_CAP_PER_LEAD
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_MESSAGE_CAP
}

// ---------------------------------------------------------------------------
// Idempotência por messageId — dedup pré-fila
// ---------------------------------------------------------------------------
// Z-API pode reentregar o mesmo webhook (network glitch, reinício, etc). Cada
// mensagem real tem messageId único; reentrega = mesmo id. Marcamos o id no
// Redis com NX+EX: se a chave já existir, descartamos antes de enfileirar.
// Defesa em camadas: UNIQUE(zapi_message_id) na tabela messages é a 2ª linha,
// mas só protege a persistência — não evita o lead receber resposta duplicada.

export async function markMessageSeen(tenantId: string, messageId: string): Promise<boolean> {
  const key = `seen_msg:${tenantId}:${messageId}`
  const result = await redisConnection.set(key, '1', 'EX', SEEN_MESSAGE_TTL_SECONDS, 'NX')
  return result === 'OK'
}

// ---------------------------------------------------------------------------
// Cap de mensagens por lead/dia — defesa de custo Claude API contra spam
// ---------------------------------------------------------------------------
// Um único lead pode disparar milhares de mensagens/dia (bot, número
// comprometido, teste automatizado). Cada uma vira 1 chamada Claude Sonnet +
// possivelmente 1 Whisper — custo real. TRIAL_MESSAGE_LIMIT é por tenant, não
// resolve o caso de um lead abusivo dentro do plano `active`.
//
// Estratégia: INCR atômico em contador por (tenant, phone). TTL vira sliding
// window de 24h — reset natural sem cron. Ao atingir o cap, a IA silencia e a
// mensagem cai em saveIncomingMessagesOnly (o corretor ainda vê no painel).

export async function incrementDailyLeadMessageCount(
  tenantId: string,
  phone: string,
): Promise<number> {
  const key = `daily_msg:${tenantId}:${phone}`
  const count = await redisConnection.incr(key)
  // Set TTL só na primeira mensagem do dia — chamadas subsequentes preservam
  // a janela original. Se INCR falhar (Redis fora) o worker segue sem cap,
  // por design permissivo (não bloquear atendimento por falha de infra).
  if (count === 1) {
    await redisConnection.expire(key, DAILY_MESSAGE_TTL_SECONDS)
  }
  return count
}

// ---------------------------------------------------------------------------
// Resolução de tenant pelo instanceId Z-API (auth do /webhook/whatsapp)
// ---------------------------------------------------------------------------
// Cada tenant tem uma instância dedicada da Z-API (Sprint 9.2). O instanceId
// é gerado pela Partner API e armazenado em `tenants.zapi_instance_id` — atua
// como segredo compartilhado: a Z-API só posta callbacks no nosso webhook com
// esse id se ela mesmo provisionou a instância. Sem match no DB, devolvemos
// `null` e o controller descarta a mensagem sem retentar.

export async function resolveTenantByInstance(instanceId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('zapi_instance_id', instanceId)
    .maybeSingle()
  if (error) {
    console.error(`[Webhook] resolveTenantByInstance falhou instance=${instanceId}: ${error.message}`)
    return null
  }
  return data ? (data.id as string) : null
}

// ---------------------------------------------------------------------------
// Enfileiramento de mensagens recebidas com debounce de 8s
// ---------------------------------------------------------------------------

export async function enqueueMessage(
  payload: ZApiWebhookPayload,
  tenantId: string
): Promise<void> {
  const type = detectMessageType(payload)
  const pendingKey = `pending:${tenantId}:${payload.phone}`
  const debounceId = `debounce:${tenantId}:${payload.phone}`

  const pending: PendingMessage = {
    text: payload.text?.message ?? payload.image?.caption ?? null,
    mediaUrl: extractMediaUrl(payload),
    mimeType: extractMimeType(payload),
    type,
    timestamp: payload.momment,
  }

  // Empilha a mensagem na lista Redis do lead
  await redisConnection.rpush(pendingKey, JSON.stringify(pending))
  await redisConnection.expire(pendingKey, PENDING_TTL_SECONDS)

  const triggerJob: WhatsAppMessageJob = {
    tenantId,
    instanceId: payload.instanceId,
    phone: payload.phone,
    messageId: payload.messageId,
    type,
    text: pending.text,
    mediaUrl: pending.mediaUrl,
    mimeType: pending.mimeType,
    timestamp: payload.momment,
    isFromMe: payload.fromMe,
  }

  // Modo "debounce" oficial do BullMQ: cada novo burst no TTL substitui o job pendente
  // e estende o TTL. Após o job sair da fila (concluído/falhado), o id volta a estar livre,
  // sem o problema de colisão com jobs em removeOnComplete.
  await whatsappQueue.add('debounce', triggerJob, {
    deduplication: {
      id: debounceId,
      ttl: DEBOUNCE_DELAY_MS,
      extend: true,
      replace: true,
    },
    delay: DEBOUNCE_DELAY_MS,
  })
}

// ---------------------------------------------------------------------------
// Leitura e limpeza das mensagens pendentes do lead (chamado pelo worker)
// ---------------------------------------------------------------------------

export async function popPendingMessages(
  tenantId: string,
  phone: string
): Promise<PendingMessage[]> {
  const pendingKey = `pending:${tenantId}:${phone}`
  const raw = await redisConnection.lrange(pendingKey, 0, -1)
  await redisConnection.del(pendingKey)
  return raw.map((item) => JSON.parse(item) as PendingMessage)
}

// ---------------------------------------------------------------------------
// Detecção de tipo de mensagem
// ---------------------------------------------------------------------------

function detectMessageType(payload: ZApiWebhookPayload): MessageType {
  if (payload.audio) return 'audio'
  if (payload.image) return 'image'
  if (payload.document) return 'document'
  if (payload.sticker) return 'sticker'
  if (payload.location) return 'location'
  return 'text'
}

function extractMediaUrl(payload: ZApiWebhookPayload): string | null {
  return (
    payload.audio?.audioUrl ??
    payload.image?.imageUrl ??
    payload.document?.documentUrl ??
    payload.sticker?.stickerUrl ??
    null
  )
}

function extractMimeType(payload: ZApiWebhookPayload): string | null {
  return (
    payload.audio?.mimeType ??
    payload.image?.mimeType ??
    payload.document?.mimeType ??
    null
  )
}

// ---------------------------------------------------------------------------
// Detecção de perfil do lead por palavras-chave
// Sprint 2 substituirá isso por análise via Claude API
// ---------------------------------------------------------------------------

// Ordem importa: perfis mais específicos primeiro para evitar falsos positivos
// Ex: 'investidor' antes de 'comprador' pois 'comprar para alugar' contém 'comprar'
//     'inquilino' antes de 'comprador' pois mensagens de aluguel podem ter 'apartamento'
const PROFILE_PRIORITY: LeadProfile[] = [
  'investidor', 'captacao', 'indicador', 'vendedor', 'inquilino', 'comprador',
]

const PROFILE_KEYWORDS: Record<LeadProfile, string[]> = {
  // 'casa' removido — genérico demais, causava falsos positivos em vendedor/inquilino
  comprador:  ['quero comprar', 'financiamento', 'entrada', 'apartamento', 'quero adquirir'],
  inquilino:  ['alugar', 'aluguel', 'locacao', 'quero alugar', 'morar de aluguel'],
  vendedor:   ['vender', 'venda', 'quero vender', 'meu imovel', 'preciso vender'],
  captacao:   ['administrar', 'administracao', 'colocar para alugar'],
  investidor: ['investimento', 'investir', 'retorno', 'renda', 'revender', 'comprar para alugar'],
  indicador:  ['indicar', 'indicacao', 'meu amigo', 'minha amiga', 'conheco alguem'],
}

export function detectLeadProfile(text: string): LeadProfile | null {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  for (const profile of PROFILE_PRIORITY) {
    const keywords = PROFILE_KEYWORDS[profile]
    if (keywords.some(kw => normalized.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      return profile
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Avaliação dos gatilhos de transferência para corretor humano
// ---------------------------------------------------------------------------

// Palavras-chave normalizadas (sem acento) para match mais robusto
const TRANSFER_KEYWORDS = [
  'falar com humano', 'falar com pessoa', 'falar com corretor', 'falar com atendente',
  'atendimento humano', 'atendente humano', 'nao quero falar com robo',
  'preciso de uma pessoa', 'me liga', 'podem me ligar', 'quero falar com alguem',
]

const CLOSING_KEYWORDS = [
  'quero visitar', 'posso visitar', 'agendar visita', 'marcar visita', 'fazer uma visita',
  'qual o valor', 'qual o preco', 'condicoes de pagamento', 'aceita proposta',
  'documentacao', 'contrato', 'tenho interesse', 'quero fechar',
]

// Urgência máxima — insatisfação crítica: transferência imediata sem esperar análise de sentimento
const URGENCY_KEYWORDS = [
  'vou desistir', 'vou embora', 'quero cancelar', 'pessimo atendimento',
  'horrivel', 'nunca mais', 'muito ruim', 'absurdo', 'inaceitavel',
  'vou reclamar', 'procon', 'decepcionado', 'decepcionante',
]

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function shouldTransferToHuman(context: ConversationContext): TransferReason | null {
  const text = normalize(context.lastText ?? '')

  // Gatilho 1: pedido explícito
  if (TRANSFER_KEYWORDS.some(kw => text.includes(kw))) {
    return 'pedido_explicito'
  }

  // Gatilho 2: urgência máxima — insatisfação crítica imediata
  if (URGENCY_KEYWORDS.some(kw => text.includes(normalize(kw)))) {
    return 'sentimento_negativo'
  }

  // Gatilho 3: intenção de fechamento
  if (CLOSING_KEYWORDS.some(kw => text.includes(kw))) {
    return 'intencao_fechamento'
  }

  // Gatilho 4: IA sem resposta após 2 tentativas
  if (context.aiFailedAttempts >= 2) {
    return 'ia_sem_resposta'
  }

  // Gatilho 5: 5+ mensagens sem resolução
  if (context.messageCount >= 5) {
    return 'muitas_mensagens'
  }

  // Gatilho 6: fora do horário comercial
  if (!context.isWithinBusinessHours) {
    return 'fora_horario_comercial'
  }

  return null
}

// ---------------------------------------------------------------------------
// Mensagens de sentimento — enviadas ao lead e ao corretor quando sentimento negativo
// ---------------------------------------------------------------------------

export function buildSentimentWaitMessage(): string {
  return 'Só um momento, por favor. Estou verificando as informações para melhor atender você.'
}

export function buildCorretorAlert(leadPhone: string, tenantId: string): string {
  return `[ImobPro] Atencao: o lead ${leadPhone} (tenant: ${tenantId}) demonstra insatisfacao na conversa. Acesse o painel para assumir o atendimento.`
}

// Mensagem de retomada quando o corretor não assume em 15min após handoff.
// Reconhece a espera sem prometer prazo nem depreciar o corretor.
export function buildHandoffTimeoutResumeMessage(): string {
  return 'Continuo à disposição. O corretor vai retornar assim que possível, e enquanto isso podemos seguir.'
}

// ---------------------------------------------------------------------------
// Mensagem de retorno fora do horário comercial
// ---------------------------------------------------------------------------

export function getBusinessHoursMessage(
  customMessage: string | null,
  schedule?: BusinessHoursConfig
): string {
  const trimmed = customMessage?.trim()
  if (trimmed && trimmed.length > 0) return trimmed

  const nextDay = getNextBusinessDay(schedule)
  return (
    `Olá! Recebemos sua mensagem.\n\n` +
    `No momento estamos fora do horário de atendimento, mas nossa equipe retornará seu contato na ${nextDay}.\n\n` +
    `Seus dados já foram registrados e um corretor entrará em contato em breve.`
  )
}

// ---------------------------------------------------------------------------
// Z-API client — envio de mensagens
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Envio idempotente ao lead
// ---------------------------------------------------------------------------
// Cada (jobId, label) só dispara um sendText. O jobId aqui é o id interno do
// BullMQ (gerado por Worker, único por job e estável em retries do mesmo job).
// Reentregas após stalled pulam o envio. Em caso de erro durante o sendText,
// runOnce libera a flag para que o próximo retry do BullMQ possa reenviar.

export async function sendTextOnce(
  zapi: ZApiClient,
  jobId: string,
  label: string,
  payload: ZApiSendTextPayload,
): Promise<boolean> {
  // Breadcrumb pra reconstruir o caminho no Sentry quando o job falha — mostra
  // o que tentamos enviar antes da exceção. Não polui logs em sucesso (Sentry
  // só anexa breadcrumbs quando reporta um evento).
  addExternalCallBreadcrumb({
    service: 'zapi',
    operation: `sendText:${label}`,
    data: { phone: maskPhone(payload.phone), jobId },
  })
  const result = await runOnce(jobId, `sendText:${label}`, () => zapi.sendText(payload))
  return result.ran
}

export function buildZApiClient(instanceId: string, token: string): ZApiClient {
  const baseUrl = process.env.ZAPI_BASE_URL ?? 'https://api.z-api.io'

  return {
    async sendText(payload: ZApiSendTextPayload): Promise<void> {
      const url = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Z-API sendText falhou [${response.status}]: ${body}`)
      }
    },
  }
}
