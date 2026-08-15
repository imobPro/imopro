import { supabase } from '../../shared/database/supabase'
import type { AgentForReports, HandoffTarget } from './agents.types'

// PONTE — findActiveAgentByUserId e AgentLookupError mudaram de casa para
// shared/database/agents-auth.ts (evita shared/middleware/auth importar módulo).
// Este re-export existe só para não quebrar callers e testes atuais.
// Não adicione lógica aqui. Ao tocar num caller, migre o import
// para o shared e remova a ponte quando o último sair.
// Registrado em docs/divida-tecnica.md.
export { findActiveAgentByUserId, AgentLookupError } from '../../shared/database/agents-auth'

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

/**
 * Lista todos os agents ativos com e-mail conhecido em auth.users — usado pelo
 * cron de relatórios automáticos. Roda com service-role (bypassa RLS).
 *
 * Implementado em duas queries porque PostgREST não consegue fazer join direto
 * em auth.users a partir de public.agents sem foreign key declarada.
 */
export async function listAgentsForReports(): Promise<AgentForReports[]> {
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, user_id, tenant_id, tenants(name)')
    .eq('active', true)
    .not('user_id', 'is', null)

  if (agentsError) {
    console.error(`[Agents] listAgentsForReports falhou: ${agentsError.message}`)
    return []
  }

  const rows = (agents ?? []) as unknown as Array<{
    id: string
    name: string
    user_id: string
    tenant_id: string
    tenants: { name: string } | { name: string }[] | null
  }>

  if (rows.length === 0) return []

  // Defensivo: cada lookup em try/catch para que uma falha isolada do auth admin
  // não derrube o cron inteiro (Promise.all rejeita no primeiro throw).
  const emails = await Promise.all(
    rows.map(async (row) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(row.user_id)
        if (error || !data.user?.email) return null
        return { userId: row.user_id, email: data.user.email }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Agents] getUserById ${row.user_id} lançou: ${msg}`)
        return null
      }
    })
  )

  const emailMap = new Map<string, string>()
  for (const e of emails) if (e) emailMap.set(e.userId, e.email)

  return rows
    .filter((row) => emailMap.has(row.user_id))
    .map((row) => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants
      return {
        agentId: row.id,
        agentName: row.name,
        email: emailMap.get(row.user_id)!,
        tenantId: row.tenant_id,
        tenantName: tenant?.name ?? 'Imobiliária',
      }
    })
}
