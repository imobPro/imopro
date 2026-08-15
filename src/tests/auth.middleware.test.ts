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

// -----------------------------------------------------------------------------
// P1 — T1 do CLAUDE.md: tenant_id vem do JWT, nunca do request.
// -----------------------------------------------------------------------------
describe('P1 — tenant vem do JWT, nunca do request', () => {
  it('ignora tenantId em body/query/params/headers; usa o do agent resolvido pelo JWT', async () => {
    vi.mocked(findActiveAgentByUserId).mockResolvedValue({
      id: 'agent-legit',
      tenantId: 'legit-tenant',
      active: true,
    })
    const token = await signValid()

    // Request hostil: token válido + tentativa de injeção em todos os canais
    // de entrada. Se qualquer um destes vazar para req.auth.tenantId, T1 caiu.
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-tenant-id': 'hijack-header',
      },
      body: { tenantId: 'hijack-body', tenant_id: 'hijack-body-snake', client_id: 'hijack-client' },
      query: { tenantId: 'hijack-query' },
      params: { tenantId: 'hijack-param' },
      auth: undefined,
    } as unknown as Request
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.auth?.tenantId).toBe('legit-tenant')

    // Prova redundante: nenhum dos canais hostis venceu.
    for (const hijack of ['hijack-body', 'hijack-body-snake', 'hijack-client', 'hijack-query', 'hijack-param', 'hijack-header']) {
      expect(req.auth?.tenantId).not.toBe(hijack)
    }

    // findActiveAgentByUserId foi chamado com o sub do JWT — nunca com valor do request.
    expect(vi.mocked(findActiveAgentByUserId)).toHaveBeenCalledWith('user-123')
  })
})

// -----------------------------------------------------------------------------
// P2 — família 401 uniforme. As cinco causas de INVALID_TOKEN retornam corpo
// idêntico; se alguém adicionar branch vazando a causa específica no futuro,
// o toEqual(EXPECTED_401_BODY) morre. Ver CLAUDE.md, "Regra dos códigos de
// status na auth".
// -----------------------------------------------------------------------------
describe('P2 — família 401 INVALID_TOKEN é indistinguível entre causas', () => {
  const EXPECTED_401_BODY = {
    error: { code: 'INVALID_TOKEN', message: 'Token inválido ou expirado' },
  }

  it('assinatura inválida', async () => {
    const token = await signValid({ signWithWrongKey: true })
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()
    await requireAuth(req, res, makeNext())
    expect(res._status).toBe(401)
    expect(res._body).toEqual(EXPECTED_401_BODY)
  })

  it('token expirado', async () => {
    const token = await signValid({ expiresIn: '-2m' })
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()
    await requireAuth(req, res, makeNext())
    expect(res._status).toBe(401)
    expect(res._body).toEqual(EXPECTED_401_BODY)
  })

  it('audience errada', async () => {
    const token = await signValid({ aud: 'admin' })
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()
    await requireAuth(req, res, makeNext())
    expect(res._status).toBe(401)
    expect(res._body).toEqual(EXPECTED_401_BODY)
  })

  it('issuer errado', async () => {
    const token = await signValid({ iss: 'https://outro-host/auth/v1' })
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()
    await requireAuth(req, res, makeNext())
    expect(res._status).toBe(401)
    expect(res._body).toEqual(EXPECTED_401_BODY)
  })

  it('payload sem sub — mensagem uniformizada (fix Furo #2)', async () => {
    // Assina sem chamar setSubject → payload.sub undefined
    const token = await new SignJWT({ email: 'arthur@example.com' })
      .setProtectedHeader({ alg: 'ES256' })
      .setAudience('authenticated')
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey)
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()
    await requireAuth(req, res, makeNext())
    expect(res._status).toBe(401)
    expect(res._body).toEqual(EXPECTED_401_BODY)
  })

  it('token malformado (não parseável como JWT)', async () => {
    const req = makeReq({ authorization: 'Bearer not.a.real.jwt' })
    const res = makeRes()
    await requireAuth(req, res, makeNext())
    expect(res._status).toBe(401)
    expect(res._body).toEqual(EXPECTED_401_BODY)
  })
})

// -----------------------------------------------------------------------------
// MISSING_AUTH é code distinto porque não há vazamento: o cliente sabe se
// mandou (ou não) o header. Já INVALID_TOKEN precisa ser uniforme entre
// sub-causas para não virar oráculo de forjagem.
// -----------------------------------------------------------------------------
describe('P2 — MISSING_AUTH e INVALID_TOKEN são codes distintos', () => {
  it('header ausente e Bearer vazio retornam MISSING_AUTH; assinatura ruim retorna INVALID_TOKEN', async () => {
    const resHeaderAusente = makeRes()
    await requireAuth(makeReq({}), resHeaderAusente, makeNext())
    const codeAusente = (resHeaderAusente._body as { error: { code: string } }).error.code

    const resBearerVazio = makeRes()
    await requireAuth(makeReq({ authorization: 'Bearer ' }), resBearerVazio, makeNext())
    const codeBearerVazio = (resBearerVazio._body as { error: { code: string } }).error.code

    const badToken = await signValid({ signWithWrongKey: true })
    const resBadSig = makeRes()
    await requireAuth(makeReq({ authorization: `Bearer ${badToken}` }), resBadSig, makeNext())
    const codeBadSig = (resBadSig._body as { error: { code: string } }).error.code

    expect(codeAusente).toBe('MISSING_AUTH')
    expect(codeBearerVazio).toBe('MISSING_AUTH')
    expect(codeBadSig).toBe('INVALID_TOKEN')
    expect(codeAusente).not.toBe(codeBadSig)
  })
})

// -----------------------------------------------------------------------------
// NO_ACTIVE_AGENT é 403 (pós-auth) com corpo próprio, MAS o corpo não pode
// carregar nada do JWT nem de terceiros — sub, email, tenant, agent id.
// Regex sobre a serialização protege contra adição futura acidental.
// -----------------------------------------------------------------------------
describe('P2 — NO_ACTIVE_AGENT (403) não vaza dados de terceiros', () => {
  it('corpo só contém error.{code,message}; sem tenant/agent/email do JWT', async () => {
    vi.mocked(findActiveAgentByUserId).mockResolvedValue(null)
    const token = await signValid({ sub: 'user-secret-xyz', email: 'target@example.com' })
    const req = makeReq({ authorization: `Bearer ${token}` })
    const res = makeRes()

    await requireAuth(req, res, makeNext())

    expect(res._status).toBe(403)
    expect(res._body).toEqual({
      error: { code: 'NO_ACTIVE_AGENT', message: 'Usuário sem corretor ativo vinculado' },
    })

    // Defesa dupla: se alguém adicionar um campo no corpo que ecoe o JWT,
    // qualquer uma destas quebra. Faz o vazamento aparecer no CI.
    const serialized = JSON.stringify(res._body)
    expect(serialized).not.toMatch(/tenant/i)
    expect(serialized).not.toMatch(/agent[_-]?id/i)
    expect(serialized).not.toMatch(/target@example\.com/)
    expect(serialized).not.toMatch(/user-secret-xyz/)
  })
})
