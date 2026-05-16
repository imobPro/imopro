import { supabase } from '../../shared/database/supabase'
import { captureSilentError } from '../../shared/observability/sentry'
import type {
  IncomingMessage,
  Lead,
  LeadStatus,
  UpsertLeadParams,
  SaveConversationMessagesParams,
} from './leads.types'
import type { IntentType } from '../ai-engine/ai-engine.types'

// -----------------------------------------------------------------------------
// Score delta por intenção detectada pela IA
// -----------------------------------------------------------------------------

export function calcScoreDelta(intent: IntentType): number {
  if (intent === 'visita') return 2
  if (intent === 'compra' || intent === 'aluguel' || intent === 'venda') return 1
  return 0
}

// -----------------------------------------------------------------------------
// Upsert de lead — cria ou atualiza por (tenant_id, phone)
// -----------------------------------------------------------------------------

export async function upsertLead(params: UpsertLeadParams): Promise<Lead> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('leads')
    .upsert(
      {
        tenant_id: params.tenantId,
        phone: params.phone,
        // Sobrescreve name/region/profile/intent apenas se fornecidos
        ...(params.name != null && { name: params.name }),
        ...(params.region != null && { region: params.region }),
        ...(params.profile != null && { profile: params.profile }),
        ...(params.intent != null && { intent: params.intent }),
        last_message_at: now,
      },
      {
        onConflict: 'tenant_id,phone',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single()

  if (error) throw new Error(`[Leads] upsertLead falhou: ${error.message}`)

  return toLeadDomain(data)
}

// -----------------------------------------------------------------------------
// Atualiza status do lead — validação extra de tenant_id além do RLS
// -----------------------------------------------------------------------------

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  tenantId: string
): Promise<void> {
  const update: Record<string, unknown> = { status }

  // Marca o instante da primeira transição para 'qualificado' e 'fechado'.
  // Necessário para os cálculos de tempo médio nos relatórios. Não sobrescrever
  // se já estiver preenchido — primeira transição vence (caso o lead reabra
  // e volte a 'qualificado', o timestamp original permanece).
  if (status === 'qualificado') {
    const { data } = await supabase
      .from('leads')
      .select('qualified_at')
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!data?.qualified_at) update.qualified_at = new Date().toISOString()
  }
  if (status === 'fechado') {
    const { data } = await supabase
      .from('leads')
      .select('closed_at')
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!data?.closed_at) update.closed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('leads')
    .update(update)
    .eq('id', leadId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`[Leads] updateLeadStatus falhou: ${error.message}`)
}

// -----------------------------------------------------------------------------
// Incrementa score — respeita máximo 5
// -----------------------------------------------------------------------------

export async function scoreUp(
  leadId: string,
  tenantId: string,
  delta: number
): Promise<void> {
  if (delta <= 0) return

  // Usa RPC para incremento atômico com cap de 5
  const { error } = await supabase.rpc('increment_lead_score', {
    p_lead_id: leadId,
    p_tenant_id: tenantId,
    p_delta: delta,
  })

  if (error) {
    // Fallback não-atômico: read-then-write. Reportar ao Sentry pra detectar
    // regressão da RPC.
    captureSilentError(error, {
      module: 'Leads',
      operation: 'scoreUp.rpc (usando fallback não-atômico)',
      tenantId,
      leadId,
    })

    const { data: lead } = await supabase
      .from('leads')
      .select('score')
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .single()

    if (lead) {
      const newScore = Math.min(5, (lead.score as number) + delta)
      await supabase
        .from('leads')
        .update({ score: newScore })
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
    }
  }
}

// -----------------------------------------------------------------------------
// Upsert de conversa + bulk insert de mensagens
// -----------------------------------------------------------------------------

export async function saveConversationMessages(
  params: SaveConversationMessagesParams
): Promise<void> {
  const { tenantId, leadId, incomingMessages, aiResponseText, aiFailedAttempts } = params
  const now = new Date().toISOString()

  // 1. Upsert conversation (uma por lead ativa)
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .upsert(
      {
        tenant_id: tenantId,
        lead_id: leadId,
        last_message_at: now,
        ai_failed_attempts: aiFailedAttempts,
      },
      { onConflict: 'tenant_id,lead_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (convError) throw new Error(`[Leads] upsert conversation falhou: ${convError.message}`)

  const conversationId: string = conv.id

  // 2. Montar bulk de mensagens a inserir
  const messagesToInsert = [
    // Mensagens do lead (incoming)
    ...incomingMessages.map((m) => ({
      tenant_id: tenantId,
      conversation_id: conversationId,
      lead_id: leadId,
      role: 'user' as const,
      content: m.content,
      type: m.type,
      media_url: m.mediaUrl,
      zapi_message_id: m.zapiMessageId,
      created_at: now,
    })),
    // Resposta da IA
    {
      tenant_id: tenantId,
      conversation_id: conversationId,
      lead_id: leadId,
      role: 'assistant' as const,
      content: aiResponseText,
      type: 'text' as const,
      media_url: null,
      zapi_message_id: null,
      created_at: now,
    },
  ]

  // ON CONFLICT em zapi_message_id: ignora re-entregas do Z-API
  const { error: msgError } = await supabase
    .from('messages')
    .upsert(messagesToInsert, {
      onConflict: 'zapi_message_id',
      ignoreDuplicates: true,
    })

  if (msgError) throw new Error(`[Leads] insert messages falhou: ${msgError.message}`)

  // 3. Incrementa message_count na conversation
  await supabase.rpc('increment_conversation_count', {
    p_conversation_id: conversationId,
    p_count: incomingMessages.length + 1,
  })
}

// -----------------------------------------------------------------------------
// Persiste apenas as mensagens do lead — usado quando o agente está desligado
// (agent_active=false): não há resposta da IA, mas a mensagem precisa ficar
// disponível no painel para o corretor responder manualmente.
// -----------------------------------------------------------------------------

export async function saveIncomingMessagesOnly(params: {
  tenantId: string
  leadId: string
  incomingMessages: IncomingMessage[]
}): Promise<void> {
  const { tenantId, leadId, incomingMessages } = params
  if (incomingMessages.length === 0) return
  const now = new Date().toISOString()

  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .upsert(
      { tenant_id: tenantId, lead_id: leadId, last_message_at: now },
      { onConflict: 'tenant_id,lead_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (convError) throw new Error(`[Leads] saveIncomingMessagesOnly upsert conversation falhou: ${convError.message}`)

  const conversationId: string = conv.id

  const messagesToInsert = incomingMessages.map((m) => ({
    tenant_id: tenantId,
    conversation_id: conversationId,
    lead_id: leadId,
    role: 'user' as const,
    content: m.content,
    type: m.type,
    media_url: m.mediaUrl,
    zapi_message_id: m.zapiMessageId,
    created_at: now,
  }))

  const { error: msgError } = await supabase
    .from('messages')
    .upsert(messagesToInsert, { onConflict: 'zapi_message_id', ignoreDuplicates: true })

  if (msgError) throw new Error(`[Leads] saveIncomingMessagesOnly insert messages falhou: ${msgError.message}`)

  await supabase.rpc('increment_conversation_count', {
    p_conversation_id: conversationId,
    p_count: incomingMessages.length,
  })
}

// -----------------------------------------------------------------------------
// Contexto da conversa ativa — aiFailedAttempts e messageCount persistidos
// -----------------------------------------------------------------------------

export async function getConversationStats(
  tenantId: string,
  leadId: string
): Promise<{ aiFailedAttempts: number; messageCount: number }> {
  const { data, error } = await supabase
    .from('conversations')
    .select('ai_failed_attempts, message_count')
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .maybeSingle()

  // Conversation pode não existir ainda na 1ª mensagem do lead — não é erro.
  // PGRST116 = "no rows" (caso ocorra mesmo com maybeSingle, ignoramos).
  if (error && error.code !== 'PGRST116') {
    captureSilentError(error, {
      module: 'Leads',
      operation: 'getConversationStats',
      tenantId,
      leadId,
    })
  }

  return {
    aiFailedAttempts: (data?.ai_failed_attempts as number | null) ?? 0,
    messageCount: (data?.message_count as number | null) ?? 0,
  }
}

// -----------------------------------------------------------------------------
// Histórico das últimas N mensagens da conversa — alimenta o contexto da IA
// -----------------------------------------------------------------------------
// Migration 010 unificou em 1 round-trip via RPC get_conversation_history.
// A RPC retorna ordem DESC; aqui invertemos para ASC (esperado pela IA).

export async function getConversationHistory(
  tenantId: string,
  leadId: string,
  limit = 20
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data, error } = await supabase.rpc('get_conversation_history', {
    p_tenant_id: tenantId,
    p_lead_id: leadId,
    p_limit: limit,
  })

  if (error) {
    captureSilentError(error, {
      module: 'Leads',
      operation: 'getConversationHistory.rpc',
      tenantId,
      leadId,
    })
    return []
  }
  if (!data || data.length === 0) return []

  return (data as Array<{ role: string; content: string }>)
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}

// -----------------------------------------------------------------------------
// Atualiza o sentimento da conversa — sempre salvo após cada atendimento
// -----------------------------------------------------------------------------

export async function updateConversationSentiment(
  tenantId: string,
  leadId: string,
  sentiment: 'positivo' | 'neutro' | 'negativo'
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .upsert(
      {
        tenant_id: tenantId,
        lead_id: leadId,
        sentiment,
        sentiment_updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,lead_id', ignoreDuplicates: false }
    )

  if (error) {
    captureSilentError(error, {
      module: 'Leads',
      operation: 'updateConversationSentiment',
      tenantId,
      leadId,
    })
  }
}

// -----------------------------------------------------------------------------
// Persiste a contagem de falhas da IA — chamado quando generateResponse lança
// -----------------------------------------------------------------------------

export async function persistAiFailure(
  tenantId: string,
  leadId: string,
  aiFailedAttempts: number
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .upsert(
      {
        tenant_id: tenantId,
        lead_id: leadId,
        ai_failed_attempts: aiFailedAttempts,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,lead_id', ignoreDuplicates: false }
    )

  if (error) {
    // Crítico (lessons.md): sem persistir, "2 falhas → transferir" não dispara
    // entre jobs. Reportar ao Sentry pra não passar despercebido.
    captureSilentError(error, {
      module: 'Leads',
      operation: 'persistAiFailure',
      tenantId,
      leadId,
      extra: { aiFailedAttempts },
    })
  }
}

// -----------------------------------------------------------------------------
// Marca leads inativos (sem mensagem há REPORTS_INACTIVE_DAYS) — muda o status
// para 'inativo' diretamente (decisão Sprint 7: sem alerta, sem reengajamento).
// -----------------------------------------------------------------------------

export async function flagInactiveLeads(tenantId: string): Promise<number> {
  const days = Number(process.env.REPORTS_INACTIVE_DAYS ?? '7') || 7
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('leads')
    .update({ status: 'inativo', inactive_flagged_at: now })
    .eq('tenant_id', tenantId)
    .lt('last_message_at', cutoff)
    .not('status', 'in', '("fechado","inativo")')
    .select('id')

  if (error) throw new Error(`[Leads] flagInactiveLeads falhou: ${error.message}`)

  return data?.length ?? 0
}

// Versão multi-tenant — chamada pelo cron diário
export async function flagInactiveLeadsAllTenants(): Promise<{ tenants: number; flagged: number }> {
  const { data: tenants, error } = await supabase.from('tenants').select('id')
  if (error) {
    captureSilentError(error, {
      module: 'Leads',
      operation: 'flagInactiveLeadsAllTenants.listTenants',
    })
    return { tenants: 0, flagged: 0 }
  }

  let flagged = 0
  for (const t of (tenants ?? []) as Array<{ id: string }>) {
    try {
      flagged += await flagInactiveLeads(t.id)
    } catch (err) {
      captureSilentError(err, {
        module: 'Leads',
        operation: 'flagInactiveLeads (per tenant)',
        tenantId: t.id,
      })
    }
  }
  return { tenants: tenants?.length ?? 0, flagged }
}

// -----------------------------------------------------------------------------
// Helpers de mapeamento (snake_case → camelCase)
// -----------------------------------------------------------------------------

function toLeadDomain(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    agentId: (row.agent_id as string | null) ?? null,
    phone: row.phone as string,
    name: (row.name as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    status: row.status as LeadStatus,
    score: row.score as number,
    profile: (row.profile as Lead['profile']) ?? null,
    intent: (row.intent as Lead['intent']) ?? null,
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    inactiveFlaggedAt: (row.inactive_flagged_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}
