-- =============================================================================
-- ImobPro — Migration 007: Marca quando o tenant viu por último a conversa
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Contexto:
-- Sprint 6 entrega a tela de conversa do lead em /inbox/[leadId]. Ao abrir,
-- o painel marca a conversa como "vista" gravando o timestamp atual em
-- leads.last_viewed_at. Combinado com leads.last_message_at, isso vai permitir
-- destacar leads "não lidos" no card da Lista de Leads em uma evolução futura.
--
-- Limitação consciente:
-- last_viewed_at é per-tenant, não per-agent. No modo individual (1 corretor)
-- isso é suficiente. No modo shared (vários corretores no mesmo tenant) cada
-- corretor verá o mesmo "último visto" — o que pode ser confuso. Quando isso
-- virar problema real, evoluir para tabela lead_views(lead_id, agent_id,
-- viewed_at) com PK composta. Não precisa fazer agora.
--
-- RLS: a policy leads_owner_or_unassigned (migration 006) já cobre UPDATE
-- desta nova coluna — não há policy nova nesta migration.
-- =============================================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

COMMENT ON COLUMN leads.last_viewed_at IS
  'Quando o tenant abriu a conversa por último no painel. Per-tenant — evolui para per-agent quando o modo shared exigir.';
