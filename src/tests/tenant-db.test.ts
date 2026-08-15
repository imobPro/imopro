import { describe, it, expect, vi, beforeEach } from 'vitest'

// -----------------------------------------------------------------------------
// Testa que o wrapper tenantDb força o filtro/injeção de tenant_id em todas
// as operações de escrita/leitura em tabela de negócio.
//
// A trava é a razão de ser do arquivo — se estes testes ficarem verdes com
// asserção afrouxada (ex: `.toHaveBeenCalled()` sem verificar o argumento),
// a trava vira placebo. Não afrouxar sem discutir o design.
// -----------------------------------------------------------------------------

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), storage: {}, auth: {} },
}))

import { supabase } from '../shared/database/supabase'
import { tenantDb } from '../shared/database/tenant-db'

const fromMock = supabase.from as ReturnType<typeof vi.fn>

type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete'

interface QueryCall {
  op: Op
  args: unknown[]
  eqs: Array<[string, unknown]>
}

/**
 * Constrói um mock de query builder que registra a operação e o `.eq()`
 * imediatamente encadeado. Suficiente pra testar a asserção principal:
 * tenant_id sempre foi filtrado ou injetado.
 */
function makeQueryStub(record: QueryCall[]) {
  const stub: Record<string, unknown> = {}
  let current: QueryCall | null = null
  const track = (op: Op) =>
    (...args: unknown[]) => {
      current = { op, args, eqs: [] }
      record.push(current)
      return stub
    }
  Object.assign(stub, {
    select: track('select'),
    insert: track('insert'),
    upsert: track('upsert'),
    update: track('update'),
    delete: track('delete'),
    eq: (col: string, val: unknown) => {
      current?.eqs.push([col, val])
      return stub
    },
    // chainables adicionais que o wrapper não usa mas o consumer pode
    order: () => stub,
    limit: () => stub,
    maybeSingle: () => stub,
    single: () => stub,
  })
  return stub
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('tenantDb — validação de entrada', () => {
  it('lança se tenantId vazio', () => {
    expect(() => tenantDb('')).toThrow(/tenantId obrigatório/)
  })

  it('lança se tenantId não-string', () => {
    // @ts-expect-error — testando defesa em runtime
    expect(() => tenantDb(null)).toThrow(/tenantId obrigatório/)
    // @ts-expect-error — testando defesa em runtime
    expect(() => tenantDb(undefined)).toThrow(/tenantId obrigatório/)
    // @ts-expect-error — testando defesa em runtime
    expect(() => tenantDb(123)).toThrow(/tenantId obrigatório/)
  })
})

describe('tenantDb.from(...).select', () => {
  it('adiciona .eq(tenant_id, tenantId) ao select', () => {
    const record: QueryCall[] = []
    fromMock.mockReturnValueOnce(makeQueryStub(record))

    tenantDb('t-1').from('leads').select('id, status')

    expect(fromMock).toHaveBeenCalledWith('leads')
    expect(record).toHaveLength(1)
    expect(record[0].op).toBe('select')
    expect(record[0].args).toEqual(['id, status', undefined])
    expect(record[0].eqs).toEqual([['tenant_id', 't-1']])
  })

  it('preserva options do select (count, head)', () => {
    const record: QueryCall[] = []
    fromMock.mockReturnValueOnce(makeQueryStub(record))

    tenantDb('t-1').from('leads').select('id', { count: 'exact', head: true })

    expect(record[0].args).toEqual(['id', { count: 'exact', head: true }])
    expect(record[0].eqs).toEqual([['tenant_id', 't-1']])
  })
})

describe('tenantDb.from(...).insert', () => {
  it('injeta tenant_id no row (objeto único)', () => {
    const record: QueryCall[] = []
    fromMock.mockReturnValueOnce(makeQueryStub(record))

    tenantDb('t-1').from('leads').insert({ phone: '5521999999999', name: 'Ana' })

    expect(record[0].op).toBe('insert')
    expect(record[0].args[0]).toEqual({
      phone: '5521999999999',
      name: 'Ana',
      tenant_id: 't-1',
    })
  })

  it('injeta tenant_id em cada row do array', () => {
    const record: QueryCall[] = []
    fromMock.mockReturnValueOnce(makeQueryStub(record))

    tenantDb('t-1').from('messages').insert([
      { content: 'oi', role: 'user' },
      { content: 'olá', role: 'assistant' },
    ])

    expect(record[0].args[0]).toEqual([
      { content: 'oi', role: 'user', tenant_id: 't-1' },
      { content: 'olá', role: 'assistant', tenant_id: 't-1' },
    ])
  })

  it('sobrescreve tenant_id do payload — ninguém pode driblar o wrapper', () => {
    const record: QueryCall[] = []
    fromMock.mockReturnValueOnce(makeQueryStub(record))

    tenantDb('t-1').from('leads').insert({ phone: '55', tenant_id: 'tenant-alheio' })

    expect((record[0].args[0] as Record<string, unknown>).tenant_id).toBe('t-1')
  })
})

describe('tenantDb.from(...).upsert', () => {
  it('injeta tenant_id + preserva options (onConflict)', () => {
    const record: QueryCall[] = []
    fromMock.mockReturnValueOnce(makeQueryStub(record))

    tenantDb('t-1').from('conversations').upsert(
      { lead_id: 'lead-1', last_message_at: 'now' },
      { onConflict: 'tenant_id,lead_id', ignoreDuplicates: false },
    )

    expect(record[0].op).toBe('upsert')
    expect(record[0].args[0]).toEqual({
      lead_id: 'lead-1',
      last_message_at: 'now',
      tenant_id: 't-1',
    })
    expect(record[0].args[1]).toEqual({ onConflict: 'tenant_id,lead_id', ignoreDuplicates: false })
  })
})

describe('tenantDb.from(...).update', () => {
  it('adiciona .eq(tenant_id) ao update — sem update global possível', () => {
    const record: QueryCall[] = []
    fromMock.mockReturnValueOnce(makeQueryStub(record))

    tenantDb('t-1').from('leads').update({ status: 'novo' }).eq('id', 'lead-1')

    expect(record[0].op).toBe('update')
    expect(record[0].args[0]).toEqual({ status: 'novo' })
    // O primeiro .eq é o do wrapper (tenant_id); o do consumer (id) vem depois.
    expect(record[0].eqs).toEqual([
      ['tenant_id', 't-1'],
      ['id', 'lead-1'],
    ])
  })
})

describe('tenantDb.from(...).delete', () => {
  it('adiciona .eq(tenant_id) ao delete — sem delete global possível', () => {
    const record: QueryCall[] = []
    fromMock.mockReturnValueOnce(makeQueryStub(record))

    tenantDb('t-1').from('leads').delete().eq('id', 'lead-1')

    expect(record[0].op).toBe('delete')
    expect(record[0].eqs).toEqual([
      ['tenant_id', 't-1'],
      ['id', 'lead-1'],
    ])
  })
})

describe('tenantDb — escape hatches', () => {
  it('.raw devolve o cliente cru', () => {
    expect(tenantDb('t-1').raw).toBe(supabase)
  })

  it('.rpc delega para supabase.rpc', () => {
    const rpcMock = supabase.rpc as ReturnType<typeof vi.fn>
    rpcMock.mockReturnValueOnce('rpc-result')

    const result = tenantDb('t-1').rpc('increment_lead_score', {
      p_lead_id: 'l-1',
      p_tenant_id: 't-1',
      p_delta: 1,
    })

    expect(rpcMock).toHaveBeenCalledWith('increment_lead_score', {
      p_lead_id: 'l-1',
      p_tenant_id: 't-1',
      p_delta: 1,
    })
    expect(result).toBe('rpc-result')
  })

  it('.storage e .auth delegam para o cliente cru', () => {
    expect(tenantDb('t-1').storage).toBe(supabase.storage)
    expect(tenantDb('t-1').auth).toBe(supabase.auth)
  })
})
