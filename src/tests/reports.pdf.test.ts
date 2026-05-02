import { describe, it, expect } from 'vitest'
import { renderReportPdf } from '../modules/reports/reports.pdf'
import { buildPeriod } from '../modules/reports/reports.metrics'
import type { ReportMetrics } from '../modules/reports/reports.types'

describe('renderReportPdf', () => {
  it('gera Buffer não-vazio começando com header PDF (%PDF-)', async () => {
    const metrics: ReportMetrics = {
      agentName: 'Arthur CG',
      realtyName: 'Imobiliária Teste',
      period: buildPeriod('monthly', new Date(Date.UTC(2026, 4, 15))),
      leadsCount: 12,
      funnel: {
        novo: 4,
        em_conversa: 2,
        qualificado: 3,
        transferido: 1,
        em_negociacao: 1,
        fechado: 1,
        inativo: 0,
      },
      avgQualificationHours: 3.5,
      avgClosingHours: 48,
    }

    const buffer = await renderReportPdf(metrics)

    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(1000)
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-')
  }, 15_000)

  it('aceita métricas de tempo nulas (mostra "—" no PDF)', async () => {
    const metrics: ReportMetrics = {
      agentName: 'Arthur CG',
      realtyName: 'Imobiliária Teste',
      period: buildPeriod('weekly', new Date(Date.UTC(2026, 4, 18))),
      leadsCount: 0,
      funnel: {
        novo: 0,
        em_conversa: 0,
        qualificado: 0,
        transferido: 0,
        em_negociacao: 0,
        fechado: 0,
        inativo: 0,
      },
      avgQualificationHours: null,
      avgClosingHours: null,
    }

    const buffer = await renderReportPdf(metrics)
    expect(buffer.length).toBeGreaterThan(500)
  }, 15_000)
})
