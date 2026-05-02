-- =============================================================================
-- ImobPro — Migration 008: Tabela de relatórios + status 'inativo' + bucket Storage
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Sprint 7 (Relatórios automáticos). Esta migration:
--
-- 1. Adiciona o valor 'inativo' à enum lead_status. Decisão da entrevista:
--    leads sem mensagem há 7 dias passam direto para status 'inativo'
--    (sem alerta, sem reengajamento). A coluna leads.inactive_flagged_at
--    continua sendo populada para auditoria de "quando virou inativo".
--
-- 2. Cria tabela `reports` que registra cada relatório (mensal/semanal) gerado
--    para um agent. Guarda o caminho do PDF no Storage e a data de envio.
--
-- 3. Cria bucket privado `reports` no Supabase Storage. Policies usam o path
--    do arquivo (`{tenant_id}/{agent_id}/{filename}`) para fazer RLS:
--    - Backend (service-role) faz upload e leitura sem restrição.
--    - Frontend NÃO acessa o bucket diretamente — sempre via backend
--      (rota /api/reports/:id/download), que valida ownership e devolve
--      o binário. Por isso a policy de SELECT é restritiva (somente
--      service-role consegue ler de fato).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Novo valor 'inativo' na enum lead_status
-- -----------------------------------------------------------------------------
--
-- ATENÇÃO: ALTER TYPE ... ADD VALUE não pode rodar dentro de transação
-- (limitação do PostgreSQL). No SQL Editor do Supabase, rode este bloco
-- isoladamente antes do resto da migration (selecione e execute só esta linha).
-- -----------------------------------------------------------------------------

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'inativo';

-- -----------------------------------------------------------------------------
-- 1.1 Marcadores temporais de mudança de status — base para métricas de tempo
-- -----------------------------------------------------------------------------
--
-- Sem esses campos é impossível calcular "tempo médio até qualificação" ou
-- "tempo médio até fechamento" no relatório. Backend popula automaticamente
-- em updateLeadStatus quando o lead transita para esses status pela primeira vez.
-- Leads anteriores à migration vão ter NULL — relatório mostra "—" nesse caso.
-- -----------------------------------------------------------------------------

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at    timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_qualified_at ON leads(tenant_id, qualified_at)
  WHERE qualified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_closed_at ON leads(tenant_id, closed_at)
  WHERE closed_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Tabela reports — um registro por relatório gerado
-- -----------------------------------------------------------------------------

CREATE TYPE report_period AS ENUM ('weekly', 'monthly');

CREATE TABLE reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  period_type   report_period NOT NULL,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  file_path     text NOT NULL,                -- {tenant_id}/{agent_id}/{period_type}-{period_end}.pdf
  sent_at       timestamptz,                  -- preenchido após envio do e-mail
  error         text,                         -- preenchido se geração ou envio falhou

  -- Evita gerar o mesmo relatório duas vezes (mesmo agent + período)
  UNIQUE (agent_id, period_type, period_end)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Frontend só lê os relatórios do agent logado (não vê de outros corretores
-- mesmo dentro do mesmo tenant). Usa a helper SECURITY DEFINER da migration 006.
CREATE POLICY "reports_owner_only" ON reports
  FOR SELECT
  USING (agent_id IN (SELECT public.auth_agent_ids()));

CREATE INDEX idx_reports_agent_period ON reports(agent_id, period_type, period_end DESC);
CREATE INDEX idx_reports_tenant       ON reports(tenant_id, generated_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Bucket Storage `reports` (privado)
-- -----------------------------------------------------------------------------
--
-- IMPORTANTE: a criação de bucket via SQL exige permissão de service-role.
-- Se o SQL Editor reclamar, criar manualmente em Storage → New bucket:
--   nome: reports
--   public: false
--   file size limit: 10MB
--   allowed mime types: application/pdf
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket: como o frontend baixa via backend, restringimos SELECT
-- ao service-role (default — sem policy permissiva para `authenticated`).
-- O service-role bypassa RLS, então o backend continua funcionando.

-- Nota: storage.objects já tem RLS ativado por padrão no Supabase. Nenhuma
-- policy adicional é necessária — sem policy permissiva = ninguém com role
-- `authenticated` ou `anon` consegue ler/escrever, exatamente o desejado.
