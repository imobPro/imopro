import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

import { calcScoreDelta, getConversationHistory } from '../modules/leads/leads.service'
import { supabase } from '../shared/database/supabase'

// ---------------------------------------------------------------------------
// calcScoreDelta
// ---------------------------------------------------------------------------

describe('calcScoreDelta', () => {
  it('retorna 2 para visita', () => {
    expect(calcScoreDelta('visita')).toBe(2)
  })

  it('retorna 1 para compra', () => {
    expect(calcScoreDelta('compra')).toBe(1)
  })

  it('retorna 1 para aluguel', () => {
    expect(calcScoreDelta('aluguel')).toBe(1)
  })

  it('retorna 1 para venda', () => {
    expect(calcScoreDelta('venda')).toBe(1)
  })

  it('retorna 0 para informacao', () => {
    expect(calcScoreDelta('informacao')).toBe(0)
  })

  it('retorna 0 para desconhecido', () => {
    expect(calcScoreDelta('desconhecido')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getConversationHistory — RPC unificada (migration 010)
// ---------------------------------------------------------------------------

describe('getConversationHistory', () => {
  const rpc = supabase.rpc as ReturnType<typeof vi.fn>

  beforeEach(() => {
    rpc.mockReset()
  })

  it('chama RPC com tenant_id, lead_id e limit padrão', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null })

    await getConversationHistory('tenant-1', 'lead-1')

    expect(rpc).toHaveBeenCalledWith('get_conversation_history', {
      p_tenant_id: 'tenant-1',
      p_lead_id: 'lead-1',
      p_limit: 20,
    })
  })

  it('respeita limit customizado', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null })

    await getConversationHistory('tenant-1', 'lead-1', 5)

    expect(rpc).toHaveBeenCalledWith('get_conversation_history', {
      p_tenant_id: 'tenant-1',
      p_lead_id: 'lead-1',
      p_limit: 5,
    })
  })

  it('inverte ordem DESC do banco para ASC (esperado pela IA)', async () => {
    // RPC retorna mais recente primeiro
    rpc.mockResolvedValueOnce({
      data: [
        { role: 'assistant', content: 'última resposta' },
        { role: 'user', content: 'última pergunta' },
        { role: 'assistant', content: 'primeira resposta' },
        { role: 'user', content: 'primeira pergunta' },
      ],
      error: null,
    })

    const history = await getConversationHistory('tenant-1', 'lead-1')

    expect(history).toEqual([
      { role: 'user', content: 'primeira pergunta' },
      { role: 'assistant', content: 'primeira resposta' },
      { role: 'user', content: 'última pergunta' },
      { role: 'assistant', content: 'última resposta' },
    ])
  })

  it('retorna array vazio quando RPC devolve null/vazio', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    expect(await getConversationHistory('tenant-1', 'lead-1')).toEqual([])

    rpc.mockResolvedValueOnce({ data: [], error: null })
    expect(await getConversationHistory('tenant-1', 'lead-1')).toEqual([])
  })

  it('retorna array vazio quando RPC retorna erro (não derruba o atendimento)', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'function get_conversation_history does not exist' },
    })

    const history = await getConversationHistory('tenant-1', 'lead-1')
    expect(history).toEqual([])
  })
})
