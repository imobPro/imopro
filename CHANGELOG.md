# CHANGELOG.md — Registro de Sessões

ImobBot SaaS · Sistema PAEA · Arthur CG · 2026

Registre aqui o que foi feito em cada sessão de trabalho com o Claude Code.
Isso evita retrabalho, mantém o contexto entre sessões e serve como histórico do projeto.

---

## Como usar este arquivo

Ao final de cada sessão de trabalho, adicione uma entrada seguindo o formato abaixo.
Peça ao Claude Code: *"Registre no CHANGELOG o que foi feito nessa sessão."*

```
## [DATA] — Título da sessão

**Fase:** Fase X — Nome da fase
**Duração:** Xh

### O que foi feito
- Item 1
- Item 2

### Arquivos criados ou modificados
- `caminho/do/arquivo.ts` — descrição
- `caminho/do/outro.sql` — descrição

### Decisões tomadas
- Decisão 1 e o motivo
- Decisão 2 e o motivo

### Pendências para próxima sessão
- [ ] O que ainda precisa ser feito
```

---

## [2026-04-03] — Planejamento inicial do projeto

**Fase:** Fase 0 — Setup
**Duração:** planejamento

### O que foi feito
- Definição completa da arquitetura do SaaS
- Criação do CLAUDE.md com stack, regras e disciplina de sessão
- Criação do PRD.md com personas, módulos e critérios de sucesso
- Criação do PLAN.md com roadmap completo em 4 fases e sprints
- Criação deste CHANGELOG.md

### Arquivos criados
- `CLAUDE.md` — contexto central do projeto
- `PRD.md` — requisitos do produto
- `PLAN.md` — roadmap de fases
- `CHANGELOG.md` — este arquivo

### Decisões tomadas
- Stack escolhida: Node.js + Express + Supabase + Z-API + Claude API + Next.js
- Multi-tenant via `client_id` em todas as tabelas com RLS no Supabase
- Modelo padrão: Sonnet para dia a dia, Opus para arquitetura, Haiku para tarefas simples
- Versionamento com Git obrigatório desde o primeiro commit
- IDE recomendada: Cursor (Claude Code integrado + visão de arquivos)
- Skills a criar: criar-modulo, criar-migration, integrar-zapi, prompt-claude-api, gerar-relatorio, commit-padrao
- Framework de negócio: Sistema PAEA

### Pendências para próxima sessão
- [ ] Criar repositório no GitHub
- [ ] Criar estrutura de pastas do projeto
- [ ] Configurar .gitignore e .env.example
- [ ] Instalar Node.js, TypeScript e dependências base
- [ ] Criar primeira skill: `/skills/criar-modulo/`

---

## [2026-04-05] — Setup do projeto e estrutura base

**Fase:** Fase 0 — Setup
**Duração:** configuração inicial

### O que foi feito
- Criada estrutura completa de pastas do projeto (`/src`, `/skills`, `/frontend`, `/docs`)
- Configurado `.gitignore` e `.env.example`
- Criadas todas as skills iniciais com SKILL.md completo: `iniciar-sprint`, `criar-modulo`, `criar-migration`, `integrar-zapi`, `prompt-claude-api`, `gerar-relatorio`, `commit-padrao`, `seguranca`, `melhorar-skills`
- Criado `lessons.md` para registro de erros e correções
- Configurado `.claude/settings.local.json` com permissões automáticas de git
- Corrigido bug de sintaxe nas permissões do `settings.local.json`

### Arquivos criados ou modificados
- `skills/*/SKILL.md` — todas as skills com instruções completas
- `skills/seguranca/SKILL.md` — skill de segurança com 6 camadas e checklist pré-deploy
- `lessons.md` — registro de lições aprendidas (estrutura criada, sem lições reais ainda)
- `.claude/settings.local.json` — permissões automáticas para git add, commit, status, diff, log
- `PLAN.md` — atualizado com status real da Fase 0

### Decisões tomadas
- Permissões automáticas apenas para comandos git de leitura e commit — comandos destrutivos exigem aprovação manual
- Skill de segurança cobre LGPD explicitamente — obrigação legal para dados de leads brasileiros

### Pendências para próxima sessão
- [ ] Rodar skill `iniciar-sprint` antes de começar o Sprint 1
- [ ] Instalar dependências base (Node.js, TypeScript, Express)
- [ ] Configurar Supabase — projeto e credenciais
- [ ] Iniciar Sprint 1 — Módulo WhatsApp

---

## [2026-04-08] — Configuração de comandos e regras de comunicação

**Fase:** Fase 0 — Setup
**Duração:** configuração

### O que foi feito
- Criados slash commands `/commit-sprint` e `/revisar-modulo` para padronizar o fluxo de trabalho
- Configurado `settings.json` com permissões seguras do Claude Code (allow/deny explícitos)
- Criada skill de comunicação que define como o Claude deve explicar ações ao Arthur em linguagem simples

### Arquivos criados
- `.claude/commands/commit-sprint.md` — comando para fechar sprints com checklist completo
- `.claude/commands/revisar-modulo.md` — comando com feedback loop automático de revisão
- `.claude/settings.json` — permissões do Claude Code com comandos seguros autorizados
- `skills/comunicacao/SKILL.md` — regra de comunicação para linguagem acessível durante o trabalho

### Decisões tomadas
- Slash commands versionados no repositório para garantir consistência entre sessões
- Permissões explícitas no settings.json — nenhum comando destrutivo autorizado automaticamente
- Regra de comunicação criada como skill para que esteja sempre acessível como referência

### Pendências para próxima sessão
- [ ] Rodar skill `iniciar-sprint` antes de começar o Sprint 1
- [ ] Instalar dependências base (Node.js, TypeScript, Express)
- [ ] Configurar Supabase — projeto e credenciais

---

## [2026-04-11] — Instalação de dependências base e configuração TypeScript

**Fase:** Fase 0 — Setup
**Duração:** configuração

### O que foi feito
- Inicializado `package.json` com `npm init`
- Instaladas dependências de produção: `express`, `helmet`, `express-rate-limit`, `zod`, `bcryptjs`, `jsonwebtoken`, `cors`
- Instaladas dependências de desenvolvimento: `typescript`, `ts-node`, `tsx` e todos os `@types/*`
- Configurado `tsconfig.json` com TypeScript strict mode completo
- Criado `src/index.ts` com servidor Express já com helmet, cors e rate limiting aplicados
- Confirmado: TypeScript compila sem erros, servidor sobe na porta 3000

### Arquivos criados ou modificados
- `package.json` — scripts `dev`, `build`, `start` adicionados
- `tsconfig.json` — strict mode, rootDir `src/`, outDir `dist/`
- `src/index.ts` — servidor Express com camadas de segurança base

### Decisões tomadas
- `tsx watch` para desenvolvimento (mais rápido que `ts-node-dev`)
- Rate limit geral de 100 req/min aplicado globalmente no servidor
- CORS configurado via variável `APP_URL` — nunca hardcodado

### Pendências para próxima sessão
- [ ] Rodar skill `iniciar-sprint` antes do Sprint 1 — Módulo WhatsApp
- [ ] Configurar Supabase — projeto e credenciais

## [2026-04-12] — Sprint 1: Módulo WhatsApp

**Fase:** Fase 1 — Backend central + atendimento WhatsApp
**Duração:** 1 sessão

### O que foi feito
- Conduzida entrevista de negócio (skill `iniciar-sprint`) com 5 perguntas sobre o módulo WhatsApp
- Definidos 6 gatilhos de transferência para corretor humano
- Definido SLA de não-resposta: 15 min aviso automático, 1h alerta gestor + IA retoma
- Definidos 6 perfis de lead: Comprador, Inquilino, Vendedor, Captação, Investidor, Indicador
- Definido score de qualificação 1–5 com notificação imediata para score 4–5
- Instaladas dependências: `bullmq`, `ioredis`, `dotenv`
- Criada infraestrutura de fila: Redis singleton, BullMQ queue com retry exponencial
- Criado utilitário de horário comercial configurável por tenant (fuso America/Sao_Paulo)
- Criado módulo whatsapp completo: types, service, controller, routes, worker, index
- Webhook seguro com validação de `client-token` (header Z-API)
- Worker BullMQ com concorrência 5 e os 6 gatilhos de transferência implementados
- Mensagem automática de fora de horário via Z-API
- Servidor atualizado com `dotenv/config` e montagem do módulo em `/webhook`

### Arquivos criados ou modificados
- `src/shared/queue/queue.types.ts` — interface WhatsAppMessageJob
- `src/shared/queue/redis.ts` — singleton ioredis
- `src/shared/queue/queues.ts` — BullMQ queue com retry exponencial
- `src/shared/utils/business-hours.ts` — utilitário de horário comercial
- `src/modules/whatsapp/whatsapp.types.ts` — tipos Z-API, LeadProfile, TransferReason
- `src/modules/whatsapp/whatsapp.service.ts` — enqueueMessage, detectLeadProfile, shouldTransferToHuman, buildZApiClient
- `src/modules/whatsapp/whatsapp.controller.ts` — receiveWebhook com validação de token
- `src/modules/whatsapp/whatsapp.routes.ts` — POST /webhook/whatsapp, GET /webhook/health
- `src/modules/whatsapp/whatsapp.worker.ts` — worker com lógica de negócio e stubs para Sprint 2/3
- `src/modules/whatsapp/index.ts` — exports do módulo
- `src/index.ts` — dotenv/config + montagem do router + init do worker

### Decisões tomadas
- `ioredis` como cliente Redis (mais estável que `redis` npm para BullMQ)
- Servidor não crasha com Redis indisponível — ioredis reconecta em background
- `ZAPI_CLIENT_TOKEN` obrigatório — sem token configurado, 100% dos requests são rejeitados
- `fromMe: true` e eventos de status são ignorados silenciosamente (200 sem enfileirar)
- Worker retorna 200 mesmo em erro de enfileiramento (evita retentativas duplicadas do Z-API)
- Stubs explícitos com `// TODO Sprint 2/3` para IA e persistência no banco

### Pendências para próxima sessão
- [ ] Rodar skill `iniciar-sprint` antes do Sprint 2 — Motor de IA
- [ ] Configurar `ZAPI_CLIENT_TOKEN` no .env para testes com Z-API real
- [ ] Configurar Redis (Railway ou Upstash) para ambiente de desenvolvimento

## [2026-04-18] — Sprint 2: Motor de IA

**Fase:** Fase 1 — Backend central + atendimento WhatsApp
**Duração:** 1 sessão

### O que foi feito
- Conduzida entrevista de negócio (skill `iniciar-sprint`) com 5 perguntas sobre o motor de IA
- Adicionada seção "Tom do agente de IA" no CLAUDE.md com regras de identidade e comunicação
- Instalado `@anthropic-ai/sdk` como dependência de produção
- Criado módulo `/src/modules/ai-engine/` com 4 arquivos
- Implementado debounce de 8s para agrupar mensagens rápidas do mesmo lead
- Implementado histórico de conversa em memória com sliding window de 20 mensagens
- Implementado timer de handoff: IA continua por 15min, depois re-notifica corretor
- Worker reescrito com fluxo completo de IA integrado
- Mensagem de horário comercial corrigida (sem emoji, conforme regras de tom)

### Arquivos criados
- `src/modules/ai-engine/ai-engine.types.ts` — AgentConfig, ConversationMessage, AIResponse, IntentType, PendingMessage
- `src/modules/ai-engine/ai-engine.prompts.ts` — buildSystemPrompt() com regras de tom e persona
- `src/modules/ai-engine/ai-engine.service.ts` — generateResponse(), transcribeAudio() stub, histórico
- `src/modules/ai-engine/index.ts` — exports do módulo

### Arquivos modificados
- `src/modules/whatsapp/whatsapp.service.ts` — debounce com Redis RPUSH + job deduplicado, popPendingMessages()
- `src/modules/whatsapp/whatsapp.worker.ts` — TODOs Sprint 2 substituídos por chamadas reais ao ai-engine
- `CLAUDE.md` — seção "Tom do agente de IA" adicionada
- `.env.example` — variáveis AGENT_NAME e REALTY_NAME adicionadas

### Decisões tomadas
- Identidade do agente: configurável por tenant via AGENT_NAME/REALTY_NAME (Sprint 5 moverá para banco)
- Debounce: Redis RPUSH + BullMQ jobId fixo — sem job duplicado, mensagens acumuladas na lista
- Transcrição de áudio: stub (retorna null → mensagem neutra) — Claude API não suporta áudio nativo; requer Whisper/AssemblyAI no futuro
- Handoff timer: flag Redis + job BullMQ delayed com 15min de prazo
- Histórico: Map em memória com max 20 msgs (Sprint 3 persistirá no Supabase)

### Pendências para próxima sessão
- [ ] Rodar skill `iniciar-sprint` antes do Sprint 3 — CRM de leads
- [ ] Configurar ANTHROPIC_API_KEY no .env para testes reais
- [ ] Configurar ZAPI_TOKEN para testes com WhatsApp real
- [ ] Avaliar integração Whisper para transcrição de áudio

## [2026-04-18] — Sprint 3: CRM de leads

**Fase:** Fase 1 — Backend central + atendimento WhatsApp
**Duração:** 1 sessão

### O que foi feito
- Conduzida entrevista de negócio (skill `iniciar-sprint`) com 5 perguntas sobre o CRM
- Criada migration SQL completa com schema de 5 tabelas e RLS em todas elas
- Criado client Supabase singleton com service_role key
- Criado módulo `leads` com tipos, serviço completo e exports
- Integrado no worker: lead criado/atualizado, score incrementado, mensagens salvas após cada atendimento
- Falha de persistência isolada — não derruba o atendimento

### Arquivos criados
- `migrations/001_initial_schema.sql` — DDL completo: enums, tenants, agents, leads, conversations, messages + RLS + índices
- `src/shared/database/supabase.ts` — singleton Supabase com service_role key
- `src/modules/leads/leads.types.ts` — Lead, LeadStatus, UpsertLeadParams, IncomingMessage
- `src/modules/leads/leads.service.ts` — upsertLead, updateLeadStatus, scoreUp, saveConversationMessages, flagInactiveLeads, calcScoreDelta
- `src/modules/leads/index.ts` — exports do módulo

### Arquivos modificados
- `src/modules/whatsapp/whatsapp.worker.ts` — TODOs Sprint 3 substituídos por chamadas reais ao leads.service
- `PLAN.md` — Sprint 3 marcado como concluído

### Decisões tomadas
- `tenant_id` como chave de isolamento RLS em todas as tabelas (não `client_id` como estava escrito em alguns comentários antigos)
- Dois modos de operação (`shared` / `individual`) previstos no campo `tenants.operation_mode`
- Score incrementado por intenção: visita +2, compra/aluguel/venda +1 — nunca diminui automaticamente
- `saveConversationMessages` usa `ON CONFLICT (zapi_message_id) DO NOTHING` para deduplicação de re-entregas
- Falha no Supabase não derruba o atendimento — lead recebe resposta mesmo se banco estiver fora

### Pendências para próxima sessão
- [ ] Rodar migration no Supabase (SQL Editor)
- [ ] Configurar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env
- [ ] Criar RPC `increment_lead_score` e `increment_conversation_count` no Supabase (usados no service)
- [ ] Rodar skill `iniciar-sprint` antes do Sprint 4 — Análise de sentimento

## [2026-04-19] — Revisão geral + Sprint 4: Análise de sentimento

**Fase:** 1 — Backend central + atendimento WhatsApp
**Duração:** 1 sessão

### O que foi feito

#### Revisão e correção de bugs críticos (pré-Sprint 4)
- Histórico de conversa migrado de Map em memória para Supabase (`getConversationHistory`)
- Contador `aiFailedAttempts` agora persiste no banco via `persistAiFailure` — antes zerava a cada nova mensagem
- `messageCount` no gatilho de transferência corrigido: usa total real da conversa, não tamanho do batch de 8s
- `OPENAI_API_KEY` e `ANTHROPIC_API_KEY` com lazy init — servidor sobe sem as chaves configuradas
- Batch de áudio corrigido: falha de transcrição não descarta mais mensagens de texto do mesmo burst
- Bug no regex `detectIntent`: `"minha casa"` causava falso positivo em intenção de compra para frases de venda
- `vitest.config.ts` corrigido: usa `setupFiles` existente e exclui `dist/`
- Novo teste: `detectIntent` cobre todos os tipos de intenção (44 testes passando)
- `PLAN.md` atualizado: próximo passo corrigido para Sprint 4

#### Sprint 4 — Análise de sentimento
- Conduzida entrevista de negócio (skill `iniciar-sprint`) com 5 perguntas sobre sentimento
- Dois mecanismos complementares implementados:
  1. Keywords de urgência imediata (vou desistir, quero cancelar, péssimo atendimento etc.) → transferência instantânea via `shouldTransferToHuman`
  2. Tom geral via Claude Haiku — avalia padrão acumulado de ≥2 mensagens do lead
- Quando sentimento negativo: IA envia mensagem profissional de espera + alerta WhatsApp ao corretor + handoff agendado (15min)
- Se corretor não assumir em 15min: IA retoma (comportamento já existente)
- `sentiment` e `sentiment_updated_at` persistidos em `conversations` para o dashboard
- Índice parcial `WHERE sentiment='negativo'` para consultas rápidas no painel
- Migrations 001 e 002 rodadas com sucesso no Supabase

### Arquivos criados
- `migrations/002_add_sentiment.sql` — coluna sentiment + índice parcial
- `src/modules/sentiment/sentiment.types.ts` — SentimentType
- `src/modules/sentiment/sentiment.service.ts` — analyzeSentiment via Haiku
- `src/modules/sentiment/index.ts` — exports do módulo
- `src/tests/sentiment.service.test.ts` — urgency keywords, wait message, corretor alert
- `src/tests/ai-engine.service.test.ts` — detectIntent

### Arquivos modificados
- `src/modules/ai-engine/ai-engine.service.ts` — lazy init, sem Map em memória, fix batch de áudio, detectIntent exportado
- `src/modules/ai-engine/index.ts` — exports atualizados
- `src/modules/leads/leads.service.ts` — getConversationStats, getConversationHistory, updateConversationSentiment, persistAiFailure (substituiu getAiFailedAttempts)
- `src/modules/leads/index.ts` — exports atualizados
- `src/modules/whatsapp/whatsapp.service.ts` — URGENCY_KEYWORDS, normalize(), buildSentimentWaitMessage, buildCorretorAlert
- `src/modules/whatsapp/whatsapp.worker.ts` — upsertLead antecipado, histórico do banco, passos 6a/6b de sentimento, persistência de sentimento no passo 11
- `vitest.config.ts` — criado com setupFiles e exclude corretos
- `.env.example` — ZAPI_CORRETOR_PHONE adicionado
- `PLAN.md` — Sprint 4 marcado como concluído

### Decisões tomadas
- Sentimento avalia tom geral (não por mensagem) — Haiku precisa de ≥2 mensagens do lead
- ZAPI_CORRETOR_PHONE em .env por ora — Sprint 5 moverá para banco junto com configs do tenant
- Alerta ao corretor não dispara se handoff já estiver ativo (evita spam)
- Memórias permanentes criadas em `.claude/projects/` para contexto entre sessões

### Pendências para próxima sessão
- [ ] Configurar ZAPI_CORRETOR_PHONE no .env (aguardando plano pago Z-API)
- [ ] Testar fluxo completo com WhatsApp real (junto com testes Z-API)
- [ ] Rodar skill `iniciar-sprint` antes do Sprint 5 — Autenticação e multi-tenant

## [2026-04-21] — Sprint 5: Autenticação e multi-tenant

**Fase:** 1 — Backend central + atendimento WhatsApp
**Duração:** 1 sessão

### O que foi feito
- Conduzida entrevista de negócio (skill `iniciar-sprint`) com 8 perguntas sobre autenticação e modelo de usuários
- Migration 003: `agents.user_id` (FK auth.users) + `agents.active` (soft delete) + índices parciais
- Políticas RLS reescritas para usar subquery em `agents` (auth.uid) em vez de claim `tenant_id` que nunca era setado — prepara o Sprint 6 Realtime
- Middleware `requireAuth` com verificação local HS256 do JWT Supabase (sem round-trip), validação de `aud=authenticated` e `iss` do projeto
- Middleware `requireZapiToken` extraído do controller, usando `crypto.timingSafeEqual`
- Módulo `agents` com `findActiveAgentByUserId` e `getHandoffTargetPhone` (lead.agent_id com fallback pro primeiro ativo do tenant)
- Módulo `auth` com `GET /api/me` devolvendo `{ userId, email, tenantId, agentId }`
- Infra compartilhada: `HttpError`, `errorHandler` e augmentation do Express `req.auth`
- Worker passou a usar `getHandoffTargetPhone` — `ZAPI_CORRETOR_PHONE` foi aposentado
- Rate limit separado para `/webhook` (mais permissivo) e `/api`
- Suíte de testes subiu de 44 para 60 (novos: `agents.service`, `auth.middleware`)

### Arquivos criados
- `migrations/003_auth_and_assignment.sql`
- `src/shared/errors/http-error.ts` — classe `HttpError(status, code, message)`
- `src/shared/errors/error-handler.ts` — error middleware Express
- `src/shared/types/express.d.ts` — `req.auth` via module augmentation
- `src/shared/middleware/auth.ts` — `requireAuth`
- `src/shared/middleware/zapi-token.ts` — `requireZapiToken`
- `src/modules/agents/{agents.types.ts,agents.service.ts,index.ts}`
- `src/modules/auth/{auth.controller.ts,auth.routes.ts,index.ts}`
- `src/tests/agents.service.test.ts`
- `src/tests/auth.middleware.test.ts`

### Arquivos modificados
- `src/index.ts` — monta `requireZapiToken` em `/webhook`, `requireAuth` + `/api` router, `errorHandler` no final
- `src/modules/whatsapp/whatsapp.controller.ts` — check de token removido (middleware agora)
- `src/modules/whatsapp/whatsapp.worker.ts` — `alertCorretor` consome `getHandoffTargetPhone(tenantId, leadId)`
- `src/shared/utils/validate-env.ts` — `SUPABASE_JWT_SECRET` obrigatório
- `src/tests/setup.ts` — `SUPABASE_JWT_SECRET` fixture
- `.env.example` — adiciona `SUPABASE_JWT_SECRET`, remove `ZAPI_CORRETOR_PHONE` e `JWT_SECRET`/`JWT_EXPIRES_IN` obsoletos

### Decisões tomadas
- Verificação local HS256 do JWT: evita network round-trip por request, canonical Supabase pattern para backend
- Client Supabase segue em service-role — per-request anon+JWT foi deliberadamente adiado; middleware + `tenantId` explícito continuam como porta única
- `agents.active` com soft delete preserva histórico de leads atendidos por ex-corretores
- Handoff não aborta atendimento: se não há corretor ativo, loga warning e segue
- Frontend do Sprint 6 autentica via `supabase.auth.signInWithPassword()` e envia `Authorization: Bearer ${session.access_token}` — backend só valida, não emite JWT

### Pendências para próxima sessão
- [ ] Rodar `migrations/003_auth_and_assignment.sql` no Supabase
- [ ] Coletar `SUPABASE_JWT_SECRET` (Settings → API → JWT Secret) e adicionar no `.env`
- [ ] Criar manualmente no Supabase dashboard: 1 tenant + 1 user em `auth.users` + 1 agent com `user_id` preenchido
- [ ] Rodar skill `iniciar-sprint` antes do Sprint 6 — Dashboard Next.js

<!-- Adicione novas sessões acima desta linha -->
