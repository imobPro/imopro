import { describe, it, expect } from 'vitest'
import {
  buildSystemPrompt,
  buildHandoffPreparatorySystemPrompt,
} from '../modules/ai-engine/ai-engine.prompts'
import type { AgentConfig } from '../modules/ai-engine/ai-engine.types'

const baseConfig = (): AgentConfig => ({
  tenantId: 'tenant-1',
  agentName: 'Ana',
  realtyName: 'Imobiliária Silva',
})

describe('buildSystemPrompt', () => {
  it('inclui o nome do agente e da imobiliária', () => {
    const prompt = buildSystemPrompt(baseConfig())
    expect(prompt).toContain('Ana')
    expect(prompt).toContain('Imobiliária Silva')
  })

  it('proíbe emojis explicitamente', () => {
    const prompt = buildSystemPrompt(baseConfig())
    expect(prompt.toLowerCase()).toContain('emoji')
  })

  it('inclui instrução de frases diretas sem exagero de cordialidade', () => {
    const prompt = buildSystemPrompt(baseConfig())
    expect(prompt).toContain('Claro!')
  })

  it('inclui as especialidades quando fornecidas', () => {
    const config = { ...baseConfig(), specialties: ['zona norte', 'comercial'] }
    const prompt = buildSystemPrompt(config)
    expect(prompt).toContain('zona norte')
    expect(prompt).toContain('comercial')
  })

  it('não menciona especialidades quando não fornecidas', () => {
    const prompt = buildSystemPrompt(baseConfig())
    expect(prompt).not.toContain('Especialidades:')
  })

  it('inclui o marcador de transferência [TRANSFER:]', () => {
    const prompt = buildSystemPrompt(baseConfig())
    expect(prompt).toContain('[TRANSFER:')
  })
})

describe('buildHandoffPreparatorySystemPrompt', () => {
  it('inclui nome do agente e da imobiliária', () => {
    const prompt = buildHandoffPreparatorySystemPrompt(baseConfig())
    expect(prompt).toContain('Ana')
    expect(prompt).toContain('Imobiliária Silva')
  })

  it('proíbe nova transferência (não menciona [TRANSFER:] como ação)', () => {
    const prompt = buildHandoffPreparatorySystemPrompt(baseConfig())
    // O marcador é citado apenas para dizer que será ignorado
    expect(prompt).toContain('ignorado')
    expect(prompt).not.toMatch(/adicione o marcador \[TRANSFER:/i)
  })

  it('proíbe prometer prazo específico para o corretor responder', () => {
    const prompt = buildHandoffPreparatorySystemPrompt(baseConfig())
    expect(prompt.toLowerCase()).toContain('prazo')
  })

  it('proíbe depreciar o corretor', () => {
    const prompt = buildHandoffPreparatorySystemPrompt(baseConfig())
    expect(prompt.toLowerCase()).toContain('deprecie')
  })

  it('mantém regras de tom (sem emojis, sem "Claro!")', () => {
    const prompt = buildHandoffPreparatorySystemPrompt(baseConfig())
    expect(prompt.toLowerCase()).toContain('emoji')
    expect(prompt).toContain('Claro!')
  })
})
