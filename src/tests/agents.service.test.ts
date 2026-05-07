import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../shared/database/supabase'
import {
  getHandoffTargetPhone,
  findActiveAgentByUserId,
  AgentLookupError,
} from '../modules/agents/agents.service'
import { queueFromResponses } from './helpers/supabase-mock'

const fromMock = supabase.from as ReturnType<typeof vi.fn>

beforeEach(() => {
  fromMock.mockReset()
})

// ---------------------------------------------------------------------------
// getHandoffTargetPhone
// ---------------------------------------------------------------------------

describe('getHandoffTargetPhone', () => {
  it('retorna o agent atribuído ao lead quando está ativo e tem phone', async () => {
    queueFromResponses(fromMock, [
      { data: { agent_id: 'agent-1' }, error: null },
      { data: { id: 'agent-1', phone: '5521988887777', active: true }, error: null },
    ])

    const result = await getHandoffTargetPhone('tenant-A', 'lead-1')

    expect(result).toEqual({ phone: '5521988887777', agentId: 'agent-1' })
  })

  it('cai no fallback quando o agent atribuído está inativo', async () => {
    queueFromResponses(fromMock, [
      { data: { agent_id: 'agent-1' }, error: null },
      { data: { id: 'agent-1', phone: '5521988887777', active: false }, error: null },
      { data: { id: 'agent-2', phone: '5521977776666' }, error: null },
    ])

    const result = await getHandoffTargetPhone('tenant-A', 'lead-1')

    expect(result).toEqual({ phone: '5521977776666', agentId: 'agent-2' })
  })

  it('usa fallback quando o lead não tem agent_id', async () => {
    queueFromResponses(fromMock, [
      { data: { agent_id: null }, error: null },
      { data: { id: 'agent-fallback', phone: '5521966665555' }, error: null },
    ])

    const result = await getHandoffTargetPhone('tenant-A', 'lead-2')

    expect(result).toEqual({ phone: '5521966665555', agentId: 'agent-fallback' })
  })

  it('cai no fallback quando o agent atribuído existe mas não tem phone', async () => {
    queueFromResponses(fromMock, [
      { data: { agent_id: 'agent-1' }, error: null },
      { data: { id: 'agent-1', phone: null, active: true }, error: null },
      { data: { id: 'agent-2', phone: '5521955554444' }, error: null },
    ])

    const result = await getHandoffTargetPhone('tenant-A', 'lead-3')

    expect(result).toEqual({ phone: '5521955554444', agentId: 'agent-2' })
  })

  it('retorna null quando não há nenhum agent ativo com phone', async () => {
    queueFromResponses(fromMock, [
      { data: null, error: null },
      { data: null, error: null },
    ])

    const result = await getHandoffTargetPhone('tenant-A', 'lead-4')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// findActiveAgentByUserId
// ---------------------------------------------------------------------------

describe('findActiveAgentByUserId', () => {
  it('retorna o agent quando ativo', async () => {
    queueFromResponses(fromMock, [
      {
        data: { id: 'agent-1', tenant_id: 'tenant-A', active: true },
        error: null,
      },
    ])

    const result = await findActiveAgentByUserId('user-1')

    expect(result).toEqual({ id: 'agent-1', tenantId: 'tenant-A', active: true })
  })

  it('retorna null quando o user não tem agent ativo', async () => {
    // Query agora filtra por active=true direto no banco, então o resultado é simplesmente "no rows"
    queueFromResponses(fromMock, [{ data: null, error: null }])

    const result = await findActiveAgentByUserId('user-x')

    expect(result).toBeNull()
  })

  it('lança AgentLookupError em caso de erro do Supabase', async () => {
    queueFromResponses(fromMock, [{ data: null, error: { message: 'boom' } }])

    await expect(findActiveAgentByUserId('user-1')).rejects.toBeInstanceOf(AgentLookupError)
  })
})
