export {
  upsertLead,
  updateLeadStatus,
  scoreUp,
  saveConversationMessages,
  flagInactiveLeads,
  calcScoreDelta,
  getAiFailedAttempts,
} from './leads.service'

export type {
  Lead,
  LeadStatus,
  LeadProfile,
  UpsertLeadParams,
  SaveConversationMessagesParams,
  IncomingMessage,
} from './leads.types'
