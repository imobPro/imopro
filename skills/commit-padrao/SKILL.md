# SKILL.md — commit-padrao

## O que é esta skill

Esta skill garante que todo commit no ImobPro segue as convenções do projeto: mensagem em português, imperativo, escopo claro e nenhum arquivo sensível incluído acidentalmente.

Use esta skill antes de cada commit — especialmente ao final de uma sessão de trabalho.

---

## Quando usar

- Ao finalizar a implementação de um módulo ou parte dele
- Ao corrigir um bug
- Ao atualizar documentação (CLAUDE.md, PRD.md, PLAN.md, CHANGELOG.md)
- Ao criar ou modificar uma skill
- Sempre que houver mudanças prontas para versionar

---

## Regras obrigatórias — NUNCA violar

1. **Mensagem em português, modo imperativo** — "Adiciona", não "Adicionado" ou "Adicionando"
2. **Nunca commitar `.env`** — apenas `.env.example` é permitido no repositório
3. **Nunca commitar credenciais, tokens ou API keys** — nem nos comentários
4. **Nunca usar `git add .` sem revisar o diff** — sempre inspecionar o que será incluído
5. **Um commit por unidade lógica de trabalho** — não agrupar mudanças não relacionadas
6. **Branch correta antes de commitar** — `feature/`, `fix/` ou `main` conforme o caso

---

## Convenções de mensagem

### Formato
```
[Tipo] [Descrição em imperativo]
```

### Tipos e exemplos

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `Adiciona` | Código novo, arquivo novo, feature nova | `Adiciona módulo de leads com CRUD básico` |
| `Atualiza` | Modifica algo existente sem ser bug | `Atualiza prompt de atendimento com regra de transferência` |
| `Corrige` | Bug fix | `Corrige vazamento de dados entre tenants na query de leads` |
| `Remove` | Deleta código ou arquivo | `Remove endpoint deprecated de autenticação` |
| `Refatora` | Muda estrutura sem mudar comportamento | `Refatora service de leads para separar validação` |
| `Documenta` | Atualiza docs, CLAUDE.md, comentários | `Documenta regras de RLS no CHANGELOG.md` |
| `Configura` | Setup de infra, CI, dependências | `Configura BullMQ com Redis para fila de mensagens` |
| `Testa` | Adiciona ou corrige testes | `Testa qualificação de lead com score inválido` |

### Exemplos completos

```
Adiciona módulo de leads com CRUD e isolamento por tenant
Corrige client_id faltando na query de busca de conversas
Atualiza skill iniciar-sprint com perguntas de sentimento
Configura migration da tabela leads com RLS ativo
Documenta integração Z-API no CHANGELOG.md
```

---

## Como executar

### Passo 1 — Verifique o status

```bash
git status
git diff --staged
```

Confirme o que está e o que não está staged.

### Passo 2 — Inspecione os arquivos modificados

Para cada arquivo que será incluído, verifique:
- Não contém credenciais ou tokens
- Não contém código de debug (`console.log` não intencional, `debugger`)
- É parte da mesma unidade lógica de trabalho do commit

### Passo 3 — Stage seletivo

Prefira adicionar arquivos individualmente:

```bash
# Correto — específico
git add src/modules/leads/leads.service.ts
git add src/modules/leads/leads.types.ts

# Evitar — pode incluir arquivos não intencionais
git add .
```

### Passo 4 — Escreva a mensagem de commit

Siga o formato: `[Tipo] [Descrição]`

```bash
git commit -m "Adiciona módulo de leads com CRUD e isolamento por tenant"
```

Para commits maiores, use corpo:

```bash
git commit -m "Adiciona módulo de leads com CRUD e isolamento por tenant

- Cria estrutura routes/controller/service/types
- Aplica client_id em todas as queries
- Testes unitários para criação e qualificação de lead"
```

### Passo 5 — Verifique após o commit

```bash
git log --oneline -5
```

Confirme que a mensagem está legível e descreve o que foi feito.

### Passo 6 — Atualize o CHANGELOG.md

Para mudanças significativas (novo módulo, nova feature, bug crítico), registre no CHANGELOG.md:

```markdown
## [2026-04-04] — Módulo de Leads

- Criado módulo `/leads` com CRUD completo
- Migration `2026-04-04-create-leads.sql` aplicada no Supabase
- RLS ativado e testado para isolamento multi-tenant
```

---

## Checklist pré-commit

- [ ] `git status` revisado — sei o que será incluído
- [ ] Nenhum `.env` ou arquivo de credenciais no staging
- [ ] Nenhum `console.log` de debug não intencional
- [ ] Mensagem em português, imperativo, clara
- [ ] Arquivos staged individualmente (sem `git add .` cego)
- [ ] Branch correta (`feature/`, `fix/`, ou `main`)
- [ ] CHANGELOG.md atualizado para mudanças significativas

---

## Sinais de alerta — revisar antes de prosseguir

Se qualquer item abaixo aparecer no diff, **pare e investigue** antes de commitar:

- `API_KEY`, `SECRET`, `TOKEN`, `PASSWORD` em qualquer valor
- Arquivo `.env` (sem `.example`)
- Arquivo com dados de clientes reais (nomes, telefones, e-mails)
- `console.log` com conteúdo de conversa ou dado pessoal

---

## Exemplo de abertura

> "Vou preparar o commit desta sessão. Deixa eu verificar o diff antes de montar a mensagem."
