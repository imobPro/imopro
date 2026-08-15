import { supabase } from './supabase'
import type { AuthAgent } from '../types/agent'

// -----------------------------------------------------------------------------
// Lookup do agent ativo pelo user_id — usado APENAS pelo middleware requireAuth,
// que precisa resolver o tenant do usuário antes de qualquer rota. Mora aqui
// porque shared/middleware/auth.ts não pode depender de modules/agents (violaria
// shared-nao-conhece-modulos do dep-cruiser).
//
// CONTRATO T1: recebe userId direto do JWT verificado por jwtVerify (payload.sub).
// Nunca vem de req.body/query/params.
// -----------------------------------------------------------------------------

export class AgentLookupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentLookupError'
  }
}

export async function findActiveAgentByUserId(userId: string): Promise<AuthAgent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('id, tenant_id, active')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle()

  if (error) {
    console.error(`[AgentsAuth] findActiveAgentByUserId falhou: ${error.message}`)
    throw new AgentLookupError(error.message)
  }
  if (!data) return null

  return {
    id: data.id as string,
    tenantId: data.tenant_id as string,
    active: data.active as boolean,
  }
}
