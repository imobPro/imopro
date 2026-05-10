-- =============================================================================
-- ImobPro — Migration 011: Subscriptions + provisionamento Z-API
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Sprint Fase 3 (9.1 — schema + billing + worker). Esta migration:
--
-- 1. Adiciona em `tenants` os campos de provisionamento da instância Z-API:
--    quem é dono da conta (managed=true → ImobPro provisiona via API),
--    instance_id/token devolvidos pela Z-API após criação, status (lifecycle
--    da conexão WhatsApp) e timestamp de aceite LGPD no cadastro.
--
-- 2. Cria a tabela `subscriptions` (1:1 com tenant) com lifecycle do trial
--    e da assinatura: trial → expired/active → canceled. Trial: 7 dias OU 50
--    mensagens da IA (cap definido em entrevista).
--
-- 3. RPC `increment_trial_message_count` — atomic increment do contador,
--    chamado pelo worker após cada resposta da IA. Retorna a contagem nova
--    para o caller decidir se atingiu cap.
--
-- 4. Trigger AFTER INSERT em tenants — cria subscription com status='trial' e
--    trial_ends_at=now()+7d automaticamente. Garante que nenhum tenant fica
--    sem subscription, mesmo se cadastrado via SQL.
--
-- 5. Backfill: tenants existentes (testes do Arthur) ganham subscription
--    `active` com plan_id='legacy', para não serem cortados pelo gate do
--    trial. Onboarding self-service (Sprint 9.2) cria como 'trial'.
--
-- Decisões tomadas na entrevista (2026-05-10):
-- - Trial 7 dias OU 50 msgs (o que vier primeiro)
-- - Pós-trial: IA desliga, painel acessível, `saveIncomingMessagesOnly`
-- - Plano único no MVP — `plan_id` é text simples, gateway stub
-- - ImobPro provisiona Z-API automaticamente (managed=true por default)
-- - E-mail confirmado antes de provisionar (gate na API, não no banco)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. tenants — campos de provisionamento Z-API + LGPD
-- -----------------------------------------------------------------------------

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS zapi_account_managed boolean      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS zapi_instance_id     text,
  ADD COLUMN IF NOT EXISTS zapi_instance_token  text,
  ADD COLUMN IF NOT EXISTS zapi_status          text         NOT NULL DEFAULT 'not_provisioned',
  ADD COLUMN IF NOT EXISTS zapi_connected_at    timestamptz,
  ADD COLUMN IF NOT EXISTS lgpd_accepted_at     timestamptz;

ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_zapi_status_values;
ALTER TABLE tenants
  ADD CONSTRAINT tenants_zapi_status_values
    CHECK (zapi_status IN ('not_provisioned', 'awaiting_qr', 'connected', 'disconnected'));

COMMENT ON COLUMN tenants.zapi_account_managed IS
  'true = ImobPro provisionou e gerencia a instância Z-API. false = cliente trouxe a própria (BYO, fora do escopo do MVP).';

COMMENT ON COLUMN tenants.zapi_instance_id IS
  'ID da instância Z-API criada para este tenant. NULL antes do provisionamento.';

COMMENT ON COLUMN tenants.zapi_instance_token IS
  'Token de instância Z-API (não confundir com ZAPI_ACCOUNT_TOKEN da conta-mãe). Usado para chamadas autenticadas para essa instância específica.';

COMMENT ON COLUMN tenants.zapi_status IS
  'Lifecycle da conexão WhatsApp: not_provisioned → awaiting_qr → connected → disconnected.';

COMMENT ON COLUMN tenants.lgpd_accepted_at IS
  'Timestamp do aceite explícito de docs/privacidade.md, docs/termos.md e docs/dpa.md durante o cadastro. NULL para tenants legados (pré-Fase 3).';

-- -----------------------------------------------------------------------------
-- 2. subscriptions — 1:1 com tenant
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscriptions (
  tenant_id           uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  status              text         NOT NULL DEFAULT 'trial',
  trial_started_at    timestamptz  NOT NULL DEFAULT now(),
  trial_ends_at       timestamptz  NOT NULL,
  trial_message_count integer      NOT NULL DEFAULT 0,
  plan_id             text,
  subscribed_at       timestamptz,
  canceled_at         timestamptz,
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_values;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_values
    CHECK (status IN ('trial', 'expired', 'active', 'canceled'));

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_message_count_nonneg;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_message_count_nonneg
    CHECK (trial_message_count >= 0);

-- Index para o cron de expiração: encontra trials vencidos em O(log n)
CREATE INDEX IF NOT EXISTS subscriptions_trial_ends_idx
  ON subscriptions (trial_ends_at)
  WHERE status = 'trial';

COMMENT ON TABLE subscriptions IS
  'Assinatura/trial por tenant. Lifecycle: trial → expired (cap atingido ou prazo vencido) → active (assinou) → canceled.';

COMMENT ON COLUMN subscriptions.trial_message_count IS
  'Mensagens da IA respondidas durante o trial. Incrementado via RPC increment_trial_message_count após cada resposta. Cap: 50 (TRIAL_MESSAGE_LIMIT).';

COMMENT ON COLUMN subscriptions.plan_id IS
  'Identificador do plano. NULL durante trial. "legacy" para tenants pré-Fase 3 backfilled. Outros valores virão quando gateway real entrar.';

-- -----------------------------------------------------------------------------
-- 3. RPC: increment_trial_message_count
-- -----------------------------------------------------------------------------
--
-- Atomic increment chamado pelo worker. SECURITY DEFINER porque o backend usa
-- service-role (bypassa RLS) mas mantemos isolamento via filtro explícito de
-- tenant_id no UPDATE. Retorna NULL se a subscription não está em trial — o
-- caller usa esse sinal para pular o increment silenciosamente (active/canceled
-- não contam mensagens).

CREATE OR REPLACE FUNCTION public.increment_trial_message_count(
  p_tenant_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE subscriptions
     SET trial_message_count = trial_message_count + 1,
         updated_at = now()
   WHERE tenant_id = p_tenant_id
     AND status = 'trial'
   RETURNING trial_message_count INTO new_count;

  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_trial_message_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_trial_message_count(uuid) TO authenticated;

COMMENT ON FUNCTION public.increment_trial_message_count IS
  'Incrementa atomicamente trial_message_count. Retorna nova contagem; NULL se subscription não está em status=trial (caller deve ignorar).';

-- -----------------------------------------------------------------------------
-- 4. RLS em subscriptions — mesmo padrão das demais tabelas
-- -----------------------------------------------------------------------------

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_member_access" ON subscriptions;
CREATE POLICY "subscriptions_member_access" ON subscriptions
  FOR ALL
  USING (tenant_id IN (SELECT public.auth_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.auth_tenant_ids()));

-- -----------------------------------------------------------------------------
-- 5. Trigger updated_at em subscriptions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.subscriptions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.subscriptions_set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Trigger: cria subscription automaticamente ao criar tenant
-- -----------------------------------------------------------------------------
--
-- Garante invariante "todo tenant tem subscription". Aplicado tanto no
-- onboarding self-service (Sprint 9.2) quanto em tenants criados via SQL.
-- ON CONFLICT DO NOTHING para o backfill abaixo não falhar.

CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO subscriptions (tenant_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'trial', now(), now() + interval '7 days')
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_create_subscription ON tenants;
CREATE TRIGGER tenants_create_subscription
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_subscription();

-- -----------------------------------------------------------------------------
-- 7. Backfill — tenants existentes ganham subscription 'active' legacy
-- -----------------------------------------------------------------------------
--
-- Sem isso, todos os tenants pré-Fase 3 (testes do Arthur, piloto manual) seriam
-- tratados como trial vencido (trial_ends_at no passado). Marcamos como active
-- com plan_id='legacy' para distinção futura.

INSERT INTO subscriptions (
  tenant_id, status, trial_started_at, trial_ends_at, plan_id, subscribed_at
)
SELECT
  id,
  'active',
  COALESCE(created_at, now()),
  COALESCE(created_at, now()) + interval '7 days',
  'legacy',
  COALESCE(created_at, now())
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
