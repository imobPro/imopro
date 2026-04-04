# SKILL.md — criar-migration

## O que é esta skill

Esta skill cria migrations SQL para o Supabase (PostgreSQL) seguindo os padrões do ImobPro: multi-tenant obrigatório, RLS ativado na criação e nomenclatura kebab-case.

Use esta skill sempre que uma tabela nova precisar ser criada ou uma estrutura existente precisar ser alterada.

---

## Quando usar

- Ao criar um módulo novo que precisa de tabelas no banco
- Ao adicionar colunas a tabelas existentes
- Ao criar índices, triggers ou functions no banco
- Sempre em conjunto com a skill `criar-modulo` — módulo e migration andam juntos

---

## Regras obrigatórias — NUNCA violar

1. **Toda tabela deve ter `client_id UUID NOT NULL`** — sem exceção, sem atalhos
2. **RLS deve ser ativado na própria migration** — nunca deixar para depois
3. **Toda policy de RLS deve filtrar por `client_id`** — isolamento total entre tenants
4. **Nomear arquivos em kebab-case com timestamp** — ex: `2026-04-04-create-leads.sql`
5. **Toda migration deve ter um rollback** — seção `-- rollback` ao final do arquivo
6. **Nunca alterar migration já aplicada** — criar nova migration para correções

---

## Como executar

### Passo 1 — Identifique as tabelas necessárias

Com base no módulo sendo criado, liste:
- Quais tabelas serão criadas
- Quais colunas cada tabela terá
- Quais são os relacionamentos (foreign keys)
- Quais índices são necessários para as queries mais comuns

### Passo 2 — Nomeie o arquivo

Use o padrão: `YYYY-MM-DD-[acao]-[tabela].sql`

Exemplos:
- `2026-04-04-create-leads.sql`
- `2026-04-10-add-score-to-leads.sql`
- `2026-04-15-create-conversations.sql`

Salve em `docs/migrations/` ou na pasta de migrations do projeto.

### Passo 3 — Escreva a migration

Use o template abaixo como base:

```sql
-- migration: create-leads
-- created: 2026-04-04
-- module: leads
-- description: Cria tabela de leads com isolamento por tenant

-- ============================================================
-- UP
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL,                          -- tenant obrigatório
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  interest    TEXT CHECK (interest IN ('compra', 'aluguel', 'venda', 'informacao')),
  neighborhood TEXT,
  price_range TEXT,
  status      TEXT NOT NULL DEFAULT 'novo'
              CHECK (status IN ('novo', 'em_conversa', 'qualificado', 'transferido', 'perdido')),
  score       SMALLINT CHECK (score BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries frequentes
CREATE INDEX idx_leads_client_id ON leads (client_id);
CREATE INDEX idx_leads_status ON leads (client_id, status);
CREATE INDEX idx_leads_created_at ON leads (client_id, created_at DESC);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: cada tenant só vê seus próprios leads
CREATE POLICY "leads_tenant_isolation" ON leads
  FOR ALL
  USING (client_id = auth.uid()::uuid);

-- ============================================================
-- ROLLBACK
-- ============================================================

-- DROP TRIGGER IF EXISTS leads_updated_at ON leads;
-- DROP TABLE IF EXISTS leads;
```

### Passo 4 — Revise antes de aplicar

Antes de rodar a migration, confirme:
- Toda tabela tem `client_id NOT NULL`
- RLS está ativado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Existe pelo menos uma policy que filtra por `client_id`
- O rollback está comentado no final
- Os índices cobrem as colunas mais consultadas

### Passo 5 — Aplique a migration

No Supabase, aplique via:
- Dashboard → SQL Editor → cole e execute
- Ou via Supabase CLI: `supabase db push`

### Passo 6 — Verifique o resultado

Após aplicar, confirme no Supabase:
- A tabela aparece no Table Editor
- RLS está marcado como "enabled" na tabela
- As policies estão listadas corretamente
- Os índices foram criados

### Passo 7 — Registre no CHANGELOG.md

Registre a migration aplicada com data, tabela criada e motivo.

---

## Checklist de entrega

- [ ] Arquivo nomeado com data e ação em kebab-case
- [ ] Toda tabela tem `client_id UUID NOT NULL`
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` presente
- [ ] Policy de RLS filtrando por `client_id`
- [ ] Índices criados para `client_id` e colunas de filtro frequente
- [ ] Seção de rollback comentada no final
- [ ] Migration aplicada e verificada no Supabase
- [ ] CHANGELOG.md atualizado

---

## Exemplo de abertura

> "Vou criar a migration para o módulo de [nome]. As tabelas serão: [lista]. Antes de escrever o SQL, confirma: existe alguma regra de negócio específica sobre os dados que precisa virar constraint no banco?"
