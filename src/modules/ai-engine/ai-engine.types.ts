export interface AgentConfig {
  tenantId: string
  agentName: string       // ex: "Ana" ou "Assistente Virtual"
  realtyName: string      // nome da imobiliária
  specialties?: string[]  // ex: ["zona norte", "imóveis comerciais"]
  agentPhone?: string     // número do corretor para handoff
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type IntentType =
  | 'compra'
  | 'aluguel'
  | 'venda'
  | 'informacao'
  | 'visita'
  | 'desconhecido'

export interface AIResponse {
  text: string
  intent: IntentType
  shouldTransfer: boolean
  transferReason?: string
}

export interface PendingMessage {
  text: string | null
  mediaUrl: string | null
  mimeType: string | null
  type: 'text' | 'audio' | 'image' | 'document' | 'sticker' | 'location'
  timestamp: number
}
