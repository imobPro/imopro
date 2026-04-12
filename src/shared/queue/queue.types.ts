export type MessageType = 'text' | 'audio' | 'image' | 'document' | 'sticker' | 'location'

export interface WhatsAppMessageJob {
  jobId: string
  tenantId: string        // client_id — isolamento multi-tenant obrigatório
  instanceId: string      // Z-API instance do tenant
  phone: string           // número do lead (formato: 5521999999999)
  messageId: string       // ID Z-API para deduplicação
  type: MessageType
  text: string | null     // conteúdo de texto (null para mídias)
  mediaUrl: string | null // URL da mídia para processamento (Sprint 2)
  mimeType: string | null // ex: 'audio/ogg', 'image/jpeg'
  timestamp: number       // unix timestamp em ms
  isFromMe: boolean       // true = ignorar (mensagem enviada pelo próprio número)
}
