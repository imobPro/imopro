import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../shared/database/supabase'
import { getHandoffTargetPhone, findActiveAgentByUserId } from '../modules/agents/agents.service'

type QueryResult = { data: unknown; error: unknown }

function chain(result: QueryResult) {
  const self = {
    select: () => self,
    eq: () => self,
    not: () => self,
    order: () => self,
    limit: () => self,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
  }
  return self
}

function queueFromResponses(...responses: QueryResult[]) {
  const queue = [...responses]
  ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const next = queue.shift() ?? { data: null, error: null }
    return chain(next)
  })
}

beforeEach(() => {
  (supabase.from as ReturnType<typeof vi.fn>).mockReset()
})

// ---------------------------------------------------------------------------
// getHandoffTargetPhone
// ---------------------------------------------------------------------------

describe('getHandoffTargetPhone', () => {
  it('retorna o agent atribuído ao lead quando está ativo e tem phone', async () => {
    queueFromResponses(
      { data: { agent_id: 'agent-1' }, error: null },
      { data: { id: 'agent-1', phone: '5521988887777', active: true }, error: null }
    )

    const result = await getHandoffTargetPhone('tenant-A', 'lead-1')

    expect(result).toEqual({ phone: '5521988887777', agentId: 'agent-1' })
  })

  it('cai no fallback quando o agent atribuído está inativo', async () => {
    queueFromResponses(
      { data: { agent_id: 'agent-1' }, error: null },
      { data: { id: 'agent-1', phone: '5521988887777', active: false }, error: null },
      { data: { id: 'agent-2', phone: '5521977776666' }, error: null }
    )

    const result = await getHandoffTargetPhone('tenant-A', 'lead-1')

    expect(result).toEqual({ phone: '5521977776666', agentId: 'agent-2' })
  })

  it('usa fallback quando o lead não tem agent_id', async () => {
    queueFromResponses(
      { data: { agent_id: null }, error: null },
      { data: { id: 'agent-fallback', phone: '5521966665555' }, error: null }
    )

    const result = await getHandoffTargetPhone('tenant-A', 'lead-2')

    expect(result).toEqual({ phone: '5521966665555', agentId: 'agent-fallback' })
  })

  it('cai no fallback quando o agent atribuído existe mas não tem phone', async () => {
    queueFromResponses(
      { data: { agent_id: 'agent-1' }, error: null },
      { data: { id: 'agent-1', phone: null, active: true }, error: null },
      { data: { id: 'agent-2', phone: '5521955554444' }, error: null }
    )

    const result = await getHandoffTargetPhone('tenant-A', 'lead-3')

    expect(result).toEqual({ phone: '5521955554444', agentId: 'agent-2' })
  })

  it('retorna null quando não há nenhum agent ativo com phone', async () => {
    queueFromResponses(
      { data: null, error: null },
      { data: null, error: null }
    )

    const result = await getHandoffTargetPhone('tenant-A', 'lead-4')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// findActiveAgentByUserId
// ---------------------------------------------------------------------------

describe('findActiveAgentByUserId', () => {
  it('retorna o agent quando ativo', async () => {
    queueFromResponses({
      data: { id: 'agent-1', tenant_id: 'tenant-A', active: true },
      error: null,
    })

    const result = await findActiveAgentByUserId('user-1')

    expect(result).toEqual({ id: 'agent-1', tenantId: 'tenant-A', active: true })
  })

  it('retorna null quando o agent está inativo', async () => {
    queueFromResponses({
      data: { id: 'agent-1', tenant_id: 'tenant-A', active: false },
      error: null,
    })

    const result = await findActiveAgentByUserId('user-1')

    expect(result).toBeNull()
  })

  it('retorna null quando o user não tem agent', async () => {
    queueFromResponses({ data: null, error: null })

    const result = await findActiveAgentByUserId('user-x')

    expect(result).toBeNull()
  })

  it('retorna null em caso de erro do Supabase', async () => {
    queueFromResponses({ data: null, error: { message: 'boom' } })

    const result = await findActiveAgentByUserId('user-1')

    expect(result).toBeNull()
  })
})
