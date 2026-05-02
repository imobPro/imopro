-- =============================================================================
-- ImobPro — Migration 009: Configurações do agente por tenant + visibilidade UI
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Sprint 8 (Configurações do agente). Esta migration:
--
-- 1. Adiciona em `tenants` os campos que hoje vivem em process.env (agent_name,
--    realty_name) ou hardcoded em código (horário comercial, mensagens), além
--    do toggle agent_active e da mensagem de boas-vindas (entra como contexto
--    no system prompt da IA, não enviada literal ao lead).
--
-- 2. Adiciona em `agents` o jsonb settings_visibility — preferência pessoal de
--    cada corretor sobre quais seções mostrar na tela /configuracoes. Ausência
--    de chave = visível; { chave: false } = oculta. Não vaza para outros agents
--    do mesmo tenant.
--
-- Decisões da entrevista:
-- - Toggle desligado: IA fica em silêncio, mensagem do lead salva pro corretor
-- - Fora do horário: mensagem automática + aguarda horário comercial
-- - Horário: hora abertura/fechamento, vale segunda a sexta (sábado/domingo
--   ficam fechados conforme DEFAULT_SCHEDULE atual de business-hours.ts)
-- - Boas-vindas: entra no system prompt como tom da imobiliária
-- - Token Z-API: adiado (cadastro via SQL no piloto)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. tenants — campos de configuração do agente
-- -----------------------------------------------------------------------------

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS agent_name             text     NOT NULL DEFAULT 'Assistente',
  ADD COLUMN IF NOT EXISTS realty_name            text     NOT NULL DEFAULT 'Imobiliária',
  ADD COLUMN IF NOT EXISTS welcome_message        text,
  ADD COLUMN IF NOT EXISTS business_hours_start   smallint NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS business_hours_end     smallint NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS out_of_hours_message   text,
  ADD COLUMN IF NOT EXISTS agent_active           boolean  NOT NULL DEFAULT true;

-- Constraints — ranges válidos. Adicionados como NOT VALID + VALIDATE para que
-- a migration rode mesmo se já houver dados (defaults garantem que valores
-- existentes ficam dentro do range).
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_business_hours_start_range,
  DROP CONSTRAINT IF EXISTS tenants_business_hours_end_range,
  DROP CONSTRAINT IF EXISTS tenants_business_hours_order;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_business_hours_start_range
    CHECK (business_hours_start >= 0 AND business_hours_start <= 23),
  ADD CONSTRAINT tenants_business_hours_end_range
    CHECK (business_hours_end >= 1 AND business_hours_end <= 24),
  ADD CONSTRAINT tenants_business_hours_order
    CHECK (business_hours_end > business_hours_start);

COMMENT ON COLUMN tenants.welcome_message IS
  'Tom/identidade da marca. Entra como contexto no system prompt — não enviada literal ao lead.';

COMMENT ON COLUMN tenants.out_of_hours_message IS
  'Mensagem enviada fora do horário comercial. NULL = template padrão (getNextBusinessDay).';

COMMENT ON COLUMN tenants.agent_active IS
  'Toggle do agente IA. false = IA não responde, mensagem do lead segue salva para o corretor.';

-- -----------------------------------------------------------------------------
-- 2. agents — preferência pessoal de visibilidade da tela /configuracoes
-- -----------------------------------------------------------------------------

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS settings_visibility jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN agents.settings_visibility IS
  'Preferência pessoal do agent: chaves identity|brand|welcome|hours|out_of_hours_msg|active_toggle|my_phone com booleano. Ausência = visível.';
