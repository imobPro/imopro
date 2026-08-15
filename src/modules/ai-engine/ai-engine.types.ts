export interface AgentConfig {
  tenantId: string
  agentName: string       // ex: "Ana" ou "Assistente Virtual"
  realtyName: string      // nome da imobiliária
  welcomeMessage?: string | null // tom/identidade da marca — entra no system prompt
  specialties?: string[]  // ex: ["zona norte", "imóveis comerciais"]
  agentPhone?: string     // número do corretor para handoff
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// IntentType e PendingMessage — fonte de verdade em src/shared/types/domain.ts
import type { IntentType, PendingMessage } from '../../shared/types/domain'
export type { IntentType, PendingMessage } from '../../shared/types/domain'

export type TransferReason =
  | 'pedido_explicito'
  | 'intencao_fechamento'
  | 'ia_sem_resposta'

export interface AIResponse {
  text: string
  intent: IntentType
  shouldTransfer: boolean
  transferReason?: TransferReason
}

export interface GenerateResponseInput {
  pendingMessages: PendingMessage[]
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  config: AgentConfig
  tenantId: string
  phone: string
  // Quando true, IA usa o prompt preparatório (handoff em curso): conduz a espera,
  // não pede nova transferência, descarta marker [TRANSFER:] se aparecer.
  handoffMode?: boolean
}
