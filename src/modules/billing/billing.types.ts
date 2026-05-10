export type SubscriptionStatus = 'trial' | 'expired' | 'active' | 'canceled'

export interface Subscription {
  tenantId: string
  status: SubscriptionStatus
  trialStartedAt: string
  trialEndsAt: string
  trialMessageCount: number
  planId: string | null
  subscribedAt: string | null
  canceledAt: string | null
}

export interface SubscriptionView extends Subscription {
  trialMessageLimit: number
  trialMessagesRemaining: number
  trialDaysRemaining: number
  accessAllowed: boolean
}
