# CLAUDE.md — ImobBot SaaS

Arquivo de contexto central. Leia este arquivo antes de qualquer ação no projeto.

---

## O que é este projeto

SaaS B2B de atendimento via WhatsApp com IA para imobiliárias brasileiras.
O produto conduz atendimento humanizado 24/7, qualifica leads, cataloga sentimento das conversas, organiza o CRM e gera relatórios automáticos para o corretor.

Framework de negócio: **Sistema PAEA** (Prospectar, Abordar, Entregar, Automatizar).
Dono do projeto: Arthur CG — Niterói, Rio de Janeiro, Brasil.

---

## Stack técnica

| Camada | Tecnologia | Observação |
|---|---|---|
| Mensagens | Z-API | Uma instância por cliente (tenant) |
| Orquestração | N8N Cloud | Automações secundárias e webhooks |
| IA | Claude API — Sonnet por padrão | Ver seção de modelos abaixo |
| Banco | Supabase (PostgreSQL + RLS) | Multi-tenant obrigatório |
| Backend | Node.js + Express | Lógica central e API |
| Fila | BullMQ + Redis | Processamento assíncrono de mensagens |
| Frontend | Next.js | Painel do cliente |
| Infra | Railway (backend) + Vercel (frontend) | |
| Pagamentos | Stripe ou Asaas | Cobrança recorrente |
| Versionamento | Git + GitHub | Obrigatório desde o dia 1 |

---

## Estratégia de modelos

Nunca use Opus para tarefas simples. Nunca use Haiku para decisões críticas.

| Modelo | Quando usar |
|---|---|
| **Haiku** | Migrations simples, boilerplate, templates repetitivos, tarefas pontuais e rápidas |
| **Sonnet** | Desenvolvimento do dia a dia — módulos, código, análise de arquivos, review (padrão) |
| **Opus** | Arquitetura do sistema, bugs críticos, orquestração de agentes, decisões complexas |

---

## Regras de arquitetura — NUNCA violar

1. **Toda query no banco DEVE ter `client_id`** — sem exceção. Isso garante isolamento de dados entre tenants.
2. **Nunca misturar lógica de negócio com controllers** — controllers só recebem request e chamam services.
3. **Cada módulo é independente** — `/leads`, `/conversations`, `/reports`, `/tenants` não se importam diretamente.
4. **Variáveis de ambiente para toda credencial** — nunca hardcodar API keys, tokens ou senhas.
5. **Testes obrigatórios para funções críticas de negócio** — qualificação de lead, sentimento, relatório.
6. **RLS ativado em todas as tabelas do Supabase** — configurar na criação, não depois.

---

## Estrutura de pastas

```
/imobbot-saas
  CLAUDE.md           ← este arquivo
  PRD.md              ← requisitos do produto
  PLAN.md             ← roadmap de fases
  CHANGELOG.md        ← registro de sessões
  .gitignore
  .env.example
  /skills/
    /criar-modulo/
    /criar-migration/
    /integrar-zapi/
    /prompt-claude-api/
    /gerar-relatorio/
    /commit-padrao/
  /src/
    /modules/
      /whatsapp/      ← gateway Z-API
      /ai-engine/     ← integração Claude API
      /leads/         ← CRM e qualificação
      /sentiment/     ← análise de sentimento
      /reports/       ← geração de relatórios
      /tenants/       ← gestão de imobiliárias
      /auth/          ← JWT e onboarding
    /shared/
      /database/      ← cliente Supabase e migrations
      /queue/         ← workers BullMQ
      /utils/
  /frontend/          ← Next.js — painel do cliente
  /docs/              ← specs técnicas de cada módulo
```

---

## Disciplina de sessão — contexto

A janela de contexto enche e o desempenho cai. Siga sempre:

- **`/compact`** — ao final de cada sessão de trabalho
- **`/clear`** — ao trocar de módulo completamente
- **`/context`** — para verificar o uso atual do contexto
- **Plan mode (Shift+Tab)** — sempre ao iniciar módulo novo ou tarefa complexa
- **Auto accept** — somente após revisar e aprovar o plano

---

## Convenções de código

- Linguagem: TypeScript (strict mode)
- Nomeclatura: camelCase para variáveis e funções, PascalCase para classes e tipos
- Arquivos: kebab-case (`lead-service.ts`, `create-migration.sql`)
- Commits: mensagem em português, imperativo — "Adiciona módulo de leads"
- Branches: `feature/nome-da-feature`, `fix/nome-do-bug`
- Sempre tipar retornos de funções — nunca usar `any`

---

## Contexto de negócio

- Mercado-alvo: imobiliárias pequenas e médias no Brasil
- Problema central: leads chegam fora do horário, corretores perdem vendas
- Diferencial: IA em português, LGPD nativa, preço acessível vs concorrentes internacionais
- Concorrentes: Kommo, Respond.io, Wati (todos em dólar, sem português nativo)
- Precificação planejada: R$297–R$597/mês dependendo do plano
- Fase atual: ver PLAN.md
