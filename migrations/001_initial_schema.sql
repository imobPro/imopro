-- =============================================================================
-- ImobPro — Migration 001: Schema inicial
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------

CREATE TYPE operation_mode AS ENUM ('shared', 'individual');
-- shared:     número único da imobiliária, vários corretores internos
-- individual: número próprio por corretor

CREATE TYPE lead_status AS ENUM (
  'novo',
  'em_conversa',
  'qualificado',
  'transferido',
  'em_negociacao',
  'fechado'
);

CREATE TYPE lead_profile AS ENUM (
  'comprador',
  'inquilino',
  'vendedor',
  'captacao',
  'investidor',
  'indicador'
);

CREATE TYPE intent_type AS ENUM (
  'compra',
  'aluguel',
  'venda',
  'informacao',
  'visita',
  'desconhecido'
);

CREATE TYPE message_role AS ENUM ('user', 'assistant');

CREATE TYPE message_type AS ENUM (
  'text',
  'audio',
  'image',
  'document',
  'sticker',
  'location'
);

-- -----------------------------------------------------------------------------
-- tenants — imobiliárias ou corretores individuais
-- -----------------------------------------------------------------------------

CREATE TABLE tenants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  operation_mode operation_mode NOT NULL DEFAULT 'shared',
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_tenant_isolation" ON tenants
  FOR ALL USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- -----------------------------------------------------------------------------
-- agents — corretores vinculados a um tenant
-- No modo 'individual', cada tenant tem exatamente 1 agent (o próprio corretor)
-- No modo 'shared', um tenant pode ter vários agents
-- -----------------------------------------------------------------------------

CREATE TABLE agents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_tenant_isolation" ON agents
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE INDEX idx_agents_tenant ON agents(tenant_id);

-- -----------------------------------------------------------------------------
-- leads — contatos captados via WhatsApp
-- -----------------------------------------------------------------------------

CREATE TABLE leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id            uuid REFERENCES agents(id) ON DELETE SET NULL,  -- corretor responsável
  phone               text NOT NULL,
  name                text,
  region              text,                  -- bairro / região de interesse
  status              lead_status NOT NULL DEFAULT 'novo',
  score               smallint NOT NULL DEFAULT 1 CHECK (score BETWEEN 1 AND 5),
  profile             lead_profile,
  intent              intent_type,
  last_message_at     timestamptz,
  inactive_flagged_at timestamptz,           -- sinalizado pelo sistema; corretor decide o status
  created_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, phone)
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_tenant_isolation" ON leads
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Índices para consultas frequentes do painel
CREATE INDEX idx_leads_tenant_status   ON leads(tenant_id, status);
CREATE INDEX idx_leads_tenant_score    ON leads(tenant_id, score DESC);
CREATE INDEX idx_leads_tenant_agent    ON leads(tenant_id, agent_id);
CREATE INDEX idx_leads_last_message    ON leads(tenant_id, last_message_at DESC);
CREATE INDEX idx_leads_inactive_flag   ON leads(tenant_id, inactive_flagged_at)
  WHERE inactive_flagged_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- conversations — uma conversa ativa por lead
-- -----------------------------------------------------------------------------

CREATE TABLE conversations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id            uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message_count      int NOT NULL DEFAULT 0,
  ai_failed_attempts int NOT NULL DEFAULT 0,
  started_at         timestamptz NOT NULL DEFAULT now(),
  last_message_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, lead_id)   -- necessário para upsert por onConflict
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_tenant_isolation" ON conversations
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE INDEX idx_conversations_lead     ON conversations(lead_id);
CREATE INDEX idx_conversations_tenant   ON conversations(tenant_id, last_message_at DESC);

-- -----------------------------------------------------------------------------
-- messages — histórico completo de mensagens por conversa
-- -----------------------------------------------------------------------------

CREATE TABLE messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  lead_id          uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  role             message_role NOT NULL,
  content          text NOT NULL,
  type             message_type NOT NULL DEFAULT 'text',
  media_url        text,
  zapi_message_id  text UNIQUE,              -- deduplicação: ignora re-entregas do Z-API
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_tenant_isolation" ON messages
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_lead         ON messages(lead_id, created_at);

-- -----------------------------------------------------------------------------
-- RPCs — funções auxiliares chamadas pelo backend
-- -----------------------------------------------------------------------------

-- Incrementa score do lead com cap de 5
CREATE OR REPLACE FUNCTION increment_lead_score(
  p_lead_id   uuid,
  p_tenant_id uuid,
  p_delta     int
) RETURNS void LANGUAGE sql AS $$
  UPDATE leads
  SET score = LEAST(5, score + p_delta)
  WHERE id = p_lead_id
    AND tenant_id = p_tenant_id;
$$;

-- Incrementa message_count de uma conversa
CREATE OR REPLACE FUNCTION increment_conversation_count(
  p_conversation_id uuid,
  p_count           int
) RETURNS void LANGUAGE sql AS $$
  UPDATE conversations
  SET message_count = message_count + p_count
  WHERE id = p_conversation_id;
$$;
