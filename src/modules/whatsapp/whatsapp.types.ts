// ---------------------------------------------------------------------------
// Payload do webhook Z-API
// ---------------------------------------------------------------------------

export interface ZApiTextMessage {
  message: string
}

// URLs de mídia podem vir undefined quando o webhook Z-API entrega uma URL
// insegura (scheme != https, hostname privado, fora da MEDIA_HOST_ALLOWLIST):
// o refinement Zod em whatsapp.controller.ts substitui por undefined em vez
// de invalidar o payload inteiro. O worker filtra mensagens sem mediaUrl.
export interface ZApiAudioMessage {
  audioUrl?: string
  mimeType: string
}

export interface ZApiImageMessage {
  imageUrl?: string
  mimeType: string
  caption?: string
}

export interface ZApiDocumentMessage {
  documentUrl?: string
  mimeType: string
  fileName?: string
}

export interface ZApiLocationMessage {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface ZApiWebhookPayload {
  instanceId: string
  messageId: string
  phone: string          // número do remetente
  fromMe: boolean
  momment: number        // timestamp unix em ms (typo da Z-API — mantido intencional)
  status: string         // 'RECEIVED' | 'READ' | 'DELIVERED' etc.
  chatName: string
  senderName: string
  senderPhoto?: string
  // Tipos de mensagem — apenas um estará presente por payload
  text?: ZApiTextMessage
  audio?: ZApiAudioMessage
  image?: ZApiImageMessage
  document?: ZApiDocumentMessage
  location?: ZApiLocationMessage
  sticker?: { stickerUrl?: string }
  // Metadados
  isGroup: boolean
  connectedPhone: string // número da instância Z-API
}

// ---------------------------------------------------------------------------
// Perfis de lead — fonte de verdade em src/shared/types/domain.ts
// ---------------------------------------------------------------------------

export type { LeadProfile } from '../../shared/types/domain'

// ---------------------------------------------------------------------------
// Gatilhos de transferência para corretor humano — 6 situações
// ---------------------------------------------------------------------------

export type TransferReason =
  | 'pedido_explicito'        // lead pediu para falar com humano
  | 'sentimento_negativo'     // detectado pelo módulo de sentimento (Sprint 4)
  | 'intencao_fechamento'     // perguntou sobre visita, valor, condições de pagamento
  | 'ia_sem_resposta'         // IA não encontrou resposta após 2 tentativas
  | 'muitas_mensagens'        // 5+ mensagens sem resolução
  | 'fora_horario_comercial'  // fora do horário, registra para retorno no próximo dia útil

// ---------------------------------------------------------------------------
// Contexto de conversa passado ao worker para avaliar transferência
// ---------------------------------------------------------------------------

export interface ConversationContext {
  tenantId: string
  phone: string
  messageCount: number        // total de mensagens na conversa atual
  lastText: string | null
  aiFailedAttempts: number    // quantas vezes a IA não encontrou resposta
  isWithinBusinessHours: boolean
}

// ---------------------------------------------------------------------------
// Z-API client (envio de mensagens)
// ---------------------------------------------------------------------------

export interface ZApiSendTextPayload {
  phone: string
  message: string
}

export interface ZApiClient {
  sendText(payload: ZApiSendTextPayload): Promise<void>
}
