import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../modules/agents', () => ({
  findActiveAgentByUserId: vi.fn(),
}))

import { findActiveAgentByUserId } from '../modules/agents'
import { requireAuth } from '../shared/middleware/auth'

const SECRET = process.env.SUPABASE_JWT_SECRET ?? 'test-secret-nope'

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

function signValid(overrides: Record<string, unknown> = {}): string {
  return jwt.sign(
    {
      sub: 'user-123',
      email: 'arthur@example.com',
      aud: 'authenticated',
      iss: `${process.env.SUPABASE_URL}/auth/v1`,
      ...overrides,
    },
    SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  )
}

beforeEach(() => {
  vi.mocked(findActiveAgentByUserId).mockReset()
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

  it('rejeita 401 quando JWT tem assinatura inválida', async () => {
    const badToken = jwt.sign({ sub: 'user-1', aud: 'authenticated' }, 'outro-segredo', {
      algorithm: 'HS256',
    })
    const req = makeReq({ authorization: `Bearer ${badToken}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('INVALID_TOKEN')
  })

  it('rejeita 401 quando JWT está expirado', async () => {
    const expiredToken = jwt.sign(
      {
        sub: 'user-1',
        aud: 'authenticated',
        iss: `${process.env.SUPABASE_URL}/auth/v1`,
      },
      SECRET,
      { algorithm: 'HS256', expiresIn: '-1h' }
    )
    const req = makeReq({ authorization: `Bearer ${expiredToken}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('INVALID_TOKEN')
  })

  it('rejeita 403 quando user não tem agent ativo', async () => {
    vi.mocked(findActiveAgentByUserId).mockResolvedValue(null)
    const req = makeReq({ authorization: `Bearer ${signValid()}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(403)
    expect((res._body as { error: { code: string } }).error.code).toBe('NO_ACTIVE_AGENT')
    expect(next).not.toHaveBeenCalled()
  })

  it('chama next e popula req.auth quando JWT válido e agent ativo', async () => {
    vi.mocked(findActiveAgentByUserId).mockResolvedValue({
      id: 'agent-1',
      tenantId: 'tenant-A',
      active: true,
    })
    const req = makeReq({ authorization: `Bearer ${signValid()}` })
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

  it('rejeita 401 quando audience do JWT não é authenticated', async () => {
    const wrongAud = jwt.sign(
      {
        sub: 'user-1',
        aud: 'admin',
        iss: `${process.env.SUPABASE_URL}/auth/v1`,
      },
      SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    )
    const req = makeReq({ authorization: `Bearer ${wrongAud}` })
    const res = makeRes()
    const next = makeNext()

    await requireAuth(req, res, next)

    expect(res._status).toBe(401)
    expect((res._body as { error: { code: string } }).error.code).toBe('INVALID_TOKEN')
  })
})
