# PLAN.md — Plano de Execução

ImobBot SaaS · Sistema PAEA · Arthur CG · 2026

Consulte este arquivo para saber o que foi feito, o que está em andamento e o que vem a seguir.
Para detalhes do que foi construído em cada sessão, veja CHANGELOG.md.

---

## Status atual

**Fase:** 3 — Onboarding self-service (sub-sprints 9.1 → 9.6 concluídos; Fase 3 completa para o MVP + hardening pré-deploy)
**Próximo passo:** Recrutar 1 imobiliária piloto. Cobrança real, Resend e tela elaborada de gestão de assinatura aguardam CNPJ + domínio (ver `docs/checklist-producao.md`). Backlog técnico: prompt caching e benchmark de transcrição quando houver áudios reais.

> Antes de rodar com cliente real, consultar [`docs/checklist-producao.md`](docs/checklist-producao.md)
> — lista o que precisa ser pago/contratado por fase de escala (domínio, Resend, Z-API por instância, etc).

---

## Fase 0 — Setup do projeto
**Duração estimada:** 1 semana
**Status:** ✅ Concluído

- ✅ 2026-04-03 Criar repositório no GitHub
- ✅ 2026-04-03 Criar estrutura de pastas conforme CLAUDE.md
- ✅ 2026-04-03 Configurar `.gitignore` e `.env.example`
- ✅ 2026-04-11 Instalar dependências base (Node.js, TypeScript, Express)
- ✅ 2026-04-12 Configurar Supabase — projeto e credenciais
- ✅ 2026-04-03 Criar skills iniciais (`/skills/`)
- ✅ 2026-04-03 Primeiro commit no GitHub

---

## Fase 1 — Backend central + atendimento WhatsApp
**Duração estimada:** Mês 1–3
**Status:** 🔄 Em andamento

### Sprint 1 — Módulo WhatsApp
- ✅ 2026-04-12 Configurar Z-API e testar recepção de webhook
- ✅ 2026-04-12 Criar endpoint de recepção de mensagens
- ✅ 2026-04-12 Configurar fila BullMQ + Redis
- ✅ 2026-04-12 Enfileirar mensagens recebidas
- ✅ 2026-04-12 Criar worker que processa a fila

### Sprint 2 — Motor de IA
- ✅ 2026-04-18 Integrar Claude API (Sonnet) via @anthropic-ai/sdk
- ✅ 2026-04-18 Criar system prompt base para agente imobiliário (configurável por tenant)
- ✅ 2026-04-18 Implementar detecção de intenção (compra, aluguel, venda, visita, info)
- ✅ 2026-04-18 Implementar debounce de 8s para batch de mensagens rápidas
- ✅ 2026-04-18 Implementar lógica de handoff com timer de 15min e re-notificação
- ✅ 2026-04-18 Manter histórico de conversa em memória (max 20 msgs, sliding window)
- ⚠️  Transcrição de áudio: stub implementado — requer STT externo (Whisper) no futuro

### Sprint 3 — CRM de leads
- ✅ 2026-04-18 Criar schema Supabase: `tenants`, `agents`, `leads`, `conversations`, `messages`
- ✅ 2026-04-18 Ativar RLS em todas as tabelas com `tenant_id`
- ✅ 2026-04-18 upsertLead(), updateLeadStatus(), scoreUp(), saveConversationMessages(), flagInactiveLeads()
- ✅ 2026-04-18 Status do lead: novo → em_conversa → qualificado → transferido → em_negociacao → fechado
- ✅ 2026-04-18 Score de qualidade do lead (1–5) com delta por intenção da IA
- ✅ 2026-04-18 Integração no worker — leads e mensagens persistidos após cada atendimento
- ✅ 2026-04-18 Dois modos de operação previstos no schema: shared / individual

### Sprint 4 — Análise de sentimento
- ✅ 2026-04-19 Implementar análise de sentimento via Claude Haiku (tom geral da conversa)
- ✅ 2026-04-19 Registrar sentimento agregado por conversa (coluna `sentiment` em `conversations`)
- ✅ 2026-04-19 Alertar corretor via WhatsApp quando sentimento cair para negativo
- ✅ 2026-04-19 Keywords de urgência máxima (vou desistir, quero cancelar etc.) com transferência imediata
- ✅ 2026-04-19 Mensagem profissional de espera enviada ao lead antes do handoff por sentimento

### Entregável da Fase 1
- Sistema recebendo mensagens, respondendo com IA e salvando leads no banco
- Testado com número WhatsApp real de pelo menos 1 cliente piloto

---

## Fase 2 — Painel web + relatórios
**Duração estimada:** Mês 4–6
**Status:** 🔲 Não iniciado

### Sprint 5 — Autenticação e multi-tenant
- ✅ 2026-04-21 Supabase Auth (e-mail + senha, reset self-service, sessão 30d) — backend only; frontend em Sprint 6
- ✅ 2026-04-21 Middleware `requireAuth` extrai `tenantId` e `agentId` do JWT via lookup em `agents`
- ✅ 2026-04-21 Migration 003: `agents.user_id` + `agents.active` + RLS reescrito com `auth.uid()`
- ✅ 2026-04-21 Módulo `agents` e `getHandoffTargetPhone` — `ZAPI_CORRETOR_PHONE` removido do .env
- ✅ 2026-04-21 `GET /api/me` + `HttpError`/`errorHandler` + augmentation de `req.auth`

### Sprint 6 — Dashboard
- ✅ 2026-04-22 Setup Next.js 16 (Turbopack) + Tailwind v4 + shell mobile-first
- ✅ 2026-04-23 Tela de login + middleware Supabase SSR
- ✅ 2026-04-26 Dashboard: leads hoje/7d/30d em `/metricas` (+ qualificados, fechados, parados)
- ✅ 2026-04-26 Gráfico de funil de conversão em `/funil` (kanban, 6 colunas, mobile colapsável)
- ✅ 2026-04-24 Lista de leads com filtros colapsáveis e busca
- ✅ 2026-04-25 Tela de detalhes do lead com histórico de conversa (`/inbox/[leadId]`)

### Sprint 7 — Relatórios automáticos
- [ ] Função de geração de relatório mensal em PDF
- [ ] Cron job para disparar no dia 1 de cada mês
- [ ] Envio automático por e-mail
- [ ] Histórico de relatórios no painel para download
- [ ] Integrar `flagInactiveLeads` em cron diário (função existe no service, sem agendamento)

### Sprint 8 — Configurações do agente
- ✅ 2026-05-02 Tela `/configuracoes` com nome do agente, marca, mensagem de boas-vindas (contexto IA), horário, mensagem fora do horário, toggle ativo, telefone do corretor
- ✅ 2026-05-02 Switches no topo da tela controlam visibilidade de cada seção (preferência pessoal por agent via `agents.settings_visibility`)
- ✅ 2026-05-02 Horário de atendimento configurável (start/end, seg-sex via `buildScheduleFromTenant`); fora do horário usa mensagem custom ou template
- ✅ 2026-05-02 Toggle "agente ativo" — false: IA fica em silêncio, mensagem do lead é salva via `saveIncomingMessagesOnly` para o corretor responder no painel
- ✅ 2026-05-02 `getAgentConfig` substituído por `getTenantSettings(tenantId)` no worker, com defaults seguros se a migration ainda não rodou
- ✅ 2026-05-02 `getBusinessHoursMessage(custom, schedule)` por tenant
- 🔁 Token Z-API por tenant — adiado para Fase 3 (entrevista decidiu cadastro via SQL no piloto)

### Sprint 8.5 — Polimento pré-cliente
- ✅ 2026-05-04 Aplicar design skills no painel antes da primeira demo — DESIGN.md, paleta OKLCH âmbar/stone, Geist + Instrument Serif, easings ease-out-quart/expo/back, todas as superfícies tocadas, anti-pattern audit zerado
- ✅ 2026-05-04 Handoff conversacional preparatório — `isHandoffActive` checado no worker; `generateResponse({ handoffMode: true })` usa prompt alternativo, descarta `[TRANSFER:]` e responde dúvidas leves sempre fechando que o corretor vai retornar; expiração de 15min envia `buildHandoffTimeoutResumeMessage` antes de limpar a flag
- ✅ 2026-05-09 Indicador "não lido" na lista de leads — ponto âmbar + nome semibold quando `last_viewed_at < last_message_at` (ou nunca visto)
- ✅ 2026-05-09 `outputFileTracingRoot` em `frontend/next.config.ts` — silencia o aviso "multiple lockfiles" do Next 16 sem mexer nos lockfiles legítimos de backend e frontend

---

## Backlog técnico — pós-revisão de 2026-04-26

Itens identificados na revisão dos módulos críticos com Context7. Não bloqueiam Sprint 7, mas devem entrar no roadmap de hardening.

### Segurança / Auth
- ✅ 2026-05-02 **JWT HS256 → JWKS** — `requireAuth` migrado para `jose` + `createRemoteJWKSet` apontando para `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Verifica ES256/RS256, audience+issuer. Pré-requisito operacional: habilitar asymmetric signing keys no painel Supabase antes do deploy.

### Robustez do pipeline IA
- ✅ 2026-05-02 **Idempotência por `messageId`** — `markMessageSeen` com Redis SET NX EX 24h descarta reentregas no controller. Defesa em camadas com UNIQUE no DB. `attempts: 1` mantido até flag "delivered" por job ser implementada.
- ✅ 2026-05-09 **Reativar `attempts > 1`** — `attempts: 3` + backoff exponencial 30s→1m→2m. Helper `runOnce(jobId, label, fn)` em `shared/queue/idempotency.ts`; especialização `sendTextOnce` em `whatsapp.service.ts`. Todos os `zapi.sendText` do worker (resposta IA, fora horário, retomada handoff, resposta preparatória, espera sentimento, alerta corretor) e o `scoreUp` (único side-effect INCREMENT do banco) passam pelo runOnce — retries após stalled não duplicam.
- [ ] **Avaliar `gpt-4o-mini-transcribe`** vs `whisper-1` para PT-BR — benchmark com áudios reais de leads.
- [ ] **Prompt caching no Anthropic SDK** — só compensa quando o system prompt passar de 1024 tokens (cache mínimo Sonnet). Medido em 2026-05-24: `buildSystemPrompt` ~730 tokens e `buildHandoffPreparatorySystemPrompt` ~470 tokens — ambos abaixo do mínimo. Reavaliar quando enriquecermos com glossário de bairros / scripts de objeção; só então ativar `cache_control: ephemeral`.
- ✅ 2026-05-09 **Cap defensivo em `history`** — `MAX_HISTORY_MESSAGES = 30` no `ai-engine.service.ts`, `slice(-30)` mantém as mais recentes. Cobre o caso de caller passar mais que o esperado ou da RPC `get_conversation_history` mudar de comportamento.

### Performance
- ✅ 2026-05-02 **`getConversationHistory` em uma única RPC** — migration 010 cria `get_conversation_history(tenant_id, lead_id, limit)`. Service consome via `supabase.rpc()`.

### Entregável da Fase 2
- Painel funcional acessível pelo cliente
- 2–3 imobiliárias pagando e usando o painel

---

## Fase 3 — Onboarding automatizado
**Duração estimada:** Mês 7–10
**Status:** ✅ MVP concluído (sub-sprints 9.1 → 9.4) — cobrança real e e-mail Resend são pós-MVP

Decisões da entrevista (2026-05-10): cobrança **stubada** no MVP (gateway real só com MEI ativo), bifurcação shared/individual no cadastro, ImobPro provisiona Z-API via Partner API, trial **7 dias OU 50 mensagens**, pós-trial reusa `saveIncomingMessagesOnly`, plano único no MVP, e-mail confirmado antes de provisionar Z-API.

Decisões da entrevista (2026-05-11, Sprint 9.2): o relógio dos 7 dias do trial **só começa quando o WhatsApp conecta** (não no cadastro); cliente loga e vê o painel antes de confirmar o e-mail (com aviso); falha ao provisionar Z-API → erro limpo + "tentar de novo" no frontend, nada gravado pela metade; WhatsApp que cai depois → marca `disconnected` (banner de reconectar é do 9.3); aceite LGPD = um checkbox obrigatório; modo imobiliária não exige cadastrar corretores no onboarding (quem assina vira o 1º corretor, `phone` opcional).

### Sprint 9.1 — Schema + billing + gate de trial
- ✅ 2026-05-10 Migration 011 (`subscriptions` + colunas `zapi_*`/`lgpd_accepted_at` em tenants + RPC + trigger + backfill legacy)
- ✅ 2026-05-10 SDK Z-API Partner API (`createInstance`, `getInstanceStatus`, `getQrCodeImage`, `disconnectInstance`)
- ✅ 2026-05-10 Módulo billing (`getSubscription`, `isAccessAllowed`, `incrementTrialMessageCount`, `expireTrial`/`expireTrialsByTime`, `markActive` stub) + endpoints `/api/subscription`
- ✅ 2026-05-10 Cron diário `expire-trials` em fila `billing-cron`
- ✅ 2026-05-10 Gate de trial em `whatsapp.worker.ts` (silêncio quando expirado, increment após cada resposta IA, marcação automática de expired ao atingir cap)

### Sprint 9.2 — Onboarding backend + provisionamento Z-API
- ✅ 2026-05-11 Módulo `onboarding`: `POST /api/onboarding/signup` público (cria auth.users + tenant + agent; o trigger cria a subscription `trial`; rollback compensatório se um passo falha)
- ✅ 2026-05-11 `POST /api/onboarding/provision-zapi` autenticado (gate `email_confirmed_at`; cria a instância via Partner API; idempotente; `ZapiError` → 502) + `GET /api/onboarding/connection` (polling do QR/status)
- ✅ 2026-05-11 Webhook `POST /webhook/zapi-status` (atualiza `tenants.zapi_status`; na conexão dispara `billing.startTrialClock` — relógio do trial começa aqui)
- ✅ 2026-05-11 Aceite explícito LGPD persistido em `tenants.lgpd_accepted_at` (checkbox obrigatório no cadastro)
- ✅ 2026-05-11 Migration 011 ajustada (datas do trial nullable, trigger sem datas) + `billing.startTrialClock`/`getTrialDays`/`trialStarted`. 213 testes passando.
- ✅ 2026-05-11 Migration 011 aplicada no Supabase por Arthur. Criada a migration 012 (`012_trial_clock_fixup.sql`) — fix-up idempotente das datas do trial, **rodar no Supabase por segurança**.
- 🔁 Pré-deploy restante: configurar `BACKEND_PUBLIC_URL`; conferir "Confirm email" no Supabase Auth; resolver client-token por instância para o `/webhook/whatsapp` das instâncias provisionadas (ver `docs/checklist-producao.md`)

### Sprint 9.3 — Frontend público + interno
- ✅ 2026-05-16 `/precos` — landing pública com 2 planos (Corretor R$297 / Imobiliária R$597) + CTA "7 dias grátis"
- ✅ 2026-05-16 `/cadastro` — wizard de 3 telas (tipo de operação → dados → aceite LGPD); ao final faz `signInWithPassword` + `auth.resend` + push `/verificar-email`
- ✅ 2026-05-16 `/privacidade` e `/termos` — renderizam `docs/privacidade.md` e `docs/termos.md` via `react-markdown`
- ✅ 2026-05-16 `/verificar-email` (route group `(onboarding)`) — tela bloqueante com cooldown 60s no reenviar
- ✅ 2026-05-16 `/conectar-whatsapp` — QR + contador 45s + polling 2.5s via `pollConnectionAction`; idempotente
- ✅ 2026-05-16 `/configuracoes/assinatura` — 4 estados (trial pendente / ativo / expirado / canceled); `UpgradeCta` esconde botões se `NEXT_PUBLIC_SUPPORT_*` vazios
- ✅ 2026-05-16 `TrialBanner` global no shell + gate de e-mail confirmado em `(app)/layout.tsx`
- ✅ 2026-05-16 Lib helpers: `fetchBackend<T>` com Bearer JWT, `toBannerVariant`; `react-markdown` adicionado ao frontend

### Sprint 9.4 — Observabilidade Sentry + roteiro de validação
- ✅ 2026-05-16 `@sentry/node` instalado e instrumentado no backend (`src/instrument.ts` como 1º import, `setupExpressErrorHandler` antes do errorHandler customizado)
- ✅ 2026-05-16 Helpers `captureSilentError`, `addExternalCallBreadcrumb`, `withJobMonitoring` em `src/shared/observability/sentry.ts`
- ✅ 2026-05-16 Lição 018 coberta em `leads.service.ts` (catches silenciosos que retornavam default agora reportam); lição 019 em `auth.ts`
- ✅ 2026-05-16 Workers (`whatsapp.worker`, `billing.cron`, `reports.cron`) com `on('failed')` + `on('error')` reportando ao Sentry
- ✅ 2026-05-16 Breadcrumbs nos 3 serviços externos críticos: `sendTextOnce` (Z-API), `generateResponse` (Anthropic), `transcribeAudio` (OpenAI)
- ✅ 2026-05-16 `validate-env`: `SENTRY_DSN` opcional; `.env.example` documentado
- ✅ 2026-05-16 `docs/roteiro-validacao-9.4.md`: 11 seções com ~70 itens para validação manual no browser (responsabilidade do Arthur; agora possível com Playwright MCP)

### Sprint 9.5 — Redesign Clay + logo HomeMark (extra, não planejado)
- ✅ 2026-05-20 Linguagem visual Clay aplicada em todo o frontend (paleta cream/matcha, cantos generosos, sombras suaves). `globals.css` reescrito; UI base (`button`, `card`, `badge`, `tabs`, `score-badge`) atualizada
- ✅ 2026-05-20 Telas refeitas: marketing (precos, cadastro, header, footer), onboarding (verificar-email, conectar-whatsapp), painel (configuracoes, assinatura, leads, funil, metricas, relatorios, inbox, trial banner) e login
- ✅ 2026-05-20 Inbox ganha split-view (`conversations-list` + `inbox-layout-shell` + `layout` do route group)
- ✅ 2026-05-20 Componente `HomeMark` em `src/components/brand/`: casa minimalista em outline branco sobre fundo verde (matcha), fiel à referência do Arthur. Substitui o SVG duplicado em 4 lugares
- ✅ 2026-05-20 Docs de referência commitados: `docs/imobpro-clay.md`, `docs/imobpro-android.md` (mobile pendente, ver Fase 4)
- ✅ 2026-05-20 MCPs `playwright` e `chrome-devtools` instalados no scope `user` (`~/.claude.json`) — habilitam validação automática no browser

### Sprint 9.6 — Hardening pré-deploy (Z-API auth + banner desconexão)
- ✅ 2026-05-22 `/webhook/whatsapp` autenticado por posse do `instanceId` (substitui `ZAPI_CLIENT_TOKEN`): `resolveTenantByInstance` no `whatsapp.service.ts` resolve `tenants.zapi_instance_id` → tenant UUID. Sem match → 200 `ignored_unknown_instance`. Removidos: `requireZapiToken` middleware, `ZAPI_CLIENT_TOKEN` de `validate-env` e `.env.example`. **Pendência operacional**: legacy piloto precisa gravar seu `instanceId` em `tenants.zapi_instance_id` via SQL.
- ✅ 2026-05-22 `classifyEvent` reconhece `disconnected: true` da Z-API (não `connected: false`): doc oficial verificada via context7. Adicionado campo `disconnected?: boolean` em `ZapiStatusWebhookPayload`. Connected continua aceitando ambos `type === 'ConnectedCallback'` E `connected === true`.
- ✅ 2026-05-22 Worker silencia IA quando `zapi_status='disconnected'`: passo 2c no `processWhatsAppJob` reusa `silenceAndSave`. Lê `getZapiStatus(tenantId)` em paralelo com settings e subscription. Default permissivo (`not_provisioned` em erro de banco) — não bloqueia atendimento por leitura falha.
- ✅ 2026-05-22 Banner danger pós-desconexão no painel: `/api/subscription` agora retorna `{ subscription, zapiStatus }`. `toBannerVariant(sub, zapiStatus)` prioriza `disconnected` sobre estados do trial (sempre danger). CTA "Reconectar" → `/conectar-whatsapp`.
- ✅ 2026-05-22 8 testes novos (213 → 221): `getZapiStatus` (4 cenários), `resolveTenantByInstance` (3 cenários), `classifyEvent` aceita `disconnected: true` standalone. Atualizado teste antigo do `signup` que checava `email_confirm: false` (fix do dia 20 mudou pra `true`).

### Pós-MVP (mapeado, fora do escopo do MVP)
- [ ] Integração Stripe ou Asaas real (depende de CNPJ ativo)
- [ ] E-mail de boas-vindas via Resend (depende de domínio validado)
- [ ] Tela elaborada de gestão de assinatura (trocar plano, cancelar, histórico)

### Entregável da Fase 3
- Cliente consegue se cadastrar e ativar o produto sem intervenção manual
- Cobrança recorrente funcionando automaticamente

---

## Fase 4 — Escala e novas features
**Duração estimada:** Mês 11–12+
**Status:** 🔲 Não iniciado

- [ ] Planos Basic / Pro / Enterprise com limites e permissões
- [ ] **Áudio como feature paga** — transcrição Whisper desligada no Basic, ligada no Pro/Enterprise. Plug-and-play (já existe na infra), só falta gating por plano
- [ ] **Integração Google Calendar** — agente verifica agenda do corretor e propõe horários disponíveis ao lead direto na conversa. Diferencial competitivo (nenhum concorrente faz hoje)
- [ ] **Integração Gmail** — entrega dos relatórios mensais via Gmail MCP em vez do mailer próprio do Sprint 7
- [ ] **Integração Google Drive** — relatórios PDF arquivados em pasta dedicada por imobiliária, geradas automaticamente no provisionamento
- [ ] **Migração para Managed Agents da Anthropic** — quando sair de Research Preview. Substitui o loop manual atual, ganha memória persistente por lead e habilita multi-agente (qualificação + relatório em paralelo). Referência: `docs/managed-agents-instrucao.txt`
- [ ] API pública para clientes Enterprise
- [ ] Suporte tier (chat no painel para clientes Pro/Enterprise)
- [ ] Dashboard de métricas agregadas (visão do admin)

---

## Regras para atualizar este arquivo

- Ao concluir uma tarefa, marque com ✅ e data: `✅ 2026-04-15`
- Ao iniciar uma sprint, mude o status para 🔄 Em andamento
- Ao concluir uma fase inteira, mude para ✅ Concluído
- Registre detalhes do que foi feito no CHANGELOG.md
