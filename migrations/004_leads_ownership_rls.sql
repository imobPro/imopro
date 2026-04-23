-- =============================================================================
-- ImobPro — Migration 004: RLS por ownership do lead
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Contexto (Sprint 6):
-- A migration 003 deixa qualquer agent ativo do tenant ver todos os leads.
-- No painel web (modo 'shared') a regra é mais restrita: cada corretor vê
-- apenas os leads que são dele OU que ainda não têm dono (agent_id IS NULL).
-- No modo 'individual' o comportamento não muda — o tenant tem 1 agent ativo,
-- então "próprios + sem dono" cobre 100% dos leads do tenant.
--
-- Backend (worker/services) continua usando service_role, que bypassa RLS —
-- nenhuma lógica do servidor muda. A RLS só entra em jogo quando o frontend
-- lê direto via JWT do usuário (Realtime e queries do Supabase JS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. leads — "próprios + sem dono"
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "leads_member_access" ON leads;

CREATE POLICY "leads_owner_or_unassigned" ON leads
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
    AND (
      agent_id IS NULL
      OR agent_id IN (
        SELECT id FROM agents
        WHERE user_id = auth.uid() AND active = true
      )
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
    AND (
      agent_id IS NULL
      OR agent_id IN (
        SELECT id FROM agents
        WHERE user_id = auth.uid() AND active = true
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 2. conversations — visíveis se o lead é visível
-- -----------------------------------------------------------------------------
--
-- EXISTS (SELECT 1 FROM leads ...) respeita a RLS de leads, então a linha só
-- aparece se a policy 'leads_owner_or_unassigned' deixar o lead correspondente
-- visível para o usuário atual.

DROP POLICY IF EXISTS "conversations_member_access" ON conversations;

CREATE POLICY "conversations_via_visible_lead" ON conversations
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
    )
  );

-- -----------------------------------------------------------------------------
-- 3. messages — idem: visíveis se o lead é visível
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "messages_member_access" ON messages;

CREATE POLICY "messages_via_visible_lead" ON messages
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = messages.lead_id
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM agents
      WHERE user_id = auth.uid() AND active = true
    )
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = messages.lead_id
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Realtime — habilitar REPLICA IDENTITY FULL nas tabelas consumidas pelo frontend
--
-- Supabase Realtime precisa de REPLICA IDENTITY para decodificar updates.
-- Default é DEFAULT (chave primária), que já funciona para INSERT/DELETE e
-- para UPDATE quando a chave não muda. FULL emite a linha inteira em updates
-- — necessário para acessar colunas pré-alteração em UPDATE.
-- -----------------------------------------------------------------------------

ALTER TABLE leads REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- No Supabase, a publicação é configurada via Dashboard (Database → Replication).
-- Esta migration apenas prepara as tabelas; o toggle de replication é manual.
