import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/queue/redis', () => ({
  redisConnection: { set: vi.fn() },
}))

import {
  detectLeadProfile,
  shouldTransferToHuman,
  markMessageSeen,
  buildHandoffTimeoutResumeMessage,
} from '../modules/whatsapp/whatsapp.service'
import { redisConnection } from '../shared/queue/redis'
import type { ConversationContext } from '../modules/whatsapp/whatsapp.types'

// ---------------------------------------------------------------------------
// detectLeadProfile
// ---------------------------------------------------------------------------

describe('detectLeadProfile', () => {
  it('detecta comprador', () => {
    expect(detectLeadProfile('quero comprar um apartamento')).toBe('comprador')
    expect(detectLeadProfile('preciso de financiamento')).toBe('comprador')
  })

  it('detecta inquilino', () => {
    expect(detectLeadProfile('quero alugar uma casa')).toBe('inquilino')
    expect(detectLeadProfile('busco imóvel para aluguel')).toBe('inquilino')
  })

  it('detecta vendedor', () => {
    expect(detectLeadProfile('preciso vender meu imóvel')).toBe('vendedor')
    expect(detectLeadProfile('quero vender minha casa')).toBe('vendedor')
  })

  it('detecta investidor', () => {
    expect(detectLeadProfile('quero comprar para alugar')).toBe('investidor')
    expect(detectLeadProfile('busco imóvel para investimento')).toBe('investidor')
  })

  it('retorna null para mensagem genérica', () => {
    expect(detectLeadProfile('oi, tudo bem?')).toBeNull()
    expect(detectLeadProfile('bom dia')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// shouldTransferToHuman
// ---------------------------------------------------------------------------

const baseContext = (): ConversationContext => ({
  tenantId: 'tenant-1',
  phone: '5521999999999',
  messageCount: 1,
  lastText: '',
  aiFailedAttempts: 0,
  isWithinBusinessHours: true,
})

describe('shouldTransferToHuman', () => {
  it('transfere por pedido explícito', () => {
    const ctx = { ...baseContext(), lastText: 'quero falar com corretor' }
    expect(shouldTransferToHuman(ctx)).toBe('pedido_explicito')
  })

  it('transfere por pedido explícito — variação com humano', () => {
    const ctx = { ...baseContext(), lastText: 'quero atendimento humano' }
    expect(shouldTransferToHuman(ctx)).toBe('pedido_explicito')
  })

  it('transfere por intenção de fechamento — visita', () => {
    const ctx = { ...baseContext(), lastText: 'quero visitar o apartamento' }
    expect(shouldTransferToHuman(ctx)).toBe('intencao_fechamento')
  })

  it('transfere por intenção de fechamento — proposta', () => {
    const ctx = { ...baseContext(), lastText: 'aceita proposta?' }
    expect(shouldTransferToHuman(ctx)).toBe('intencao_fechamento')
  })

  it('transfere por IA sem resposta após 2 tentativas', () => {
    const ctx = { ...baseContext(), aiFailedAttempts: 2 }
    expect(shouldTransferToHuman(ctx)).toBe('ia_sem_resposta')
  })

  it('transfere por muitas mensagens (5+)', () => {
    const ctx = { ...baseContext(), messageCount: 5 }
    expect(shouldTransferToHuman(ctx)).toBe('muitas_mensagens')
  })

  it('transfere por fora do horário comercial', () => {
    const ctx = { ...baseContext(), isWithinBusinessHours: false }
    expect(shouldTransferToHuman(ctx)).toBe('fora_horario_comercial')
  })

  it('não transfere em conversa normal dentro do horário', () => {
    const ctx = { ...baseContext(), lastText: 'quanto custa um apartamento de 2 quartos?' }
    expect(shouldTransferToHuman(ctx)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// markMessageSeen — idempotência por messageId
// ---------------------------------------------------------------------------

describe('markMessageSeen', () => {
  const set = redisConnection.set as ReturnType<typeof vi.fn>

  beforeEach(() => {
    set.mockReset()
  })

  it('retorna true na primeira vez que o messageId é visto', async () => {
    set.mockResolvedValueOnce('OK')

    const isFirstTime = await markMessageSeen('tenant-1', 'msg-abc')

    expect(isFirstTime).toBe(true)
    expect(set).toHaveBeenCalledWith('seen_msg:tenant-1:msg-abc', '1', 'EX', 86400, 'NX')
  })

  it('retorna false quando o mesmo messageId já foi marcado', async () => {
    set.mockResolvedValueOnce(null)

    const isFirstTime = await markMessageSeen('tenant-1', 'msg-abc')

    expect(isFirstTime).toBe(false)
  })

  it('isola dedup por tenant — mesmo messageId em tenants diferentes é tratado como novo', async () => {
    set.mockResolvedValueOnce('OK')
    set.mockResolvedValueOnce('OK')

    const a = await markMessageSeen('tenant-1', 'msg-abc')
    const b = await markMessageSeen('tenant-2', 'msg-abc')

    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(set).toHaveBeenNthCalledWith(1, 'seen_msg:tenant-1:msg-abc', '1', 'EX', 86400, 'NX')
    expect(set).toHaveBeenNthCalledWith(2, 'seen_msg:tenant-2:msg-abc', '1', 'EX', 86400, 'NX')
  })
})

// ---------------------------------------------------------------------------
// buildHandoffTimeoutResumeMessage — retomada após 15min sem corretor
// ---------------------------------------------------------------------------

describe('buildHandoffTimeoutResumeMessage', () => {
  it('reconhece a espera sem prometer prazo nem depreciar o corretor', () => {
    const msg = buildHandoffTimeoutResumeMessage()
    expect(msg).toContain('corretor')
    expect(msg.toLowerCase()).not.toMatch(/minutos?\b|hora|breve|imediato/)
    expect(msg.toLowerCase()).not.toMatch(/demor|ocupad|atras/)
  })

  it('mantém tom profissional sem cordialidade exagerada', () => {
    const msg = buildHandoffTimeoutResumeMessage()
    expect(msg).not.toMatch(/Claro!|Ótimo!|Com certeza!|Perfeito!/)
  })
})
