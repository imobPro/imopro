-- =============================================================================
-- ImobPro — Migration 010: RPC unificada para histórico da conversa
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Antes: leads.service.ts.getConversationHistory fazia 2 round-trips ao banco
-- por mensagem entrando — primeiro lookup de conversation por (tenant_id,
-- lead_id), depois fetch das mensagens por conversation_id. Soma a latência
-- duas vezes em uma rota crítica do worker.
--
-- Agora: 1 round-trip via RPC. JOIN interno entre conversations e messages,
-- ordenado DESC com LIMIT, com checagem explícita de tenant_id (isolamento
-- multi-tenant em app-layer mesmo quando o caller é service-role).
--
-- SECURITY INVOKER (default): RLS continua valendo quando frontend chamar.
-- Backend usa service-role e bypassa RLS, mas o filtro de tenant_id na RPC
-- garante isolamento mesmo nesse cenário.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_conversation_history(
  p_tenant_id uuid,
  p_lead_id   uuid,
  p_limit     int DEFAULT 20
) RETURNS TABLE (role message_role, content text)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT m.role, m.content
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE c.tenant_id = p_tenant_id
    AND c.lead_id   = p_lead_id
    AND m.tenant_id = p_tenant_id
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_conversation_history IS
  'Histórico das últimas N mensagens da conversa de um lead. Substitui o lookup duplo conversation+messages por 1 round-trip. Retorna em ordem DESC; caller deve inverter para ASC ao alimentar a IA.';
