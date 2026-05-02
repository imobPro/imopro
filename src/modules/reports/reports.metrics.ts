import { supabase } from '../../shared/database/supabase'
import type { LeadStatus } from '../leads/leads.types'
import type { PeriodType, ReportMetrics, ReportPeriod } from './reports.types'

const ALL_STATUSES: LeadStatus[] = [
  'novo',
  'em_conversa',
  'qualificado',
  'transferido',
  'em_negociacao',
  'fechado',
  'inativo',
]

const MS_PER_HOUR = 60 * 60 * 1000

// -----------------------------------------------------------------------------
// Período (semana corrente, mês anterior, etc.)
// -----------------------------------------------------------------------------

export function buildPeriod(type: PeriodType, reference: Date = new Date()): ReportPeriod {
  if (type === 'monthly') {
    // Mês anterior completo: primeiro ao último dia
    const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1, 0, 0, 0))
    const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1, 0, 0, 0))
    return { type, start, end }
  }

  // Semana anterior: segunda 00:00 → segunda 00:00 (UTC)
  // Convenção: roda toda segunda de manhã, fechando a semana que terminou no domingo
  const dayOfWeek = reference.getUTCDay() // 0=domingo, 1=segunda
  const daysSinceMonday = dayOfWeek === 0 ? 7 : dayOfWeek
  const thisMonday = new Date(reference)
  thisMonday.setUTCHours(0, 0, 0, 0)
  thisMonday.setUTCDate(reference.getUTCDate() - daysSinceMonday + 1)
  const lastMonday = new Date(thisMonday)
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7)
  return { type: 'weekly', start: lastMonday, end: thisMonday }
}

// -----------------------------------------------------------------------------
// Total de leads novos no período (por agent)
// -----------------------------------------------------------------------------

export async function getLeadsCount(
  tenantId: string,
  agentId: string,
  period: ReportPeriod
): Promise<number> {
  const { count, error } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .gte('created_at', period.start.toISOString())
    .lt('created_at', period.end.toISOString())

  if (error) {
    console.error(`[Reports] getLeadsCount falhou | agent=${agentId} erro=${error.message}`)
    return 0
  }
  return count ?? 0
}

// -----------------------------------------------------------------------------
// Funil: contagem por status atual dos leads do agent (snapshot no momento
// da geração — não retroativo). Inclui leads criados em qualquer momento.
// -----------------------------------------------------------------------------

export async function getFunnelCounts(
  tenantId: string,
  agentId: string
): Promise<Record<LeadStatus, number>> {
  const result = ALL_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<LeadStatus, number>
  )

  const { data, error } = await supabase
    .from('leads')
    .select('status')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)

  if (error) {
    console.error(`[Reports] getFunnelCounts falhou | agent=${agentId} erro=${error.message}`)
    return result
  }

  for (const row of data as Array<{ status: LeadStatus }>) {
    if (row.status in result) result[row.status] += 1
  }
  return result
}

// -----------------------------------------------------------------------------
// Tempo médio entre criação e qualificação (em horas) — leads qualificados
// dentro do período. Retorna null se nenhum lead foi qualificado no período.
// -----------------------------------------------------------------------------

export async function getAvgQualificationHours(
  tenantId: string,
  agentId: string,
  period: ReportPeriod
): Promise<number | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('created_at, qualified_at')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .not('qualified_at', 'is', null)
    .gte('qualified_at', period.start.toISOString())
    .lt('qualified_at', period.end.toISOString())

  if (error) {
    console.error(`[Reports] getAvgQualificationHours falhou | agent=${agentId} erro=${error.message}`)
    return null
  }
  return averageHours(data as Array<{ created_at: string; qualified_at: string }>, 'qualified_at')
}

// -----------------------------------------------------------------------------
// Tempo médio entre criação e fechamento (em horas) — leads fechados no período
// -----------------------------------------------------------------------------

export async function getAvgClosingHours(
  tenantId: string,
  agentId: string,
  period: ReportPeriod
): Promise<number | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('created_at, closed_at')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .not('closed_at', 'is', null)
    .gte('closed_at', period.start.toISOString())
    .lt('closed_at', period.end.toISOString())

  if (error) {
    console.error(`[Reports] getAvgClosingHours falhou | agent=${agentId} erro=${error.message}`)
    return null
  }
  return averageHours(data as Array<{ created_at: string; closed_at: string }>, 'closed_at')
}

function averageHours<T extends { created_at: string }>(
  rows: T[],
  endField: keyof T
): number | null {
  if (rows.length === 0) return null
  const totalMs = rows.reduce((sum, r) => {
    const start = new Date(r.created_at).getTime()
    const end = new Date(r[endField] as string).getTime()
    return sum + Math.max(0, end - start)
  }, 0)
  return Math.round((totalMs / rows.length / MS_PER_HOUR) * 10) / 10
}

// -----------------------------------------------------------------------------
// Compose: junta tudo num único payload pra alimentar o renderizador de PDF
// -----------------------------------------------------------------------------

export async function buildMetrics(params: {
  tenantId: string
  agentId: string
  agentName: string
  realtyName: string
  period: ReportPeriod
}): Promise<ReportMetrics> {
  const { tenantId, agentId, agentName, realtyName, period } = params

  const [leadsCount, funnel, avgQualificationHours, avgClosingHours] = await Promise.all([
    getLeadsCount(tenantId, agentId, period),
    getFunnelCounts(tenantId, agentId),
    getAvgQualificationHours(tenantId, agentId, period),
    getAvgClosingHours(tenantId, agentId, period),
  ])

  return { agentName, realtyName, period, leadsCount, funnel, avgQualificationHours, avgClosingHours }
}
