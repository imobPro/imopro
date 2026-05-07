import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../shared/database/supabase'
import {
  getTenantSettings,
  updateTenantSettings,
  updateAgentVisibility,
  updateAgentPhone,
  getAgentVisibility,
} from '../modules/tenant-settings/tenant-settings.service'
import { HttpError } from '../shared/errors/http-error'
import { queueFromResponses } from './helpers/supabase-mock'

const fromMock = supabase.from as ReturnType<typeof vi.fn>

beforeEach(() => {
  fromMock.mockReset()
})

// ---------------------------------------------------------------------------
// getTenantSettings
// ---------------------------------------------------------------------------

describe('getTenantSettings', () => {
  it('retorna defaults quando linha não existe', async () => {
    queueFromResponses(fromMock, [{ data: null, error: null }])

    const settings = await getTenantSettings('tenant-A')

    expect(settings).toEqual({
      tenantId: 'tenant-A',
      agentName: 'Assistente',
      realtyName: 'Imobiliária',
      welcomeMessage: null,
      businessHoursStart: 8,
      businessHoursEnd: 18,
      outOfHoursMessage: null,
      agentActive: true,
    })
  })

  it('mapeia linha do banco para o tipo TenantSettings', async () => {
    queueFromResponses(fromMock, [
      {
        data: {
          agent_name: 'Júlia',
          realty_name: 'Imobiliária Silva',
          welcome_message: 'Atendimento direto e prático.',
          business_hours_start: 9,
          business_hours_end: 17,
          out_of_hours_message: 'Voltamos amanhã.',
          agent_active: false,
        },
        error: null,
      },
    ])

    const settings = await getTenantSettings('tenant-B')

    expect(settings.agentName).toBe('Júlia')
    expect(settings.realtyName).toBe('Imobiliária Silva')
    expect(settings.welcomeMessage).toBe('Atendimento direto e prático.')
    expect(settings.businessHoursStart).toBe(9)
    expect(settings.businessHoursEnd).toBe(17)
    expect(settings.outOfHoursMessage).toBe('Voltamos amanhã.')
    expect(settings.agentActive).toBe(false)
  })

  it('cai em defaults se o supabase retornar erro', async () => {
    queueFromResponses(fromMock, [{ data: null, error: { message: 'boom' } }])

    const settings = await getTenantSettings('tenant-C')

    expect(settings.agentName).toBe('Assistente')
    expect(settings.agentActive).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// updateTenantSettings
// ---------------------------------------------------------------------------

describe('updateTenantSettings', () => {
  it('rejeita nome vazio', async () => {
    await expect(updateTenantSettings('t', { agentName: '   ' })).rejects.toBeInstanceOf(HttpError)
  })

  it('rejeita hora fora do range', async () => {
    await expect(updateTenantSettings('t', { businessHoursStart: 25 })).rejects.toBeInstanceOf(HttpError)
    await expect(updateTenantSettings('t', { businessHoursEnd: 0 })).rejects.toBeInstanceOf(HttpError)
  })

  it('rejeita end <= start considerando estado atual', async () => {
    queueFromResponses(fromMock, [
      // chamada interna do getTenantSettings (validação cruzada)
      {
        data: {
          agent_name: 'A',
          realty_name: 'R',
          welcome_message: null,
          business_hours_start: 10,
          business_hours_end: 18,
          out_of_hours_message: null,
          agent_active: true,
        },
        error: null,
      },
    ])

    await expect(updateTenantSettings('t', { businessHoursEnd: 9 })).rejects.toBeInstanceOf(HttpError)
  })

  it('persiste somente as chaves convertidas snake_case', async () => {
    const captures: unknown[] = []
    queueFromResponses(
      fromMock,
      [
        // getTenantSettings (validação cruzada)
        {
          data: {
            agent_name: 'A',
            realty_name: 'R',
            welcome_message: null,
            business_hours_start: 8,
            business_hours_end: 18,
            out_of_hours_message: null,
            agent_active: true,
          },
          error: null,
        },
        // update().select().maybeSingle()
        {
          data: {
            agent_name: 'Júlia',
            realty_name: 'R',
            welcome_message: null,
            business_hours_start: 8,
            business_hours_end: 18,
            out_of_hours_message: null,
            agent_active: false,
          },
          error: null,
        },
      ],
      [undefined, (payload) => captures.push(payload)]
    )

    const result = await updateTenantSettings('t', { agentName: 'Júlia', agentActive: false })

    expect(captures[0]).toEqual({ agent_name: 'Júlia', agent_active: false })
    expect(result.agentName).toBe('Júlia')
    expect(result.agentActive).toBe(false)
  })

  it('rejeita toggle não-booleano', async () => {
    await expect(
      updateTenantSettings('t', { agentActive: 'true' as unknown as boolean })
    ).rejects.toBeInstanceOf(HttpError)
  })
})

// ---------------------------------------------------------------------------
// updateAgentVisibility
// ---------------------------------------------------------------------------

describe('updateAgentVisibility', () => {
  it('faz merge ignorando chaves desconhecidas e tipos inválidos', async () => {
    const captures: unknown[] = []
    queueFromResponses(
      fromMock,
      [
        // getAgentVisibility (lê current)
        { data: { settings_visibility: { identity: false } }, error: null },
        // update
        { data: null, error: null },
      ],
      [undefined, (payload) => captures.push(payload)]
    )

    const result = await updateAgentVisibility('agent-1', {
      brand: false,
      identity: true,
      // chaves inválidas — ignoradas
      foo: true,
      hours: 'sim',
    } as Record<string, unknown>)

    expect(result).toEqual({ identity: true, brand: false })
    expect(captures[0]).toEqual({ settings_visibility: { identity: true, brand: false } })
  })

  it('retorna {} quando o agent não tem coluna populada', async () => {
    queueFromResponses(fromMock, [{ data: null, error: null }])
    const v = await getAgentVisibility('agent-x')
    expect(v).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// updateAgentPhone
// ---------------------------------------------------------------------------

describe('updateAgentPhone', () => {
  it('aceita formato com símbolos e persiste só dígitos', async () => {
    const captures: unknown[] = []
    queueFromResponses(fromMock, [{ data: null, error: null }], [(p) => captures.push(p)])

    const saved = await updateAgentPhone('agent-1', '+55 (21) 98888-7777')

    expect(saved).toBe('5521988887777')
    expect(captures[0]).toEqual({ phone: '5521988887777' })
  })

  it('rejeita telefone curto demais', async () => {
    await expect(updateAgentPhone('agent-1', '12345')).rejects.toBeInstanceOf(HttpError)
  })

  it('rejeita tipo não-string', async () => {
    await expect(updateAgentPhone('agent-1', 123 as unknown as string)).rejects.toBeInstanceOf(HttpError)
  })
})
