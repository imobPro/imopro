import type { IntentType, LeadProfile } from '../../shared/types/domain'
import type { MessageType } from '../../shared/queue/queue.types'
export type { LeadProfile } from '../../shared/types/domain'

export type LeadStatus =
  | 'novo'
  | 'em_conversa'
  | 'qualificado'
  | 'transferido'
  | 'em_negociacao'
  | 'fechado'
  | 'inativo'

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
