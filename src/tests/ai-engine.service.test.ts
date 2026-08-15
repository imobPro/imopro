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

    const response = await generateResponse({
      pendingMessages: [userMessage('quero falar com humano')],
      history: [],
      config: baseConfig(),
      tenantId: 'tenant-1',
      phone: '5521999999999',
      handoffMode: true,
    })

    expect(response.shouldTransfer).toBe(false)
    expect(response.transferReason).toBeUndefined()
    expect(response.text).not.toContain('[TRANSFER:')
  })

  it('usa o system prompt preparatório em handoffMode', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'O corretor já foi acionado e vai retornar.' }],
    })

    await generateResponse({
      pendingMessages: [userMessage('quanto custa o apartamento?')],
      history: [],
      config: baseConfig(),
      tenantId: 'tenant-1',
      phone: '5521999999999',
      handoffMode: true,
    })

    const sentSystem = messagesCreate.mock.calls[0][0].system as string
    expect(sentSystem).toContain('aguardando o contato')
    expect(sentSystem).not.toMatch(/adicione o marcador \[TRANSFER:/i)
  })

  it('respeita marker [TRANSFER:] em modo normal', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Vou conectar você. [TRANSFER:pedido_explicito]' }],
    })

    const response = await generateResponse({
      pendingMessages: [userMessage('quero falar com humano')],
      history: [],
      config: baseConfig(),
      tenantId: 'tenant-1',
      phone: '5521999999999',
    })

    expect(response.shouldTransfer).toBe(true)
    expect(response.transferReason).toBe('pedido_explicito')
    expect(response.text).not.toContain('[TRANSFER:')
  })
})

describe('generateResponse — cap defensivo no history', () => {
  beforeEach(() => {
    messagesCreate.mockReset()
  })

  it('trim history para 30 mensagens quando excede e mantém as mais recentes', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'ok' }],
    })

    const longHistory = Array.from({ length: 100 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `msg-${i}`,
    }))

    await generateResponse({
      pendingMessages: [userMessage('nova')],
      history: longHistory,
      config: baseConfig(),
      tenantId: 'tenant-1',
      phone: '5521999999999',
    })

    const sentMessages = messagesCreate.mock.calls[0][0].messages as Array<{
      role: string
      content: string
    }>
    // 30 do histórico + 1 nova mensagem do usuário
    expect(sentMessages).toHaveLength(31)
    // slice(-30) deve manter msg-70 ... msg-99 (as mais recentes)
    expect(sentMessages[0].content).toBe('msg-70')
    expect(sentMessages[29].content).toBe('msg-99')
    // Mensagem atual vem envolvida em tag XML dinâmica (defesa contra prompt
    // injection). Nonce muda a cada chamada, então match por regex.
    expect(sentMessages[30].content).toMatch(/^<mensagem_lead_[a-f0-9]+>\nnova\n<\/mensagem_lead_[a-f0-9]+>$/)
  })

  it('preserva history inteiro quando está dentro do limite', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'ok' }],
    })

    const shortHistory = Array.from({ length: 5 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `msg-${i}`,
    }))

    await generateResponse({
      pendingMessages: [userMessage('nova')],
      history: shortHistory,
      config: baseConfig(),
      tenantId: 'tenant-1',
      phone: '5521999999999',
    })

    const sentMessages = messagesCreate.mock.calls[0][0].messages as Array<{
      role: string
      content: string
    }>
    expect(sentMessages).toHaveLength(6)
    expect(sentMessages[0].content).toBe('msg-0')
    expect(sentMessages[5].content).toMatch(/^<mensagem_lead_[a-f0-9]+>\nnova\n<\/mensagem_lead_[a-f0-9]+>$/)
  })
})
