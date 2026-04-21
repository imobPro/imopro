-- =============================================================================
-- ImobPro — Migration 003: Autenticação + soft delete de agents + RLS real
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. agents: vínculo com auth.users + soft delete
-- -----------------------------------------------------------------------------

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active  boolean NOT NULL DEFAULT true;

-- 1 e-mail = 1 agent (parcial: NULL é permitido para agents ainda não linkados)
CREATE UNIQUE INDEX IF NOT EXISTS agents_user_id_unique
  ON agents(user_id)
  WHERE user_id IS NOT NULL;

-- Fallback do handoff procura o primeiro agent ativo do tenant
CREATE INDEX IF NOT EXISTS idx_agents_tenant_active
  ON agents(tenant_id)
  WHERE active = true;

-- -----------------------------------------------------------------------------
-- 2. RLS — reescrever políticas para usar a tabela agents como verdade
--
-- As políticas originais (migration 001) referenciavam
-- (auth.jwt() ->> 'tenant_id') — um claim que o sistema nunca set. O backend
-- usa service-role (que bypassa RLS), então isso não quebrou em produção.
-- Mas o frontend do Sprint 6 vai usar o JWT do usuário (Realtime, queries
-- diretas do Supabase JS) e precisa que o RLS resolva tenant_id a partir de
-- auth.uid() → agents.user_id → agents.tenant_id.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "tenants_tenant_isolation"       ON tenants;
DROP POLICY IF EXISTS "agents_tenant_isolation"        ON agents;
DROP POLICY IF EXISTS "leads_tenant_isolation"         ON leads;
DROP POLICY IF EXISTS "conversations_tenant_isolation" ON conversations;
DROP POLICY IF EXISTS "messages_tenant_isolation"      ON messages;

CREATE POLICY "tenants_member_access" ON tenants
  FOR ALL USING (
    id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "agents_member_access" ON agents
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "leads_member_access" ON leads
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "conversations_member_access" ON conversations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "messages_member_access" ON messages
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
  );
