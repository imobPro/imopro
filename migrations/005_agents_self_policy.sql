-- =============================================================================
-- ImobPro — Migration 005: Quebra dependência circular da RLS de agents
-- Rodar no Supabase: SQL Editor → cole e execute
-- =============================================================================
--
-- Contexto (Sprint 6):
-- A policy "agents_member_access" da migration 003 é `FOR ALL USING (tenant_id IN
-- (SELECT tenant_id FROM agents WHERE user_id = auth.uid() AND active = true))`.
-- Esse subquery aplica a si mesmo recursivamente — na primeira avaliação retorna
-- vazio, então a policy externa também retorna vazio. Resultado: o usuário
-- autenticado não consegue ver nem o próprio registro em `agents`, e o frontend
-- mostra "Conta sem imobiliária vinculada" mesmo com o vínculo correto no banco.
--
-- Fix: adicionar uma policy de SELECT que permite ao usuário ver o próprio
-- registro (user_id = auth.uid()). PostgreSQL combina múltiplas policies do
-- mesmo comando com OR — a policy self quebra a recursão, e a policy de team
-- passa a funcionar porque o subquery consegue ver o próprio agent.
--
-- Backend (service_role) bypassa RLS — sem impacto no worker.
-- =============================================================================

CREATE POLICY "agents_self_select" ON agents
  FOR SELECT
  USING (user_id = auth.uid());

-- As policies de INSERT/UPDATE/DELETE continuam restringidas pela policy
-- original "agents_member_access" (FOR ALL) — apenas SELECT ganhou o acesso
-- adicional ao próprio registro. Isso é o suficiente para o frontend read-only
-- do Sprint 6 e para as subqueries em leads/conversations/messages resolverem.
