import { supabase } from '../../shared/database/supabase'
import { sendEmail } from '../../shared/email'
import type { AgentForReports } from '../agents'
import { listAgentsForReports } from '../agents'
import { buildMetrics, buildPeriod } from './reports.metrics'
import { renderReportPdf } from './reports.pdf'
import { buildReportPath, uploadReportPdf } from './reports.storage'
import type { PeriodType, Report, ReportMetrics } from './reports.types'

// -----------------------------------------------------------------------------
// Pipeline público — chamado pelos handlers do cron (mensal e semanal)
// -----------------------------------------------------------------------------

export async function runReportsForAllAgents(periodType: PeriodType): Promise<{
  total: number
  ok: number
  failed: number
}> {
  const agents = await listAgentsForReports()
  let ok = 0
  let failed = 0

  for (const agent of agents) {
    try {
      await generateAndSendReportForAgent(agent, periodType)
      ok += 1
    } catch (err) {
      failed += 1
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Reports] Agent ${agent.agentId} falhou: ${msg}`)
    }
  }

  console.log(`[Reports] ${periodType} concluído | total=${agents.length} ok=${ok} falhou=${failed}`)
  return { total: agents.length, ok, failed }
}

// -----------------------------------------------------------------------------
// Pipeline por agent — exposto também para geração on-demand (testes/debug)
// -----------------------------------------------------------------------------

export async function generateAndSendReportForAgent(
  agent: AgentForReports,
  periodType: PeriodType
): Promise<{ reportId: string; emailId: string | null }> {
  const period = buildPeriod(periodType)
  const filePath = buildReportPath(agent.tenantId, agent.agentId, periodType, period.end)

  // Idempotência: se já existe report (mesmo agent+período+end), não regerar
  const { data: existing } = await supabase
    .from('reports')
    .select('id, sent_at')
    .eq('agent_id', agent.agentId)
    .eq('period_type', periodType)
    .eq('period_end', period.end.toISOString().slice(0, 10))
    .maybeSingle()

  if (existing && existing.sent_at) {
    console.log(`[Reports] Já enviado | agent=${agent.agentId} ${periodType}`)
    return { reportId: existing.id as string, emailId: null }
  }

  // 1. Métricas
  const metrics = await buildMetrics({
    tenantId: agent.tenantId,
    agentId: agent.agentId,
    agentName: agent.agentName,
    realtyName: agent.tenantName,
    period,
  })

  // 2. PDF
  const pdfBuffer = await renderReportPdf(metrics)

  // 3. Upload Storage (upsert: true sobrescreve se já existe)
  await uploadReportPdf(filePath, pdfBuffer)

  // 4. Persiste row em reports (upsert pra cobrir retry)
  const { data: report, error: insertError } = await supabase
    .from('reports')
    .upsert(
      {
        tenant_id: agent.tenantId,
        agent_id: agent.agentId,
        period_type: periodType,
        period_start: period.start.toISOString().slice(0, 10),
        period_end: period.end.toISOString().slice(0, 10),
        file_path: filePath,
        error: null,
      },
      { onConflict: 'agent_id,period_type,period_end', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (insertError || !report) {
    throw new Error(`[Reports] persist row falhou: ${insertError?.message ?? 'sem dados'}`)
  }

  // 5. E-mail com PDF anexado
  const subject = buildSubject(metrics)
  const html = buildHtml(metrics)
  const filename = buildFilename(agent, periodType, period.end)

  let emailId: string | null = null
  try {
    const sent = await sendEmail({
      to: agent.email,
      subject,
      html,
      attachments: [{ filename, content: pdfBuffer }],
    })
    emailId = sent.id

    await supabase
      .from('reports')
      .update({ sent_at: new Date().toISOString(), error: null })
      .eq('id', report.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('reports').update({ error: msg }).eq('id', report.id)
    throw err
  }

  return { reportId: report.id as string, emailId }
}

// -----------------------------------------------------------------------------
// Listagem (consumida pela rota GET /api/reports)
// -----------------------------------------------------------------------------

export async function listReportsForAgent(agentId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('agent_id', agentId)
    .order('period_end', { ascending: false })
    .limit(60)

  if (error) {
    console.error(`[Reports] listReportsForAgent falhou: ${error.message}`)
    return []
  }

  return (data ?? []).map(toReportDomain)
}

export async function getReportForAgent(
  agentId: string,
  reportId: string
): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('agent_id', agentId)
    .maybeSingle()

  if (error) {
    console.error(`[Reports] getReportForAgent falhou: ${error.message}`)
    return null
  }
  return data ? toReportDomain(data) : null
}

// -----------------------------------------------------------------------------
// Helpers de mapeamento e formatação de e-mail
// -----------------------------------------------------------------------------

function toReportDomain(row: Record<string, unknown>): Report {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    agentId: row.agent_id as string,
    periodType: row.period_type as PeriodType,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    generatedAt: row.generated_at as string,
    filePath: row.file_path as string,
    sentAt: (row.sent_at as string | null) ?? null,
    error: (row.error as string | null) ?? null,
  }
}

function buildSubject(metrics: ReportMetrics): string {
  const label = metrics.period.type === 'monthly' ? 'mensal' : 'semanal'
  const periodEnd = new Date(metrics.period.end.getTime() - 1).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  return `Relatório ${label} ImobPro · ${metrics.realtyName} · ${periodEnd}`
}

function buildHtml(metrics: ReportMetrics): string {
  const label = metrics.period.type === 'monthly' ? 'mensal' : 'semanal'
  return `
    <p>Olá, ${escapeHtml(metrics.agentName)}.</p>
    <p>Segue em anexo o seu relatório ${label} de atendimentos.</p>
    <p>Resumo do período:</p>
    <ul>
      <li>${metrics.leadsCount} leads recebidos</li>
      <li>${metrics.funnel.qualificado} qualificados (estado atual)</li>
      <li>${metrics.funnel.fechado} fechados (estado atual)</li>
    </ul>
    <p>Detalhes completos no PDF anexo.</p>
    <p>— ImobPro</p>
  `.trim()
}

function buildFilename(agent: AgentForReports, periodType: PeriodType, periodEnd: Date): string {
  const slug = agent.agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const dateStr = periodEnd.toISOString().slice(0, 10)
  return `${periodType === 'monthly' ? 'mensal' : 'semanal'}-${slug}-${dateStr}.pdf`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
