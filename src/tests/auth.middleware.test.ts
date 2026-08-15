import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { generateKeyPair, SignJWT, exportJWK } from 'jose'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../shared/database/agents-auth', () => ({
  findActiveAgentByUserId: vi.fn(),
  AgentLookupError: class extends Error {},
}))

// Mock de createRemoteJWKSet: retorna uma função local que devolve a chave
// pública gerada nos testes. Assim evitamos qualquer chamada de rede.
let publicKey: CryptoKey
let privateKey: CryptoKey
let wrongPrivateKey: CryptoKey
// Modo da função do JWKS — quando 'timeout', simula falha infraestrutural
// (Supabase fora do ar) e o middleware deve responder 503, não 401.
let jwksMode: 'ok' | 'timeout' = 'ok'

vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>()
  return {
    ...actual,
    createRemoteJWKSet: () => () => {
      if (jwksMode === 'timeout') {
        const err = new Error('JWKS request timed out') as Error & { code?: string }
        err.code = 'ERR_JWKS_TIMEOUT'
        return Promise.reject(err)
      }
      return Promise.resolve(publicKey)
    },
  }
})

import { findActiveAgentByUserId } from '../shared/database/agents-auth'
import { requireAuth } from '../shared/middleware/auth'

const ISSUER = `${process.env.SUPABASE_URL}/auth/v1`

function makeReq(headers: Record<string, string | undefined> = {}): Request {
  return { headers, auth: undefined } as unknown as Request
}

function makeRes() {
  const res: Partial<Response> & { _status?: number; _body?: unknown } = {}
  res.status = vi.fn((code: number) => {
    res._status = code
    return res as Response
  })
  res.json = vi.fn((body: unknown) => {
    res._body = body
    return res as Response
  })
  return res as Response & { _status?: number; _body?: unknown }
}

function makeNext(): NextFunction {
  return vi.fn()
}

interface SignOpts {
  sub?: string
  email?: string
  aud?: string
  iss?: string
  expiresIn?: string
  signWithWrongKey?: boolean
}

async function signValid(opts: SignOpts = {}): Promise<string> {
  const key = opts.signWithWrongKey ? wrongPrivateKey : privateKey
  return new SignJWT({ email: opts.email ?? 'arthur@example.com' })
    .setProtectedHeader({ alg: 'ES256' })
    .setSubject(opts.sub ?? 'user-123')
    .setAudience(opts.aud ?? 'authenticated')
    .setIssuer(opts.iss ?? ISSUER)
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '1h')
    .sign(key)
}

beforeAll(async () => {
  const main = await generateKeyPair('ES256')
  publicKey = main.publicKey
  privateKey = main.privateKey
  // exportJWK importado pra garantir compatibilidade com a API; não usado direto
  // (o mock de createRemoteJWKSet devolve KeyLike — o jwtVerify aceita ambos).
  await exportJWK(publicKey)

  const other = await generateKeyPair('ES256')
  wrongPrivateKey = other.privateKey
})

beforeEach(() => {
  vi.mocked(findActiveAgentByUserId).mockReset()
  jwksMode = 'ok'
})

describe('requireAuth', () => {
  it('rejeita 401 quando não há header Authorization', async () => {
    const req = makeReq({})
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('MISSING_AUTH')
    expect(next).not.toHaveBeenCalled()
  })

  it('rejeita 401 quando header não é Bearer', async () => {
    const req = makeReq({ authorization: 'Basic abc' })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('MISSING_AUTH')
  })

  it('rejeita 401 quando JWT tem assinatura inválida (assinado com outra chave)', async () => {
    const badToken = await signValid({ signWithWrongKey: true })
    const req = makeReq({ authorization: `Bearer ${badToken}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('INVALID_TOKEN')
  })

  it('rejeita 401 quando JWT está expirado', async () => {
    // -2min para escapar do clockTolerance de 10s no middleware
    const expired = await signValid({ expiresIn: '-2m' })
    const req = makeReq({ authorization: `Bearer ${expired}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('INVALID_TOKEN')
  })

  it('rejeita 401 quando audience do JWT não é authenticated', async () => {
    const wrongAud = await signValid({ aud: 'admin' })
    const req = makeReq({ authorization: `Bearer ${wrongAud}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('INVALID_TOKEN')
  })

  it('rejeita 401 quando issuer do JWT não bate com SUPABASE_URL', async () => {
    const wrongIss = await signValid({ iss: 'https://outro-host/auth/v1' })
    const req = makeReq({ authorization: `Bearer ${wrongIss}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('INVALID_TOKEN')
  })

  it('rejeita 403 quando user não tem agent ativo', async () => {
    vi.mocked(findActiveAgentByUserId).mockResolvedValue(null)
    const token = await signValid()
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(403)
    expect((res._body as { error: { code: string } }).error.code).toBe('NO_ACTIVE_AGENT')
    expect(next).not.toHaveBeenCalled()
  })

  it('retorna 503 AUTH_TEMP_UNAVAILABLE quando JWKS está inalcançável (não desloga o usuário)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    jwksMode = 'timeout'
    const token = await signValid()
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(503)
    expect((res._body as { error: { code: string } }).error.code).toBe('AUTH_TEMP_UNAVAILABLE')
    expect(next).not.toHaveBeenCalled()
  })

  it('chama next e popula req.auth quando JWT válido e agent ativo', async () => {
    vi.mocked(findActiveAgentByUserId).mockResolvedValue({
      id: 'agent-1',
      tenantId: 'tenant-A',
      active: true,
    })
    const token = await signValid()
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.auth).toEqual({
      userId: 'user-123',
      email: 'arthur@example.com',
      tenantId: 'tenant-A',
      agentId: 'agent-1',
    })
  })
})
