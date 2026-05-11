-- =============================================================================
-- ImobPro — Migration 012: Trial clock alinhado ao provisionamento (fix-up da 011)
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Contexto: a migration 011 evoluiu durante o Sprint 9.2 — o relógio do trial
-- (7 dias) passa a contar a partir da CONEXÃO do WhatsApp, não do cadastro.
-- Como a 011 cria a tabela com `CREATE TABLE IF NOT EXISTS`, quem rodou uma
-- versão anterior dela ficou com `trial_started_at`/`trial_ends_at` NOT NULL e o
-- trigger antigo (que setava `now() + 7d`). Esta migration corrige o estado
-- final de forma idempotente — rodar de novo (ou depois de uma 011 já corrigida)
-- não causa efeito nenhum.
-- =============================================================================

-- 1. trial_started_at / trial_ends_at nullable. NULL = trial ainda não começou
--    (WhatsApp não conectado). Preenchidas por billing.startTrialClock quando a
--    instância Z-API conecta (webhook /webhook/zapi-status).
ALTER TABLE subscriptions ALTER COLUMN trial_started_at DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN trial_started_at DROP DEFAULT;
ALTER TABLE subscriptions ALTER COLUMN trial_ends_at DROP NOT NULL;

COMMENT ON COLUMN subscriptions.trial_started_at IS
  'NULL enquanto o trial não começou (WhatsApp não conectado). Preenchido por billing.startTrialClock quando a instância Z-API conecta.';
COMMENT ON COLUMN subscriptions.trial_ends_at IS
  'NULL até o WhatsApp conectar; então trial_started_at + TRIAL_DAYS. O cron expire-trials (.lt em trial_ends_at) ignora naturalmente as linhas com data NULL.';

-- 2. Trigger AFTER INSERT em tenants — cria a subscription 'trial' SEM datas.
--    CREATE OR REPLACE atualiza só o corpo da função; o trigger
--    `tenants_create_subscription` continua apontando para ela.
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO subscriptions (tenant_id, status)
  VALUES (NEW.id, 'trial')
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;
