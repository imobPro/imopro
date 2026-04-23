# Migrations

Aplique em ordem crescente no Supabase: **Dashboard → SQL Editor → colar cada arquivo → Run**.

| # | Arquivo | O que entrega |
|---|---|---|
| 001 | `001_initial_schema.sql` | Tipos, tabelas (`tenants`, `agents`, `leads`, `conversations`, `messages`), RLS inicial e RPCs |
| 002 | `002_add_sentiment.sql` | Colunas `sentiment` + `sentiment_updated_at` em `conversations` |
| 003 | `003_auth_and_assignment.sql` | `agents.user_id` + `agents.active` + RLS reescrito via `auth.uid()` |
| 004 | `004_leads_ownership_rls.sql` | RLS "próprios + sem dono" em leads/conversations/messages + REPLICA IDENTITY FULL |

## Criar primeiro usuário de teste (Sprint 6)

O cadastro self-service é Fase 3. Enquanto isso, crie contas manualmente:

### 1. Criar o usuário no Auth
Supabase Dashboard → **Authentication → Users → Add user**
- `Email` + `Password`
- Marcar `Auto Confirm User` para pular verificação de e-mail

Anote o `user_id` (UUID) que aparece.

### 2. Criar tenant e vincular agent
Rode no SQL Editor, substituindo os placeholders:

```sql
-- Novo tenant (imobiliária ou corretor individual)
INSERT INTO tenants (name, operation_mode)
VALUES ('Imobiliária Teste', 'individual')        -- ou 'shared'
RETURNING id;
-- anote o tenant_id retornado

-- Novo agent vinculado ao user e ao tenant
INSERT INTO agents (tenant_id, name, phone, user_id, active)
VALUES (
  '<tenant_id-do-passo-acima>',
  'Arthur CG',
  '+5521999999999',
  '<user_id-do-Auth>',
  true
);
```

### 3. Testar no painel
- `cd frontend && npm run dev` (após Etapa 3 do Sprint 6)
- Acessar `http://localhost:3000/login`, entrar com o e-mail/senha criado

## Criar segundo agent no mesmo tenant (testar visibilidade "próprios + sem dono")

Útil para validar a RLS da migration 004 em modo `shared`:

```sql
-- Repetir passo 1 (criar outro user em Auth)
-- Depois:
INSERT INTO agents (tenant_id, name, phone, user_id, active)
VALUES (
  '<mesmo tenant_id>',
  'Corretor B',
  '+5521888888888',
  '<user_id do novo user>',
  true
);

-- Atribuir alguns leads ao agent A (para ver que o agent B não os enxerga)
UPDATE leads
SET agent_id = '<agent_id do A>'
WHERE tenant_id = '<tenant_id>' AND <filtro dos leads que quer atribuir>;
```

Resultado esperado ao logar como B:
- Leads com `agent_id = A` → ocultos
- Leads com `agent_id IS NULL` → visíveis
- Leads com `agent_id = B` → visíveis
