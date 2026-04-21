import { supabase } from '../../shared/database/supabase'
import type { AuthAgent, HandoffTarget } from './agents.types'

/**
 * Busca o agent ativo vinculado a um usuário autenticado.
 * Retorna null se o usuário não tem agent ou se o agent está inativo.
 */
export async function findActiveAgentByUserId(userId: string): Promise<AuthAgent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('id, tenant_id, active')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error(`[Agents] findActiveAgentByUserId falhou: ${error.message}`)
    return null
  }
  if (!data || data.active !== true) return null

  return {
    id: data.id as string,
    tenantId: data.tenant_id as string,
    active: data.active as boolean,
  }
}

/**
 * Retorna o telefone do corretor para alerta de handoff:
 *   1. agent vinculado ao lead (leads.agent_id), se ativo e com phone;
 *   2. fallback: primeiro agent ativo do tenant com phone, ordenado por created_at.
 * Retorna null se não houver corretor elegível.
 */
export async function getHandoffTargetPhone(
  tenantId: string,
  leadId: string
): Promise<HandoffTarget | null> {
  const { data: leadRow } = await supabase
    .from('leads')
    .select('agent_id')
    .eq('id', leadId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const assignedAgentId = (leadRow?.agent_id as string | null) ?? null

  if (assignedAgentId) {
    const { data: assigned } = await supabase
      .from('agents')
      .select('id, phone, active')
      .eq('id', assignedAgentId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (
      assigned &&
      assigned.active === true &&
      typeof assigned.phone === 'string' &&
      assigned.phone.length > 0
    ) {
      return { phone: assigned.phone, agentId: assigned.id as string }
    }
  }

  const { data: fallback } = await supabase
    .from('agents')
    .select('id, phone')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .not('phone', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (fallback && typeof fallback.phone === 'string' && fallback.phone.length > 0) {
    return { phone: fallback.phone, agentId: fallback.id as string }
  }

  return null
}
