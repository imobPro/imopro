import type { LeadStatus } from '../leads/leads.types'

export type PeriodType = 'weekly' | 'monthly'

export interface Report {
  id: string
  tenantId: string
  agentId: string
  periodType: PeriodType
  periodStart: string
  periodEnd: string
  generatedAt: string
  filePath: string
  sentAt: string | null
  error: string | null
}

export interface ReportPeriod {
  type: PeriodType
  start: Date
  end: Date
}

export interface ReportMetrics {
  agentName: string
  realtyName: string
  period: ReportPeriod
  leadsCount: number
  funnel: Record<LeadStatus, number>
  avgQualificationHours: number | null
  avgClosingHours: number | null
}
