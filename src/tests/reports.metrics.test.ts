import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../shared/database/supabase'
import {
  buildPeriod,
  getLeadsCount,
  getFunnelCounts,
  getAvgQualificationHours,
  getAvgClosingHours,
} from '../modules/reports/reports.metrics'

type QueryResult = { data?: unknown; error?: unknown; count?: number | null }

function chain(result: QueryResult) {
  const self: Record<string, unknown> = {}
  const wrap = () => self
  Object.assign(self, {
    select: wrap,
    eq: wrap,
    gte: wrap,
    lt: wrap,
    not: wrap,
    is: wrap,
    order: wrap,
    limit: wrap,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    // PostgREST head:true leaves the chain awaitable
    then: (resolve: (v: QueryResult) => void) => resolve(result),
  })
  return self
}

function mockOnce(result: QueryResult) {
  ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementationOnce(() => chain(result))
}

beforeEach(() => {
  ;(supabase.from as ReturnType<typeof vi.fn>).mockReset()
})

// ---------------------------------------------------------------------------
// buildPeriod
// ---------------------------------------------------------------------------

describe('buildPeriod', () => {
  it('mensal: cobre o mês anterior inteiro a partir da data de referência', () => {
    const ref = new Date(Date.UTC(2026, 4, 15)) // 15-mai-2026
    const period = buildPeriod('monthly', ref)

    expect(period.type).toBe('monthly')
    expect(period.start.toISOString()).toBe('2026-04-01T00:00:00.000Z')
    expect(period.end.toISOString()).toBe('2026-05-01T00:00:00.000Z')
  })

  it('semanal: vai da segunda anterior à segunda corrente (UTC)', () => {
    const ref = new Date(Date.UTC(2026, 4, 18)) // segunda 18-mai-2026
    const period = buildPeriod('weekly', ref)

    expect(period.type).toBe('weekly')
    expect(period.start.toISOString()).toBe('2026-05-11T00:00:00.000Z')
    expect(period.end.toISOString()).toBe('2026-05-18T00:00:00.000Z')
  })

  it('semanal a partir de domingo: pula para segunda anterior', () => {
    const ref = new Date(Date.UTC(2026, 4, 17)) // domingo 17-mai-2026
    const period = buildPeriod('weekly', ref)

    expect(period.start.toISOString()).toBe('2026-05-04T00:00:00.000Z')
    expect(period.end.toISOString()).toBe('2026-05-11T00:00:00.000Z')
  })
})

// ---------------------------------------------------------------------------
// getLeadsCount
// ---------------------------------------------------------------------------

describe('getLeadsCount', () => {
  it('devolve count quando o head:true responde', async () => {
    mockOnce({ count: 7, error: null })
    const period = buildPeriod('monthly', new Date(Date.UTC(2026, 4, 15)))

    const total = await getLeadsCount('tenant-A', 'agent-1', period)
    expect(total).toBe(7)
  })

  it('devolve 0 em caso de erro', async () => {
    mockOnce({ count: null, error: { message: 'boom' } })
    const period = buildPeriod('monthly', new Date(Date.UTC(2026, 4, 15)))

    const total = await getLeadsCount('tenant-A', 'agent-1', period)
    expect(total).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getFunnelCounts
// ---------------------------------------------------------------------------

describe('getFunnelCounts', () => {
  it('agrupa leads por status, zerando categorias ausentes', async () => {
    mockOnce({
      data: [
        { status: 'novo' },
        { status: 'novo' },
        { status: 'qualificado' },
        { status: 'fechado' },
        { status: 'inativo' },
      ],
      error: null,
    })

    const counts = await getFunnelCounts('tenant-A', 'agent-1')
    expect(counts.novo).toBe(2)
    expect(counts.qualificado).toBe(1)
    expect(counts.fechado).toBe(1)
    expect(counts.inativo).toBe(1)
    expect(counts.em_conversa).toBe(0)
    expect(counts.transferido).toBe(0)
    expect(counts.em_negociacao).toBe(0)
  })

  it('retorna tudo zerado em caso de erro', async () => {
    mockOnce({ data: null, error: { message: 'boom' } })

    const counts = await getFunnelCounts('tenant-A', 'agent-1')
    expect(counts.novo).toBe(0)
    expect(counts.qualificado).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getAvgQualificationHours / getAvgClosingHours
// ---------------------------------------------------------------------------

describe('getAvgQualificationHours', () => {
  const period = buildPeriod('monthly', new Date(Date.UTC(2026, 4, 15)))

  it('média em horas com 1 casa decimal', async () => {
    mockOnce({
      data: [
        // 2h depois
        { created_at: '2026-04-10T10:00:00.000Z', qualified_at: '2026-04-10T12:00:00.000Z' },
        // 4h depois
        { created_at: '2026-04-12T08:00:00.000Z', qualified_at: '2026-04-12T12:00:00.000Z' },
      ],
      error: null,
    })

    const avg = await getAvgQualificationHours('tenant-A', 'agent-1', period)
    expect(avg).toBe(3)
  })

  it('null quando ninguém qualificou no período', async () => {
    mockOnce({ data: [], error: null })
    const avg = await getAvgQualificationHours('tenant-A', 'agent-1', period)
    expect(avg).toBeNull()
  })

  it('null em caso de erro', async () => {
    mockOnce({ data: null, error: { message: 'boom' } })
    const avg = await getAvgQualificationHours('tenant-A', 'agent-1', period)
    expect(avg).toBeNull()
  })
})

describe('getAvgClosingHours', () => {
  it('média em horas (24h vira 24)', async () => {
    mockOnce({
      data: [
        { created_at: '2026-04-10T10:00:00.000Z', closed_at: '2026-04-11T10:00:00.000Z' },
      ],
      error: null,
    })
    const period = buildPeriod('monthly', new Date(Date.UTC(2026, 4, 15)))
    const avg = await getAvgClosingHours('tenant-A', 'agent-1', period)
    expect(avg).toBe(24)
  })
})
