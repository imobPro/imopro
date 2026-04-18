import type { IntentType } from '../ai-engine/ai-engine.types'
import type { MessageType } from '../../shared/queue/queue.types'
// LeadProfile é a fonte de verdade em whatsapp.types — importado e re-exportado daqui
import type { LeadProfile as _LeadProfile } from '../whatsapp/whatsapp.types'
export type { LeadProfile } from '../whatsapp/whatsapp.types'
type LeadProfile = _LeadProfile

export type LeadStatus =
  | 'novo'
  | 'em_conversa'
  | 'qualificado'
  | 'transferido'
  | 'em_negociacao'
  | 'fechado'

export interface Lead {
  id: string
  tenantId: string
  agentId: string | null
  phone: string
  name: string | null
  region: string | null
  status: LeadStatus
  score: number
  profile: LeadProfile | null
  intent: IntentType | null
  lastMessageAt: string | null
  inactiveFlaggedAt: string | null
  createdAt: string
}

export interface UpsertLeadParams {
  tenantId: string
  phone: string
  name?: string | null
  region?: string | null
  profile?: LeadProfile | null
  intent?: IntentType | null
}

export interface SaveConversationMessagesParams {
  tenantId: string
  leadId: string
  incomingMessages: IncomingMessage[]
  aiResponseText: string
  aiFailedAttempts: number
}

export interface IncomingMessage {
  zapiMessageId: string
  content: string
  type: MessageType
  mediaUrl: string | null
}
