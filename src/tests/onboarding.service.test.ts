import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { admin: { createUser: vi.fn(), deleteUser: vi.fn(), getUserById: vi.fn() } },
  },
}))

vi.mock('../shared/zapi/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/zapi/client')>()
  return { ...actual, createInstance: vi.fn(), getQrCodeImage: vi.fn() }
})

vi.mock('../modules/billing', () => ({ startTrialClock: vi.fn() }))

import { supabase } from '../shared/database/supabase'
import { createInstance, getQrCodeImage, ZapiError } from '../shared/zapi/client'
import { startTrialClock } from '../modules/billing'
import {
  signup,
  provisionZapi,
  getConnectionStatus,
  handleZapiStatusEvent,
  getZapiStatus,
} from '../modules/onboarding/onboarding.service'
import { HttpError } from '../shared/errors/http-error'
import { queueFromResponses } from './helpers/supabase-mock'

const fromMock = supabase.from as ReturnType<typeof vi.fn>
const createUserMock = supabase.auth.admin.createUser as ReturnType<typeof vi.fn>
const deleteUserMock = supabase.auth.admin.deleteUser as ReturnType<typeof vi.fn>
const getUserByIdMock = supabase.auth.admin.getUserById as ReturnType<typeof vi.fn>
const createInstanceMock = createInstance as ReturnType<typeof vi.fn>
const getQrMock = getQrCodeImage as ReturnType<typeof vi.fn>
const startTrialClockMock = startTrialClock as ReturnType<typeof vi.fn>

const ORIGINAL_BACKEND_URL = process.env.BACKEND_PUBLIC_URL

function silenceConsole() {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
}

beforeEach(() => {
  fromMock.mockReset()
  createUserMock.mockReset()
  deleteUserMock.mockReset()
  getUserByIdMock.mockReset()
  createInstanceMock.mockReset()
  getQrMock.mockReset()
  startTrialClockMock.mockReset()
  process.env.BACKEND_PUBLIC_URL = 'https://backend.test'
})

afterEach(() => {
  vi.restoreAllMocks()
  if (ORIGINAL_BACKEND_URL === undefined) delete process.env.BACKEND_PUBLIC_URL
  else process.env.BACKEND_PUBLIC_URL = ORIGINAL_BACKEND_URL
})

const baseSignup = {
  operationMode: 'individual' as const,
  fullName: 'João Silva',
  email: 'Joao@Example.com',
  password: 'segredo123',
  acceptedTerms: true as const,
}

// ---------------------------------------------------------------------------
// signup
// ---------------------------------------------------------------------------

describe('signup', () => {
  it('cria usuário, tenant e agent (modo individual, sem phone)', async () => {
    createUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })
    let tenantPayload: Record<string, unknown> | undefined
    let agentPayload: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        { data: { id: 'tenant-1' }, error: null },
        { data: { id: 'agent-1' }, error: null },
      ],
      [(p) => (tenantPayload = p as Record<string, unknown>), (p) => (agentPayload = p as Record<string, unknown>)],
    )

    const result = await signup(baseSignup)

    expect(result).toEqual({
      userId: 'user-1',
      tenantId: 'tenant-1',
      agentId: 'agent-1',
      emailConfirmationRequired: true,
    })
    expect(createUserMock).toHaveBeenCalledWith({
      email: 'joao@example.com',
      password: 'segredo123',
      email_confirm: true,
    })
    expect(tenantPayload).toMatchObject({
      name: 'João Silva',
      operation_mode: 'individual',
      realty_name: 'João Silva',
      agent_name: 'João Silva',
    })
    expect(typeof tenantPayload?.lgpd_accepted_at).toBe('string')
    expect(agentPayload).toMatchObject({
      tenant_id: 'tenant-1',
      name: 'João Silva',
      phone: null,
      user_id: 'user-1',
      active: true,
    })
  })

  it('usa realtyName e phone no modo shared', async () => {
    createUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-2' } }, error: null })
    let tenantPayload: Record<string, unknown> | undefined
    let agentPayload: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        { data: { id: 'tenant-2' }, error: null },
        { data: { id: 'agent-2' }, error: null },
      ],
      [(p) => (tenantPayload = p as Record<string, unknown>), (p) => (agentPayload = p as Record<string, unknown>)],
    )

    await signup({
      operationMode: 'shared',
      fullName: 'Maria',
      realtyName: 'Imobiliária Silva',
      email: 'maria@silva.com',
      password: 'outrasenha1',
      phone: '+5521988887777',
      acceptedTerms: true,
    })

    expect(tenantPayload).toMatchObject({
      name: 'Imobiliária Silva',
      operation_mode: 'shared',
      realty_name: 'Imobiliária Silva',
      agent_name: 'Maria',
    })
    expect(agentPayload).toMatchObject({ name: 'Maria', phone: '+5521988887777' })
  })

  it('rejeita sem aceite de termos e não cria usuário', async () => {
    await expect(signup({ ...baseSignup, acceptedTerms: false as unknown as true })).rejects.toMatchObject({
      code: 'TERMS_NOT_ACCEPTED',
    })
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('rejeita modo shared sem realtyName', async () => {
    await expect(
      signup({ operationMode: 'shared', fullName: 'X', email: 'x@y.com', password: 'senha1234', acceptedTerms: true }),
    ).rejects.toMatchObject({ code: 'INVALID_FIELD' })
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('mapeia e-mail duplicado para 409 EMAIL_IN_USE', async () => {
    createUserMock.mockResolvedValueOnce({ data: null, error: { message: 'User already registered' } })
    await expect(signup(baseSignup)).rejects.toMatchObject({ status: 409, code: 'EMAIL_IN_USE' })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('desfaz o usuário Auth quando o insert do tenant falha', async () => {
    silenceConsole()
    createUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })
    queueFromResponses(fromMock, [{ data: null, error: { message: 'db down' } }])

    await expect(signup(baseSignup)).rejects.toBeInstanceOf(HttpError)
    expect(deleteUserMock).toHaveBeenCalledWith('user-1')
  })

  it('desfaz tenant e usuário quando o insert do agent falha', async () => {
    silenceConsole()
    createUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })
    queueFromResponses(fromMock, [
      { data: { id: 'tenant-1' }, error: null }, // insert tenant
      { data: null, error: { message: 'fk violation' } }, // insert agent
      { data: null, error: null }, // delete tenant (rollback)
    ])

    await expect(signup(baseSignup)).rejects.toBeInstanceOf(HttpError)
    expect(deleteUserMock).toHaveBeenCalledWith('user-1')
    expect(fromMock).toHaveBeenCalledTimes(3)
    expect(fromMock.mock.calls[2][0]).toBe('tenants') // o 3º from() é o delete de rollback
  })
})

// ---------------------------------------------------------------------------
// provisionZapi
// ---------------------------------------------------------------------------

const CONFIRMED = { data: { user: { email_confirmed_at: '2026-05-11T10:00:00Z' } }, error: null }

describe('provisionZapi', () => {
  it('rejeita com 403 quando o e-mail não está confirmado', async () => {
    getUserByIdMock.mockResolvedValueOnce({ data: { user: { email_confirmed_at: null } }, error: null })
    await expect(provisionZapi('tenant-1', 'user-1')).rejects.toMatchObject({ status: 403, code: 'EMAIL_NOT_CONFIRMED' })
    expect(createInstanceMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('cria a instância, persiste id/token, status awaiting_qr e devolve o QR', async () => {
    getUserByIdMock.mockResolvedValueOnce(CONFIRMED)
    let updatePayload: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        { data: { zapi_status: 'not_provisioned', zapi_instance_id: null, zapi_instance_token: null }, error: null },
        { data: null, error: null },
      ],
      [undefined, (p) => (updatePayload = p as Record<string, unknown>)],
    )
    createInstanceMock.mockResolvedValueOnce({ id: 'inst-1', token: 'tok-1', due: 1 })
    getQrMock.mockResolvedValueOnce({ value: 'qr-base64' })

    const result = await provisionZapi('tenant-1', 'user-1')

    expect(result).toEqual({ status: 'awaiting_qr', qrCode: 'qr-base64' })
    expect(createInstanceMock).toHaveBeenCalledWith({
      name: 'imobpro-tenant-1',
      receivedCallbackUrl: 'https://backend.test/webhook/whatsapp',
      connectedCallbackUrl: 'https://backend.test/webhook/zapi-status',
      disconnectedCallbackUrl: 'https://backend.test/webhook/zapi-status',
    })
    expect(updatePayload).toEqual({
      zapi_instance_id: 'inst-1',
      zapi_instance_token: 'tok-1',
      zapi_status: 'awaiting_qr',
    })
  })

  it('é idempotente quando já está conectado — não recria nada', async () => {
    getUserByIdMock.mockResolvedValueOnce(CONFIRMED)
    queueFromResponses(fromMock, [
      { data: { zapi_status: 'connected', zapi_instance_id: 'inst-1', zapi_instance_token: 'tok-1' }, error: null },
    ])

    const result = await provisionZapi('tenant-1', 'user-1')

    expect(result).toEqual({ status: 'connected', qrCode: null, alreadyConnected: true })
    expect(createInstanceMock).not.toHaveBeenCalled()
    expect(getQrMock).not.toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalledTimes(1)
  })

  it('reaproveita instância existente em awaiting_qr e só rebusca o QR', async () => {
    getUserByIdMock.mockResolvedValueOnce(CONFIRMED)
    queueFromResponses(fromMock, [
      { data: { zapi_status: 'awaiting_qr', zapi_instance_id: 'inst-1', zapi_instance_token: 'tok-1' }, error: null },
    ])
    getQrMock.mockResolvedValueOnce({ value: 'qr-2' })

    const result = await provisionZapi('tenant-1', 'user-1')

    expect(result).toEqual({ status: 'awaiting_qr', qrCode: 'qr-2' })
    expect(createInstanceMock).not.toHaveBeenCalled()
    expect(fromMock).toHaveBeenCalledTimes(1) // só o load — não houve setZapiStatus
  })

  it('reaproveita instância em disconnected, volta para awaiting_qr e rebusca o QR', async () => {
    getUserByIdMock.mockResolvedValueOnce(CONFIRMED)
    let setStatusPayload: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        { data: { zapi_status: 'disconnected', zapi_instance_id: 'inst-1', zapi_instance_token: 'tok-1' }, error: null },
        { data: null, error: null },
      ],
      [undefined, (p) => (setStatusPayload = p as Record<string, unknown>)],
    )
    getQrMock.mockResolvedValueOnce({ value: 'qr-3' })

    const result = await provisionZapi('tenant-1', 'user-1')

    expect(result).toEqual({ status: 'awaiting_qr', qrCode: 'qr-3' })
    expect(setStatusPayload).toEqual({ zapi_status: 'awaiting_qr' })
    expect(createInstanceMock).not.toHaveBeenCalled()
  })

  it('mapeia ZapiError de createInstance para 502 e não persiste nada', async () => {
    silenceConsole()
    getUserByIdMock.mockResolvedValueOnce(CONFIRMED)
    queueFromResponses(fromMock, [
      { data: { zapi_status: 'not_provisioned', zapi_instance_id: null, zapi_instance_token: null }, error: null },
    ])
    createInstanceMock.mockRejectedValueOnce(new ZapiError('boom', 500, '/instances', 'oops'))

    await expect(provisionZapi('tenant-1', 'user-1')).rejects.toMatchObject({ status: 502, code: 'ZAPI_PROVISIONING_FAILED' })
    expect(fromMock).toHaveBeenCalledTimes(1) // só o load, sem update
  })

  it('devolve qrCode null (não erro) quando o QR ainda não está disponível', async () => {
    silenceConsole()
    getUserByIdMock.mockResolvedValueOnce(CONFIRMED)
    queueFromResponses(fromMock, [
      { data: { zapi_status: 'not_provisioned', zapi_instance_id: null, zapi_instance_token: null }, error: null },
      { data: null, error: null },
    ])
    createInstanceMock.mockResolvedValueOnce({ id: 'inst-1', token: 'tok-1', due: 1 })
    getQrMock.mockRejectedValueOnce(new ZapiError('not ready', 404, '/qr-code/image'))

    const result = await provisionZapi('tenant-1', 'user-1')
    expect(result).toEqual({ status: 'awaiting_qr', qrCode: null })
  })

  it('falha com 500 quando BACKEND_PUBLIC_URL não está configurado', async () => {
    delete process.env.BACKEND_PUBLIC_URL
    getUserByIdMock.mockResolvedValueOnce(CONFIRMED)
    queueFromResponses(fromMock, [
      { data: { zapi_status: 'not_provisioned', zapi_instance_id: null, zapi_instance_token: null }, error: null },
    ])

    await expect(provisionZapi('tenant-1', 'user-1')).rejects.toMatchObject({ status: 500, code: 'SERVER_MISCONFIGURED' })
    expect(createInstanceMock).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// getConnectionStatus
// ---------------------------------------------------------------------------

describe('getConnectionStatus', () => {
  it('em awaiting_qr devolve status + QR fresco', async () => {
    queueFromResponses(fromMock, [
      { data: { zapi_status: 'awaiting_qr', zapi_instance_id: 'inst-1', zapi_instance_token: 'tok-1' }, error: null },
    ])
    getQrMock.mockResolvedValueOnce({ value: 'qr-x' })

    expect(await getConnectionStatus('tenant-1')).toEqual({ zapiStatus: 'awaiting_qr', qrCode: 'qr-x' })
  })

  it('em connected devolve status sem QR', async () => {
    queueFromResponses(fromMock, [
      { data: { zapi_status: 'connected', zapi_instance_id: 'inst-1', zapi_instance_token: 'tok-1' }, error: null },
    ])
    expect(await getConnectionStatus('tenant-1')).toEqual({ zapiStatus: 'connected', qrCode: null })
    expect(getQrMock).not.toHaveBeenCalled()
  })

  it('zapi_status nulo vira not_provisioned', async () => {
    queueFromResponses(fromMock, [
      { data: { zapi_status: null, zapi_instance_id: null, zapi_instance_token: null }, error: null },
    ])
    expect(await getConnectionStatus('tenant-1')).toEqual({ zapiStatus: 'not_provisioned', qrCode: null })
  })

  it('tenant inexistente → 404', async () => {
    queueFromResponses(fromMock, [{ data: null, error: null }])
    await expect(getConnectionStatus('tenant-x')).rejects.toMatchObject({ status: 404, code: 'TENANT_NOT_FOUND' })
  })
})

// ---------------------------------------------------------------------------
// handleZapiStatusEvent
// ---------------------------------------------------------------------------

describe('handleZapiStatusEvent', () => {
  it('conexão marca connected, grava zapi_connected_at e inicia o relógio do trial', async () => {
    silenceConsole()
    let updatePayload: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        { data: { id: 'tenant-1', zapi_connected_at: null }, error: null },
        { data: null, error: null },
      ],
      [undefined, (p) => (updatePayload = p as Record<string, unknown>)],
    )

    await handleZapiStatusEvent({ instanceId: 'inst-1', connected: true })

    expect(updatePayload?.zapi_status).toBe('connected')
    expect(typeof updatePayload?.zapi_connected_at).toBe('string')
    expect(startTrialClockMock).toHaveBeenCalledWith('tenant-1')
  })

  it('reconhece type=ConnectedCallback e preserva zapi_connected_at já existente', async () => {
    silenceConsole()
    let updatePayload: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        { data: { id: 'tenant-1', zapi_connected_at: '2026-05-01T00:00:00Z' }, error: null },
        { data: null, error: null },
      ],
      [undefined, (p) => (updatePayload = p as Record<string, unknown>)],
    )

    await handleZapiStatusEvent({ instanceId: 'inst-1', type: 'ConnectedCallback' })

    expect(updatePayload).toEqual({ zapi_status: 'connected', zapi_connected_at: '2026-05-01T00:00:00Z' })
    expect(startTrialClockMock).toHaveBeenCalledWith('tenant-1')
  })

  it('desconexão marca disconnected e não toca no trial', async () => {
    silenceConsole()
    let updatePayload: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        { data: { id: 'tenant-1', zapi_connected_at: '2026-05-01T00:00:00Z' }, error: null },
        { data: null, error: null },
      ],
      [undefined, (p) => (updatePayload = p as Record<string, unknown>)],
    )

    // Payload real da Z-API (verificado em 2026-05-22): { type: 'DisconnectedCallback', disconnected: true, ... }
    await handleZapiStatusEvent({
      instanceId: 'inst-1',
      type: 'DisconnectedCallback',
      disconnected: true,
    })

    expect(updatePayload).toEqual({ zapi_status: 'disconnected' })
    expect(startTrialClockMock).not.toHaveBeenCalled()
  })

  it('desconexão por disconnected:true sozinho (sem campo type) também é reconhecida', async () => {
    silenceConsole()
    let updatePayload: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        { data: { id: 'tenant-1', zapi_connected_at: '2026-05-01T00:00:00Z' }, error: null },
        { data: null, error: null },
      ],
      [undefined, (p) => (updatePayload = p as Record<string, unknown>)],
    )

    await handleZapiStatusEvent({ instanceId: 'inst-1', disconnected: true })

    expect(updatePayload).toEqual({ zapi_status: 'disconnected' })
  })

  it('instanceId desconhecido é no-op', async () => {
    silenceConsole()
    queueFromResponses(fromMock, [{ data: null, error: null }])

    await handleZapiStatusEvent({ instanceId: 'desconhecida', connected: true })

    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(startTrialClockMock).not.toHaveBeenCalled()
  })

  it('evento ambíguo (sem connected, disconnected, ou type) é no-op sem nem consultar o banco', async () => {
    silenceConsole()
    await handleZapiStatusEvent({ instanceId: 'inst-1' })
    expect(fromMock).not.toHaveBeenCalled()
    expect(startTrialClockMock).not.toHaveBeenCalled()
  })
})

describe('getZapiStatus', () => {
  it('retorna o status atual do tenant quando achado', async () => {
    queueFromResponses(fromMock, [{ data: { zapi_status: 'connected' }, error: null }])
    const status = await getZapiStatus('tenant-1')
    expect(status).toBe('connected')
  })

  it('retorna not_provisioned quando a linha não existe (default permissivo)', async () => {
    queueFromResponses(fromMock, [{ data: null, error: null }])
    const status = await getZapiStatus('tenant-1')
    expect(status).toBe('not_provisioned')
  })

  it('retorna not_provisioned em erro de banco (não bloqueia atendimento)', async () => {
    silenceConsole()
    queueFromResponses(fromMock, [{ data: null, error: { message: 'connection refused' } }])
    const status = await getZapiStatus('tenant-1')
    expect(status).toBe('not_provisioned')
  })

  it('retorna disconnected quando o tenant está com WhatsApp caído', async () => {
    queueFromResponses(fromMock, [{ data: { zapi_status: 'disconnected' }, error: null }])
    const status = await getZapiStatus('tenant-1')
    expect(status).toBe('disconnected')
  })
})
