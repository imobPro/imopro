import { describe, it, expect } from 'vitest'
import { detectLeadProfile, shouldTransferToHuman } from '../modules/whatsapp/whatsapp.service'
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
