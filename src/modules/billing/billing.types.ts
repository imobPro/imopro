export type SubscriptionStatus = 'trial' | 'expired' | 'active' | 'canceled'

export interface Subscription {
  tenantId: string
  status: SubscriptionStatus
  // null enquanto o trial não começou (WhatsApp não conectado).
  trialStartedAt: string | null
  trialEndsAt: string | null
  trialMessageCount: number
  planId: string | null
  subscribedAt: string | null
  canceledAt: string | null
}

export interface SubscriptionView extends Subscription {
  trialMessageLimit: number
  trialMessagesRemaining: number
  // Dias restantes do trial. Quando o trial ainda não começou, vale o período
  // cheio (TRIAL_DAYS) — é o que o cliente terá assim que conectar o WhatsApp.
  trialDaysRemaining: number
  // false enquanto trialStartedAt for null (trial pendente — falta conectar).
  trialStarted: boolean
  accessAllowed: boolean
}
