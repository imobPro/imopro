import type { RequestHandler } from 'express'
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose'
import { findActiveAgentByUserId, AgentLookupError } from '../../modules/agents'

// -----------------------------------------------------------------------------
// JWKS cache — Supabase Auth expõe public keys em /auth/v1/.well-known/jwks.json.
// createRemoteJWKSet faz cache em memória com cooldown (default 30s) e refresh
// automático quando aparece um kid novo. Lazy init: só monta o cliente quando
// a primeira request chega, evitando crash se SUPABASE_URL ainda não está no env.
// Pré-requisito operacional: o projeto Supabase precisa ter asymmetric signing
// habilitado (Project Settings → JWT Signing Keys → Migrate to ECC/RSA). Sem
// isso, o endpoint retorna {} vazio e jwtVerify lança ERR_JWKS_NO_MATCHING_KEY.
// -----------------------------------------------------------------------------

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (jwksCache) return jwksCache
  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) throw new Error('SUPABASE_URL não definido')
  jwksCache = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  return jwksCache
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[Auth] SUPABASE_URL não definido no ambiente')
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

  let payload: JWTPayload
  try {
    const result = await jwtVerify(token, getJWKS(), {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
      clockTolerance: 10,
    })
    payload = result.payload
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token inválido ou expirado' } })
    return
  }

  if (typeof payload.sub !== 'string') {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token sem subject' } })
    return
  }

  let agent
  try {
    agent = await findActiveAgentByUserId(payload.sub)
  } catch (err) {
    if (err instanceof AgentLookupError) {
      res.status(500).json({ error: { code: 'AGENT_LOOKUP_FAILED', message: 'Falha ao consultar corretor' } })
      return
    }
    throw err
  }

  if (!agent) {
    res.status(403).json({ error: { code: 'NO_ACTIVE_AGENT', message: 'Usuário sem corretor ativo vinculado' } })
    return
  }

  const email = typeof payload.email === 'string' ? payload.email : null

  req.auth = {
    userId: payload.sub,
    email,
    tenantId: agent.tenantId,
    agentId: agent.id,
  }

  next()
}
