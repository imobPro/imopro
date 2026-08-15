import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  createInstance,
  getInstanceStatus,
  getQrCodeImage,
  disconnectInstance,
  ZapiError,
} from '../shared/zapi/client'

const ORIGINAL_FETCH = global.fetch

function mockFetch(responses: Array<{ ok: boolean; status: number; body: unknown }>): ReturnType<typeof vi.fn> {
  const fn = vi.fn()
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok,
      status: r.status,
      json: () => Promise.resolve(r.body),
      text: () => Promise.resolve(typeof r.body === 'string' ? r.body : JSON.stringify(r.body)),
    } as unknown as Response)
  }
  global.fetch = fn as unknown as typeof fetch
  return fn
}

beforeEach(() => {
  process.env.ZAPI_BASE_URL = 'https://api.z-api.io'
  process.env.ZAPI_ACCOUNT_TOKEN = 'account-token-test'
})

afterEach(() => {
  global.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// createInstance
// ---------------------------------------------------------------------------

describe('createInstance', () => {
  it('chama POST /instances com Bearer do account token', async () => {
    const fetchMock = mockFetch([
      { ok: true, status: 200, body: { id: 'inst-1', token: 'tok-1', due: 1748565999675 } },
    ])

    const result = await createInstance({
      name: 'tenant-abc',
      connectedCallbackUrl: 'https://app.imobpro.com.br/webhook/zapi/connected',
    })

    expect(result).toEqual({ id: 'inst-1', token: 'tok-1', due: 1748565999675 })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.z-api.io/instances')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer account-token-test')
    expect(JSON.parse(init.body)).toEqual({
      name: 'tenant-abc',
      connectedCallbackUrl: 'https://app.imobpro.com.br/webhook/zapi/connected',
    })
  })

  it('lança ZapiError quando ZAPI_ACCOUNT_TOKEN ausente', async () => {
    delete process.env.ZAPI_ACCOUNT_TOKEN
    await expect(createInstance({ name: 'x' })).rejects.toThrow(ZapiError)
  })

  it('lança ZapiError em resposta não-ok', async () => {
    mockFetch([{ ok: false, status: 401, body: { error: 'unauthorized' } }])
    await expect(createInstance({ name: 'x' })).rejects.toThrow(/falhou \[401\]/)
  })

  it('lança ZapiError quando resposta vem sem id/token', async () => {
    mockFetch([{ ok: true, status: 200, body: { due: 123 } }])
    await expect(createInstance({ name: 'x' })).rejects.toThrow(/sem id\/token/)
  })
})

// ---------------------------------------------------------------------------
// getInstanceStatus
// ---------------------------------------------------------------------------

describe('getInstanceStatus', () => {
  it('chama GET /instances/:id/token/:token/status', async () => {
    const fetchMock = mockFetch([
      { ok: true, status: 200, body: { connected: true, smartphoneConnected: true, error: 'You are already connected' } },
    ])

    const result = await getInstanceStatus({ instanceId: 'inst-1', instanceToken: 'tok-1' })

    expect(result.connected).toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.z-api.io/instances/inst-1/token/tok-1/status',
    )
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('propaga payload de desconectado sem lançar', async () => {
    mockFetch([{ ok: true, status: 200, body: { connected: false, smartphoneConnected: false, error: 'You are not connected' } }])
    const result = await getInstanceStatus({ instanceId: 'inst-1', instanceToken: 'tok-1' })
    expect(result.connected).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getQrCodeImage
// ---------------------------------------------------------------------------

describe('getQrCodeImage', () => {
  it('chama GET /instances/:id/token/:token/qr-code/image', async () => {
    const fetchMock = mockFetch([
      { ok: true, status: 200, body: { value: 'data:image/png;base64,iVBORw0KGgo...' } },
    ])

    const result = await getQrCodeImage({ instanceId: 'inst-1', instanceToken: 'tok-1' })

    expect(result.value).toMatch(/^data:image\/png;base64,/)
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.z-api.io/instances/inst-1/token/tok-1/qr-code/image',
    )
  })
})

// ---------------------------------------------------------------------------
// disconnectInstance
// ---------------------------------------------------------------------------

describe('disconnectInstance', () => {
  it('chama POST /instances/:id/token/:token/disconnect', async () => {
    const fetchMock = mockFetch([{ ok: true, status: 200, body: { value: true } }])

    const result = await disconnectInstance({ instanceId: 'inst-1', instanceToken: 'tok-1' })

    expect(result.value).toBe(true)
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.z-api.io/instances/inst-1/token/tok-1/disconnect',
    )
  })
})

// ---------------------------------------------------------------------------
// Error contract — endpoint identificável
// ---------------------------------------------------------------------------

describe('ZapiError', () => {
  it('inclui status e endpoint nos campos da exceção', async () => {
    mockFetch([{ ok: false, status: 500, body: 'service unavailable' }])
    try {
      await getInstanceStatus({ instanceId: 'x', instanceToken: 'y' })
      expect.fail('deveria ter lançado')
    } catch (err) {
      expect(err).toBeInstanceOf(ZapiError)
      const e = err as ZapiError
      expect(e.status).toBe(500)
      expect(e.endpoint).toBe('/status')
    }
  })
})
