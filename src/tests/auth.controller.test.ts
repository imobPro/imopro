import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { getMe } from '../modules/auth/auth.controller'
import { HttpError } from '../shared/errors/http-error'

// -----------------------------------------------------------------------------
// Cobre `getMe` — o único handler do módulo auth. Handler não fala com banco;
// mock só de req/res. Regras exercitadas:
//   1. req.auth ausente → 401 MISSING_AUTH (defesa contra remoção acidental
//      do requireAuth na rota; o controller falha loud em vez de vazar).
//   2. req.auth populado → response ecoa EXATAMENTE { userId, email, tenantId,
//      agentId }. Nem menos (regressão de omissão) nem mais (regressão de
//      exposição — imagine alguém adicionar `phone` sem pensar).
//   3. Campos extras em req.auth não vazam (o handler seleciona a whitelist,
//      não faz spread).
// -----------------------------------------------------------------------------

function makeReq(auth?: Request['auth']): Request {
  return { auth } as unknown as Request
}

function makeRes(): Response & { _body?: unknown } {
  const res: Partial<Response> & { _body?: unknown } = {}
  res.json = vi.fn((body: unknown) => {
    res._body = body
    return res as Response
  })
  return res as Response & { _body?: unknown }
}

describe('getMe', () => {
  it('lança HttpError 401 MISSING_AUTH quando req.auth está ausente', () => {
    const req = makeReq(undefined)
    const res = makeRes()

    expect(() => getMe(req, res)).toThrow(HttpError)

    try {
      getMe(req, res)
      throw new Error('deveria ter lançado')
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError)
      const httpErr = err as HttpError
      expect(httpErr.status).toBe(401)
      expect(httpErr.code).toBe('MISSING_AUTH')
    }
    expect(res.json).not.toHaveBeenCalled()
  })

  it('retorna exatamente { userId, email, tenantId, agentId } — nada a mais, nada a menos', () => {
    const req = makeReq({
      userId: 'user-1',
      email: 'arthur@example.com',
      tenantId: 'tenant-A',
      agentId: 'agent-9',
    })
    const res = makeRes()

    getMe(req, res)

    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res._body).toEqual({
      userId: 'user-1',
      email: 'arthur@example.com',
      tenantId: 'tenant-A',
      agentId: 'agent-9',
    })
  })

  it('não copia campos extras de req.auth para a response', () => {
    // Stub com campos que NÃO estão na interface Request['auth']. Simulamos um
    // futuro em que o middleware por engano popule req.auth com dados alheios
    // (ex.: role, phone, sessionSecret). O controller deve selecionar apenas
    // a whitelist declarada.
    const authWithExtras = {
      userId: 'user-2',
      email: null,
      tenantId: 'tenant-B',
      agentId: 'agent-2',
      role: 'admin',
      phone: '+5521999999999',
      sessionSecret: 'do-not-leak',
    } as unknown as Request['auth']
    const req = makeReq(authWithExtras)
    const res = makeRes()

    getMe(req, res)

    const body = res._body as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['agentId', 'email', 'tenantId', 'userId'])
    expect(body).not.toHaveProperty('role')
    expect(body).not.toHaveProperty('phone')
    expect(body).not.toHaveProperty('sessionSecret')
  })
})
