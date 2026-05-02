import { describe, it, expect } from 'vitest'
import { getBusinessHoursMessage } from '../modules/whatsapp/whatsapp.service'
import { buildScheduleFromTenant } from '../shared/utils/business-hours'
import { buildSystemPrompt } from '../modules/ai-engine/ai-engine.prompts'

// ---------------------------------------------------------------------------
// getBusinessHoursMessage — prioriza mensagem custom do tenant
// ---------------------------------------------------------------------------

describe('getBusinessHoursMessage', () => {
  it('retorna a mensagem custom quando preenchida', () => {
    const out = getBusinessHoursMessage('Estamos fechados, voltamos amanhã às 9h.')
    expect(out).toBe('Estamos fechados, voltamos amanhã às 9h.')
  })

  it('faz trim na mensagem custom', () => {
    const out = getBusinessHoursMessage('   Voltamos cedo.   ')
    expect(out).toBe('Voltamos cedo.')
  })

  it('cai no template padrão quando custom é null', () => {
    const out = getBusinessHoursMessage(null)
    expect(out).toContain('Recebemos sua mensagem')
    expect(out).toContain('um corretor entrará em contato')
  })

  it('cai no template padrão quando custom é string vazia', () => {
    const out = getBusinessHoursMessage('   ')
    expect(out).toContain('Recebemos sua mensagem')
  })
})

// ---------------------------------------------------------------------------
// buildScheduleFromTenant — sábado e domingo fechados
// ---------------------------------------------------------------------------

describe('buildScheduleFromTenant', () => {
  it('aplica o range de seg a sex e fecha fim de semana', () => {
    const cfg = buildScheduleFromTenant(9, 18)
    expect(cfg.schedule[0]).toBeNull() // domingo
    expect(cfg.schedule[6]).toBeNull() // sábado
    expect(cfg.schedule[1]).toEqual({ start: 9, end: 18 })
    expect(cfg.schedule[5]).toEqual({ start: 9, end: 18 })
  })
})

// ---------------------------------------------------------------------------
// buildSystemPrompt — welcomeMessage entra como contexto
// ---------------------------------------------------------------------------

describe('buildSystemPrompt com welcomeMessage', () => {
  const base = { tenantId: 't', agentName: 'Júlia', realtyName: 'Imobiliária Silva' }

  it('inclui o tom da imobiliária quando welcomeMessage está preenchido', () => {
    const prompt = buildSystemPrompt({ ...base, welcomeMessage: 'Atendimento direto e prático.' })
    expect(prompt).toContain('Tom e identidade da imobiliária')
    expect(prompt).toContain('Atendimento direto e prático.')
  })

  it('omite a linha de tom quando welcomeMessage é null', () => {
    const prompt = buildSystemPrompt({ ...base, welcomeMessage: null })
    expect(prompt).not.toContain('Tom e identidade da imobiliária')
  })

  it('omite a linha de tom quando welcomeMessage é string vazia', () => {
    const prompt = buildSystemPrompt({ ...base, welcomeMessage: '   ' })
    expect(prompt).not.toContain('Tom e identidade da imobiliária')
  })
})
