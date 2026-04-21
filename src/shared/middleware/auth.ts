import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { findActiveAgentByUserId } from '../../modules/agents'

interface SupabaseJwtPayload {
  sub: string
  email?: string
  aud: string | string[]
  exp: number
  iss?: string
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    console.error('[Auth] SUPABASE_JWT_SECRET não definido no ambiente')
    res.status(500).json({ error: { code: 'SERVER_MISCONFIGURED', message: 'Servidor mal configurado' } })
    return
  }

  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'MISSING_AUTH', message: 'Authorization header ausente ou inválido' } })
    return
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    res.status(401).json({ error: { code: 'MISSING_AUTH', message: 'Token ausente' } })
    return
  }

  let payload: SupabaseJwtPayload
  try {
    const issuer = process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/auth/v1` : undefined
    payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      audience: 'authenticated',
      issuer,
      clockTolerance: 10,
    }) as SupabaseJwtPayload
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token inválido ou expirado' } })
    return
  }

  const agent = await findActiveAgentByUserId(payload.sub)
  if (!agent) {
    res.status(403).json({ error: { code: 'NO_ACTIVE_AGENT', message: 'Usuário sem corretor ativo vinculado' } })
    return
  }

  req.auth = {
    userId: payload.sub,
    email: payload.email ?? '',
    tenantId: agent.tenantId,
    agentId: agent.id,
  }

  next()
}
