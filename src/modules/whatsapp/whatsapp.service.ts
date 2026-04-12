import { whatsappQueue } from '../../shared/queue/queues'
import { getNextBusinessDay } from '../../shared/utils/business-hours'
import type { WhatsAppMessageJob, MessageType } from '../../shared/queue/queue.types'
import type {
  ZApiWebhookPayload,
  LeadProfile,
  TransferReason,
  ConversationContext,
  ZApiClient,
  ZApiSendTextPayload,
} from './whatsapp.types'

// ---------------------------------------------------------------------------
// Enfileiramento de mensagens recebidas
// ---------------------------------------------------------------------------

export async function enqueueMessage(
  payload: ZApiWebhookPayload,
  tenantId: string
): Promise<void> {
  const type = detectMessageType(payload)

  const job: WhatsAppMessageJob = {
    jobId: payload.messageId,
    tenantId,
    instanceId: payload.instanceId,
    phone: payload.phone,
    messageId: payload.messageId,
    type,
    text: payload.text?.message ?? payload.image?.caption ?? null,
    mediaUrl: extractMediaUrl(payload),
    mimeType: extractMimeType(payload),
    timestamp: payload.momment,
    isFromMe: payload.fromMe,
  }

  await whatsappQueue.add(payload.messageId, job, {
    jobId: payload.messageId, // deduplicação por ID de mensagem
  })
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

const PROFILE_KEYWORDS: Record<LeadProfile, string[]> = {
  comprador: ['comprar', 'compra', 'quero comprar', 'financiamento', 'entrada', 'apartamento', 'casa'],
  inquilino: ['alugar', 'aluguel', 'locação', 'quero alugar', 'morar de aluguel'],
  vendedor: ['vender', 'venda', 'quero vender', 'meu imóvel', 'preciso vender'],
  captacao: ['administrar', 'administração', 'administração de imóvel', 'colocar para alugar'],
  investidor: ['investimento', 'investir', 'retorno', 'renda', 'revender', 'comprar para alugar'],
  indicador: ['indicar', 'indicação', 'meu amigo', 'minha amiga', 'conheço alguém'],
}

export function detectLeadProfile(text: string): LeadProfile | null {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  for (const [profile, keywords] of Object.entries(PROFILE_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      return profile as LeadProfile
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Avaliação dos gatilhos de transferência para corretor humano
// ---------------------------------------------------------------------------

const TRANSFER_KEYWORDS = [
  'falar com humano', 'falar com pessoa', 'falar com corretor',
  'quero atendimento humano', 'atendente humano', 'não quero falar com robô',
  'preciso de uma pessoa', 'me liga', 'podem me ligar',
]

const CLOSING_KEYWORDS = [
  'quero visitar', 'posso visitar', 'agendar visita', 'marcar visita',
  'qual o valor', 'qual o preço', 'condições de pagamento', 'entrada',
  'documentação', 'contrato', 'aceita proposta', 'tenho interesse',
]

export function shouldTransferToHuman(context: ConversationContext): TransferReason | null {
  const text = (context.lastText ?? '').toLowerCase()

  // Gatilho 1: pedido explícito
  if (TRANSFER_KEYWORDS.some(kw => text.includes(kw))) {
    return 'pedido_explicito'
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

  // Gatilho 2: sentimento_negativo — avaliado pelo módulo de sentimento (Sprint 4)

  return null
}

// ---------------------------------------------------------------------------
// Mensagem de retorno fora do horário comercial
// ---------------------------------------------------------------------------

export function getBusinessHoursMessage(tenantId: string): string {
  // tenantId será usado na Sprint 5 para buscar config personalizada do tenant
  void tenantId
  const nextDay = getNextBusinessDay()
  return (
    `Olá! Recebemos sua mensagem. 😊\n\n` +
    `No momento estamos fora do horário de atendimento, mas nossa equipe retornará seu contato na ${nextDay}.\n\n` +
    `Seus dados já foram registrados e um corretor entrará em contato em breve!`
  )
}

// ---------------------------------------------------------------------------
// Z-API client — envio de mensagens
// ---------------------------------------------------------------------------

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
