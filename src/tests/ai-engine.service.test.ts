import { describe, it, expect, vi, beforeEach } from 'vitest'

const messagesCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: messagesCreate }
    },
  }
})

import { detectIntent, generateResponse } from '../modules/ai-engine/ai-engine.service'
import type { AgentConfig, PendingMessage } from '../modules/ai-engine/ai-engine.types'

describe('detectIntent', () => {
  it('detecta compra', () => {
    expect(detectIntent('quero comprar um apartamento')).toBe('compra')
    expect(detectIntent('preciso de financiamento')).toBe('compra')
  })

  it('detecta aluguel', () => {
    expect(detectIntent('quero alugar uma casa')).toBe('aluguel')
    expect(detectIntent('preciso de um aluguel')).toBe('aluguel')
  })

  it('detecta venda', () => {
    expect(detectIntent('quero vender meu imóvel')).toBe('venda')
    expect(detectIntent('preciso vender minha casa')).toBe('venda')
  })

  it('detecta visita', () => {
    expect(detectIntent('quero marcar uma visita')).toBe('visita')
    expect(detectIntent('posso visitar o imóvel?')).toBe('visita')
  })

  it('detecta informacao', () => {
    expect(detectIntent('tenho uma dúvida sobre o imóvel')).toBe('informacao')
    expect(detectIntent('me conta mais sobre o apartamento')).toBe('informacao')
  })

  it('retorna desconhecido quando não identifica', () => {
    expect(detectIntent('boa tarde')).toBe('desconhecido')
    expect(detectIntent('ok')).toBe('desconhecido')
  })
})

const baseConfig = (): AgentConfig => ({
  tenantId: 'tenant-1',
  agentName: 'Ana',
  realtyName: 'Imobiliária Silva',
})

const userMessage = (text: string): PendingMessage => ({
  text,
  mediaUrl: null,
  mimeType: null,
  type: 'text',
  timestamp: Date.now(),
})

describe('generateResponse — handoffMode', () => {
  beforeEach(() => {
    messagesCreate.mockReset()
  })

  it('descarta marker [TRANSFER:] em handoffMode e retorna shouldTransfer=false', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Vou conectar você. [TRANSFER:pedido_explicito]' }],
    })

    const response = await generateResponse(
      [userMessage('quero falar com humano')],
      [],
      baseConfig(),
      'tenant-1',
      '5521999999999',
      { handoffMode: true },
    )

    expect(response.shouldTransfer).toBe(false)
    expect(response.transferReason).toBeUndefined()
    expect(response.text).not.toContain('[TRANSFER:')
  })

  it('usa o system prompt preparatório em handoffMode', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'O corretor já foi acionado e vai retornar.' }],
    })

    await generateResponse(
      [userMessage('quanto custa o apartamento?')],
      [],
      baseConfig(),
      'tenant-1',
      '5521999999999',
      { handoffMode: true },
    )

    const sentSystem = messagesCreate.mock.calls[0][0].system as string
    expect(sentSystem).toContain('aguardando o contato')
    expect(sentSystem).not.toMatch(/adicione o marcador \[TRANSFER:/i)
  })

  it('respeita marker [TRANSFER:] em modo normal', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Vou conectar você. [TRANSFER:pedido_explicito]' }],
    })

    const response = await generateResponse(
      [userMessage('quero falar com humano')],
      [],
      baseConfig(),
      'tenant-1',
      '5521999999999',
    )

    expect(response.shouldTransfer).toBe(true)
    expect(response.transferReason).toBe('pedido_explicito')
    expect(response.text).not.toContain('[TRANSFER:')
  })
})
