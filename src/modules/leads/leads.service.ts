import { supabase } from '../../shared/database/supabase'
import type {
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
  const { error } = await supabase
    .from('leads')
    .update({ status })
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
    // Fallback: busca score atual e atualiza
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
// Contexto da conversa ativa — aiFailedAttempts e messageCount persistidos
// -----------------------------------------------------------------------------

export async function getConversationStats(
  tenantId: string,
  leadId: string
): Promise<{ aiFailedAttempts: number; messageCount: number }> {
  const { data } = await supabase
    .from('conversations')
    .select('ai_failed_attempts, message_count')
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .single()

  return {
    aiFailedAttempts: (data?.ai_failed_attempts as number | null) ?? 0,
    messageCount: (data?.message_count as number | null) ?? 0,
  }
}

// -----------------------------------------------------------------------------
// Histórico das últimas N mensagens da conversa — alimenta o contexto da IA
// -----------------------------------------------------------------------------

export async function getConversationHistory(
  tenantId: string,
  leadId: string,
  limit = 20
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .single()

  if (!conv) return []

  const { data: messages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', (conv as { id: string }).id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!messages || messages.length === 0) return []

  return (messages as Array<{ role: string; content: string }>)
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
  await supabase
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
}

// -----------------------------------------------------------------------------
// Persiste a contagem de falhas da IA — chamado quando generateResponse lança
// -----------------------------------------------------------------------------

export async function persistAiFailure(
  tenantId: string,
  leadId: string,
  aiFailedAttempts: number
): Promise<void> {
  await supabase
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
}

// -----------------------------------------------------------------------------
// Sinaliza leads inativos (sem resposta há 30 dias) — corretor decide o status
// -----------------------------------------------------------------------------

export async function flagInactiveLeads(tenantId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('leads')
    .update({ inactive_flagged_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .lt('last_message_at', cutoff)
    .neq('status', 'fechado')
    .is('inactive_flagged_at', null)
    .select('id')

  if (error) throw new Error(`[Leads] flagInactiveLeads falhou: ${error.message}`)

  return data?.length ?? 0
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
