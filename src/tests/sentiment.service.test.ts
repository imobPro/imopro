import { describe, it, expect } from 'vitest'
import { shouldTransferToHuman } from '../modules/whatsapp/whatsapp.service'
import { buildSentimentWaitMessage, buildCorretorAlert } from '../modules/whatsapp/whatsapp.service'
import type { ConversationContext } from '../modules/whatsapp/whatsapp.types'

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    tenantId: 'tenant-1',
    phone: '5521999999999',
    messageCount: 1,
    lastText: 'olá',
    aiFailedAttempts: 0,
    isWithinBusinessHours: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Urgency keywords — transferência imediata por sentimento_negativo
// ---------------------------------------------------------------------------

describe('shouldTransferToHuman — urgência máxima', () => {
  it('detecta "vou desistir"', () => {
    expect(shouldTransferToHuman(makeContext({ lastText: 'vou desistir dessa compra' }))).toBe('sentimento_negativo')
  })

  it('detecta "quero cancelar"', () => {
    expect(shouldTransferToHuman(makeContext({ lastText: 'quero cancelar tudo' }))).toBe('sentimento_negativo')
  })

  it('detecta "péssimo atendimento" com acento', () => {
    expect(shouldTransferToHuman(makeContext({ lastText: 'péssimo atendimento, não acredito' }))).toBe('sentimento_negativo')
  })

  it('detecta "decepcionado"', () => {
    expect(shouldTransferToHuman(makeContext({ lastText: 'estou decepcionado com o serviço' }))).toBe('sentimento_negativo')
  })

  it('detecta "procon" como urgência', () => {
    expect(shouldTransferToHuman(makeContext({ lastText: 'vou reclamar no procon' }))).toBe('sentimento_negativo')
  })

  it('urgência tem prioridade sobre fechamento', () => {
    // Mensagem contém BOTH keywords de fechamento e urgência — urgência deve vencer
    const result = shouldTransferToHuman(makeContext({
      lastText: 'quero cancelar e também quero visitar o imóvel',
    }))
    expect(result).toBe('sentimento_negativo')
  })

  it('não dispara para mensagem neutra', () => {
    expect(shouldTransferToHuman(makeContext({ lastText: 'boa tarde, pode me falar sobre os imóveis disponíveis?' }))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// buildSentimentWaitMessage — regras de tom
// ---------------------------------------------------------------------------

describe('buildSentimentWaitMessage', () => {
  it('não contém emojis', () => {
    const msg = buildSentimentWaitMessage()
    // Regex para detectar emojis (unicode acima do BMP ou emojis comuns)
    expect(/[\u{1F000}-\u{1FFFF}]/u.test(msg)).toBe(false)
  })

  it('não contém expressões proibidas', () => {
    const msg = buildSentimentWaitMessage().toLowerCase()
    expect(msg).not.toContain('claro!')
    expect(msg).not.toContain('com certeza!')
    expect(msg).not.toContain('ótimo!')
    expect(msg).not.toContain('perfeito!')
  })

  it('é uma string não vazia e profissional', () => {
    const msg = buildSentimentWaitMessage()
    expect(msg.length).toBeGreaterThan(10)
    expect(typeof msg).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// buildCorretorAlert — contém dados essenciais
// ---------------------------------------------------------------------------

describe('buildCorretorAlert', () => {
  it('contém o número do lead', () => {
    const msg = buildCorretorAlert('5521999999999', 'tenant-abc')
    expect(msg).toContain('5521999999999')
  })

  it('contém identificação do tenant', () => {
    const msg = buildCorretorAlert('5521999999999', 'tenant-abc')
    expect(msg).toContain('tenant-abc')
  })

  it('contém prefixo identificador do sistema', () => {
    const msg = buildCorretorAlert('5521999999999', 'tenant-abc')
    expect(msg).toContain('[ImobPro]')
  })
})
