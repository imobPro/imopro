-- =============================================================================
-- ImobPro — Migration 006: Quebra recursão da RLS via funções SECURITY DEFINER
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Contexto:
-- As policies das migrations 003 e 004 usam subqueries do tipo
--   `SELECT tenant_id FROM agents WHERE user_id = auth.uid() AND active = true`
-- dentro da própria RLS de agents — isso causa recursão infinita detectada pelo
-- PostgreSQL ("infinite recursion detected in policy for relation agents").
-- A tentativa da 005 (adicionar policy self permissiva) não resolveu porque o
-- PG avalia todas as policies permissivas antes de combinar por OR — a
-- recursiva ainda roda e aborta a query com erro.
--
-- Solução padrão do Supabase: encapsular o lookup em funções SECURITY DEFINER
-- que bypassam RLS. Políticas chamam a função em vez de um subquery.
--
-- Segurança: funções STABLE SECURITY DEFINER com search_path fixo em
-- public,pg_temp para impedir hijack via search_path. Granted apenas para
-- authenticated role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper functions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id
  FROM public.agents
  WHERE user_id = auth.uid() AND active = true;
$$;

CREATE OR REPLACE FUNCTION public.auth_agent_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id
  FROM public.agents
  WHERE user_id = auth.uid() AND active = true;
$$;

REVOKE ALL ON FUNCTION public.auth_tenant_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_agent_ids()  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_agent_ids()  TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Drop policies recursivas
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "tenants_member_access"       ON tenants;
DROP POLICY IF EXISTS "agents_member_access"        ON agents;
DROP POLICY IF EXISTS "agents_self_select"          ON agents;            -- da 005
DROP POLICY IF EXISTS "leads_owner_or_unassigned"   ON leads;
DROP POLICY IF EXISTS "conversations_via_visible_lead" ON conversations;
DROP POLICY IF EXISTS "messages_via_visible_lead"   ON messages;

-- -----------------------------------------------------------------------------
-- 3. Policies reescritas com helper functions (não recursivas)
-- -----------------------------------------------------------------------------

CREATE POLICY "tenants_member_access" ON tenants
  FOR ALL
  USING (id IN (SELECT public.auth_tenant_ids()))
  WITH CHECK (id IN (SELECT public.auth_tenant_ids()));

CREATE POLICY "agents_member_access" ON agents
  FOR ALL
  USING (tenant_id IN (SELECT public.auth_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.auth_tenant_ids()));

CREATE POLICY "leads_owner_or_unassigned" ON leads
  FOR ALL
  USING (
    tenant_id IN (SELECT public.auth_tenant_ids())
    AND (
      agent_id IS NULL
      OR agent_id IN (SELECT public.auth_agent_ids())
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT public.auth_tenant_ids())
    AND (
      agent_id IS NULL
      OR agent_id IN (SELECT public.auth_agent_ids())
    )
  );

CREATE POLICY "conversations_via_visible_lead" ON conversations
  FOR ALL
  USING (
    tenant_id IN (SELECT public.auth_tenant_ids())
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = conversations.lead_id)
  )
  WITH CHECK (
    tenant_id IN (SELECT public.auth_tenant_ids())
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = conversations.lead_id)
  );

CREATE POLICY "messages_via_visible_lead" ON messages
  FOR ALL
  USING (
    tenant_id IN (SELECT public.auth_tenant_ids())
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = messages.lead_id)
  )
  WITH CHECK (
    tenant_id IN (SELECT public.auth_tenant_ids())
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = messages.lead_id)
  );
