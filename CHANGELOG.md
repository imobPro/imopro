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

## [2026-05-11] — Sprint 9.2 — Onboarding backend + provisionamento Z-API

**Fase:** Fase 3 — Onboarding self-service (sub-sprint 2 de 3)

### Entrevista de negócio (decisões)
- Relógio do trial (7 dias) começa **quando o WhatsApp conecta**, não no cadastro
- Antes de confirmar o e-mail: cliente loga e vê o painel (com aviso); conectar o WhatsApp fica bloqueado até confirmar
- Falha ao provisionar instância Z-API: erro limpo + "tentar de novo" (frontend), nada gravado pela metade
- WhatsApp cai depois: marca `disconnected`; banner de reconectar é do 9.3; sem e-mail por enquanto
- Aceite LGPD: um checkbox obrigatório no cadastro, grava `lgpd_accepted_at`
- Modo imobiliária não exige cadastrar corretores no onboarding — quem assina vira o 1º corretor; `phone` opcional

### O que foi feito
- **Migration 011 ajustada** (ainda não aplicada): `subscriptions.trial_started_at`/`trial_ends_at` agora **nullable** (NULL = trial não começou); trigger `create_default_subscription()` cria só `(tenant_id, status='trial')`, sem datas — o relógio só inicia na conexão do WhatsApp.
- **`billing.service.ts`**: `Subscription.trialStartedAt`/`trialEndsAt` agora `string | null`; `isTrialActive` trata data nula como "trial pendente" (ativo se abaixo do cap); novo `startTrialClock(tenantId)` (UPDATE condicional idempotente — guarda `trial_started_at IS NULL`); novo `getTrialDays()`; `toSubscriptionView` ganha `trialStarted` e reporta o período cheio em `trialDaysRemaining` quando ainda não começou.
- **Módulo `onboarding`** (`src/modules/onboarding/`):
  - `POST /api/onboarding/signup` (público, limiter 10/h por IP): cria `auth.users` (não confirmado, admin API) → tenant (o trigger cria a subscription `trial` sem datas) → agent (a própria pessoa, destino de handoff, `phone` opcional), grava `lgpd_accepted_at`. E-mail duplicado → 409 `EMAIL_IN_USE`. Rollback compensatório (deleta user/tenant) se um passo seguinte falha.
  - `POST /api/onboarding/provision-zapi` (autenticado): gate `email_confirmed_at` (403 `EMAIL_NOT_CONFIRMED`); cria a instância via Partner API com callbacks pra `BACKEND_PUBLIC_URL` (`/webhook/whatsapp` e `/webhook/zapi-status`); persiste `zapi_instance_id/token` + `zapi_status='awaiting_qr'`; devolve o QR (`null` se a instância ainda subindo). Idempotente: já conectado → `alreadyConnected`; instância existente → reaproveita, só rebusca QR. `ZapiError` → 502 `ZAPI_PROVISIONING_FAILED`, nada persistido.
  - `GET /api/onboarding/connection` (autenticado): status atual + QR fresco quando `awaiting_qr` — endpoint de polling do frontend.
  - `POST /webhook/zapi-status` (webhook): localiza o tenant por `zapi_instance_id`; conexão → `zapi_status='connected'` + `zapi_connected_at` + `startTrialClock` (os 7 dias começam aqui); desconexão → `zapi_status='disconnected'`; eventos ambíguos ignorados. Sem `requireZapiToken` (instâncias provisionadas não enviam o token compartilhado por padrão — `instanceId` atua como segredo; TODO: assinatura).
- **`src/index.ts`**: monta `onboardingWebhookRouter` sob `/webhook` e `onboardingRouter` sob `/api/onboarding` (antes do bloco `requireAuth`).
- **`.env.example`**: nova var `BACKEND_PUBLIC_URL`. **`validate-env.ts`**: `ZAPI_ACCOUNT_TOKEN` e `BACKEND_PUBLIC_URL` viram opcionais (warning no boot; provisionamento responde 500 sem elas, resto do sistema segue).
- **Testes**: `src/tests/onboarding.service.test.ts` novo (24 casos: signup happy/shared/rejeições/rollbacks, provisionZapi gate/criação/idempotência/erros, connection, webhook connected/disconnected/ambíguo/desconhecido); `billing.service.test.ts` +9 casos (`getTrialDays`, `isTrialActive` com data nula, `startTrialClock`, `toSubscriptionView` com `trialStarted`); helper `supabase-mock` ganha `insert`/`delete`. **213 testes passando** (180 → 213). Typecheck limpo.

### Arquivos criados ou modificados
- `migrations/011_subscriptions_and_zapi_provisioning.sql` — datas do trial nullable + trigger sem datas
- `src/modules/onboarding/{onboarding.types,onboarding.service,onboarding.controller,onboarding.routes,index}.ts` (novos)
- `src/modules/billing/{billing.service,billing.types,index}.ts` — `startTrialClock`, `getTrialDays`, `trialStarted`, datas nullable
- `src/index.ts` — wiring do módulo onboarding
- `.env.example` — `BACKEND_PUBLIC_URL`; `src/shared/utils/validate-env.ts` — `ZAPI_ACCOUNT_TOKEN`/`BACKEND_PUBLIC_URL` opcionais
- `src/tests/onboarding.service.test.ts` (novo), `src/tests/billing.service.test.ts`, `src/tests/helpers/supabase-mock.ts`
- `migrations/README.md`, `PLAN.md`, `docs/checklist-producao.md` — docs

### Pendências para próxima sessão
- [ ] **Pré-deploy**: rodar `migrations/011_subscriptions_and_zapi_provisioning.sql` no SQL Editor do Supabase (ainda não aplicada).
- [ ] **Pré-deploy**: configurar `BACKEND_PUBLIC_URL` no Railway.
- [ ] **Pré-deploy**: conferir o setting "Confirm email" no Supabase Auth — o cadastro nasce com e-mail não confirmado; "logar antes de confirmar" depende dessa config.
- [ ] **Pré-deploy multi-instância**: instâncias provisionadas via Partner API não recebem o `ZAPI_CLIENT_TOKEN` compartilhado — `/webhook/whatsapp` (que valida esse token) só funciona para o piloto manual hoje. Configurar client-token por instância via API da Z-API ou migrar pra token por instância antes do 1º cliente self-service.
- [ ] Conferir o shape exato dos payloads "On Connected"/"On Disconnected" da Z-API contra a doc antes do deploy (`classifyEvent` assume `type`/`connected`).
- [ ] **Sprint 9.3** — frontend público (`/precos`, `/cadastro`, `/privacidade`, `/termos`) + interno (`/conectar-whatsapp` com QR + polling em `GET /api/onboarding/connection`, `/configuracoes/assinatura`, banner global de trial). O frontend dispara o e-mail de confirmação via `supabase.auth.resend({ type: 'signup' })`.

---

## [2026-05-10] — Sprint 9.1 — Schema + billing + gate de trial no worker

**Fase:** Fase 3 — Onboarding self-service (sub-sprint 1 de 3)
**Duração:** ~2h

### O que foi feito

- **Migration 011** (`subscriptions` + provisionamento Z-API):
  - Novas colunas em `tenants`: `zapi_account_managed`, `zapi_instance_id`, `zapi_instance_token`, `zapi_status` (not_provisioned|awaiting_qr|connected|disconnected), `zapi_connected_at`, `lgpd_accepted_at`
  - Tabela `subscriptions` (1:1 com tenant) com lifecycle `trial → expired → active → canceled`, `trial_ends_at`, `trial_message_count`, `plan_id`
  - RPC `increment_trial_message_count(tenant_id)` — atomic increment via SECURITY DEFINER; retorna NULL quando subscription não está em trial
  - Trigger `AFTER INSERT ON tenants` cria subscription automaticamente com 7d de trial
  - Backfill: tenants existentes ganham subscription `active` com `plan_id='legacy'`
  - RLS via `auth_tenant_ids()` (helper da migration 006)
- **SDK Z-API** (`src/shared/zapi/client.ts`): `createInstance`, `getInstanceStatus`, `getQrCodeImage`, `disconnectInstance`. Erros tipados via `ZapiError` (status + endpoint). Lazy validation do `ZAPI_ACCOUNT_TOKEN` (lição 005).
- **Módulo billing** (`src/modules/billing/`):
  - `billing.service.ts` — `getSubscription`, `isTrialActive`, `isAccessAllowed`, `incrementTrialMessageCount` (via RPC), `expireTrial`, `expireTrialsByTime`, `markActive` (stub do gateway), `toSubscriptionView`
  - `billing.controller.ts` — `GET /api/subscription` (view enriquecida com `trialMessagesRemaining`, `trialDaysRemaining`, `accessAllowed`), `POST /api/subscription/activate` (stub que apenas grava `plan_id` e marca active)
  - Cron diário `expire-trials` em fila `billing-cron` (UTC 05:00 = BRT 02:00)
- **Gate de trial no worker** (`whatsapp.worker.ts`):
  - Após carregar settings, carrega subscription em paralelo (`Promise.all`)
  - Se `!isAccessAllowed(subscription)`: cai em `silenceAndSave` (helper extraído do bloco `agentActive=false`, agora reusado por ambos)
  - Após cada `generateResponse` bem-sucedida (handoff E fluxo principal): `recordAiResponseForBilling(subscription, tenantId)` — incrementa contador via RPC; se atingir cap, marca expired (sem cortar a resposta atual)
- **`.env.example`** atualizado: novas vars `ZAPI_ACCOUNT_TOKEN`, `TRIAL_DAYS=7`, `TRIAL_MESSAGE_LIMIT=50`. Removidas `AGENT_NAME`/`REALTY_NAME` (no banco desde Sprint 8).

### Arquivos criados ou modificados

- `migrations/011_subscriptions_and_zapi_provisioning.sql` (novo)
- `src/shared/zapi/client.ts` (novo) — SDK
- `src/shared/zapi/zapi.types.ts` (novo) — tipos
- `src/modules/billing/billing.types.ts` (novo)
- `src/modules/billing/billing.service.ts` (novo)
- `src/modules/billing/billing.controller.ts` (novo)
- `src/modules/billing/billing.routes.ts` (novo)
- `src/modules/billing/billing.cron.ts` (novo)
- `src/modules/billing/index.ts` (novo)
- `src/shared/queue/queues.ts` — adiciona `billingQueue` + `BillingJobName`/`BillingJobData`
- `src/modules/whatsapp/whatsapp.worker.ts` — extrai `silenceAndSave`, adiciona gate de trial e `recordAiResponseForBilling`
- `src/index.ts` — registra `/api/subscription` + `startBillingWorker` + `registerBillingSchedules`
- `.env.example` — vars novas, remoção das obsoletas
- `src/tests/zapi.client.test.ts` (novo) — 9 testes
- `src/tests/billing.service.test.ts` (novo) — 31 testes
- `src/tests/whatsapp.worker.trial.test.ts` (novo) — 8 testes

### Decisões tomadas (entrevista 2026-05-10)

- **Cobrança stubada** no MVP da Fase 3 — gateway Stripe/Asaas vira sub-sprint separado quando MEI ativar. `markActive` apenas grava `plan_id` por enquanto.
- **Bifurcação shared/individual** no início do cadastro (Sprint 9.2 implementa).
- **ImobPro provisiona Z-API automaticamente** via Partner API com `ZAPI_ACCOUNT_TOKEN`.
- **Trial 7 dias OU 50 mensagens** (o que vier primeiro) — cap configurável via env.
- **Pós-trial: IA desliga, painel acessível** — reusa `saveIncomingMessagesOnly`. Pattern unificado entre `agentActive=false` e trial expirado via helper `silenceAndSave`.
- **Plano único no MVP** — `plan_id` é text simples; tela de planos com 1 card.
- **E-mail confirmado antes de provisionar Z-API** — gate da rota `provision-zapi` no Sprint 9.2.

### Testes

180 totais passando (132 → 180, +48 do Sprint 9.1).

### Pendências para próxima sessão (Sprint 9.2)

- [ ] Módulo `onboarding` (signup, criação de tenant+agent+subscription em transação)
- [ ] Endpoint `POST /api/signup` público
- [ ] Endpoint `POST /api/onboarding/provision-zapi` (autenticado, requer email confirmado)
- [ ] Webhook `POST /webhook/zapi-status` (atualiza `tenants.zapi_status` quando instância conecta)
- [ ] Aceite explícito LGPD durante o cadastro (timestamp em `lgpd_accepted_at`)

---

## [2026-05-09] — Reativa attempts>1 com idempotência por (job.id, label)

**Fase:** Backlog técnico (hardening)
**Duração:** ~1h30 (1h impl + 30min identificação e correção do escopo da chave)

### O que foi feito

- Helper genérico `runOnce(jobId, label, fn, ttl?)` em `src/shared/queue/idempotency.ts`. Marca `once:{jobId}:{label}` no Redis com `SET NX EX 86400`. Se a 1ª chamada falha, libera a flag para que o próximo retry possa de fato executar.
- Especialização `sendTextOnce(zapi, jobId, label, payload)` em `whatsapp.service.ts` cobre todos os envios do worker.
- Todos os `zapi.sendText` do `whatsapp.worker.ts` agora passam por `sendTextOnce` com label distinto: `ai_response`, `out_of_hours`, `handoff_resume`, `handoff_response`, `sentiment_wait_urgent`, `sentiment_wait_haiku`, `corretor_alert_urgent`, `corretor_alert_haiku`.
- `scoreUp` (único side-effect INCREMENT do banco) envolto em `runOnce(jobId, 'score_up', ...)`. Outros side-effects do banco (saveConversationMessages com UNIQUE, updateLeadStatus, updateConversationSentiment, persistAiFailure) já são naturalmente idempotentes.
- `whatsappQueue` em `queues.ts` volta a `attempts: 3` com `backoff: { type: 'exponential', delay: 30_000 }` (30s → 1m → 2m).
- `processWhatsAppJob(job, queue)` recebe o `Job<>` do BullMQ (não só `job.data`) e usa `job.id` como chave de `runOnce`. Discriminação debounce vs handoff-check via `job.name === 'handoff-check'`. Campo `jobId` removido do `WhatsAppMessageJob` (era redundante e era a fonte do bug — ver decisões abaixo).

### Arquivos criados ou modificados
- `src/shared/queue/idempotency.ts` (novo) — `markOnce`, `clearOnce`, `runOnce`
- `src/shared/queue/queue.types.ts` — campo `jobId` removido do `WhatsAppMessageJob`
- `src/modules/whatsapp/whatsapp.service.ts` — `sendTextOnce`; `enqueueMessage` deixa de preencher `jobId`
- `src/modules/whatsapp/whatsapp.worker.ts` — `processWhatsAppJob` recebe `Job<>`, usa `job.id`/`job.name`, todos os 6 `sendTextOnce` e `runOnce(...,'score_up')` passam `job.id`
- `src/shared/queue/queues.ts` — `attempts: 3` + backoff exponencial
- `src/tests/idempotency.test.ts` (novo) — 10 testes (markOnce, clearOnce, runOnce: claim, skip, libera em erro, propaga erro original, isola por jobId)
- `src/tests/whatsapp.service.test.ts` — 4 testes novos (sendTextOnce: envia, pula, libera, isola por label)
- `PLAN.md` — item marcado como concluído

### Decisões tomadas
- **Chave do `runOnce` é o `job.id` do BullMQ, não um string nosso derivado de tenant+phone**: a 1ª implementação keyava em `data.jobId = "debounce:${tenantId}:${phone}"`, constante por lead. Com TTL de 24h, a 2ª conversa do mesmo lead no mesmo dia teria `sendText`/`scoreUp` pulados (lead nunca recebia resposta). Corrigido para usar `job.id` — auto-gerado pelo BullMQ, único por job, estável em retries do mesmo job (stalled detection), distinto entre debounce batches sucessivos. Teste de regressão explícito em `idempotency.test.ts`.
- **Flag por (job.id, label) e não por job.id só**: cada tipo de mensagem do worker tem label distinto. Permite que envios independentes na mesma rodada (ex.: alerta ao corretor + espera ao lead) não compartilhem flag.
- **Liberar a flag em erro**: sem isso, falhas no 1º envio fariam retries pularem o `sendText` permanentemente. O DEL no `runOnce` garante que o próximo attempt rode de verdade.
- **TTL de 24h**: cobre janelas folgadas de retry com backoff exponencial. Limpa naturalmente do Redis depois.

### Validação
- 132 testes passando (eram 118)
- `tsc --noEmit` limpo

---

## [2026-05-09] — Cap defensivo no history da IA

**Fase:** Backlog técnico (hardening)
**Duração:** ~15min

### O que foi feito
- `MAX_HISTORY_MESSAGES = 30` em `ai-engine.service.ts`. `generateResponse` aplica `history.slice(-30)` antes de montar `apiMessages`. A fronteira de confiança fica na função de IA, não no caller.
- A RPC `get_conversation_history` já capa em 20 por padrão, mas o cap aqui cobre: caller passar limite maior, RPC mudar de comportamento, ou caso de teste sem o LIMIT do banco.

### Arquivos modificados
- `src/modules/ai-engine/ai-engine.service.ts` — constante + slice
- `src/tests/ai-engine.service.test.ts` — 2 testes novos (trim em 100 msgs, preserva em 5 msgs)
- `PLAN.md` — item marcado como concluído

### Validação
- 118 testes passando (eram 116) na conclusão deste item; total subiu para 132 após "Reativa attempts>1"
- `tsc --noEmit` limpo

---

## [2026-05-09] — Pendências do Sprint 6 fechadas

**Fase:** Fase 2 — Painel web + relatórios
**Duração:** ~30min

### O que foi feito

- **Indicador "não lido" na lista de leads**: `LeadCard` deriva `unread = !last_viewed_at || last_viewed_at < last_message_at`. Quando true, exibe ponto âmbar (`size-1.5 rounded-full bg-primary`) à esquerda do nome e troca o nome de `font-medium` para `font-semibold`. Card mantém o mesmo footprint visual; ciclo de leitura já existia via `markAsViewedAction`.
- **`outputFileTracingRoot` em `next.config.ts`**: aponta para `import.meta.dirname` (Node 24, ESM nativo). Resolve o aviso "multiple lockfiles detected" do Next 16 sem precisar fundir lockfiles — backend (raiz) e frontend (`frontend/`) seguem com seus `package-lock.json` independentes, que é o correto.

### Arquivos modificados
- `frontend/src/app/(app)/leads/lead-card.tsx` — função `isUnread` + ponto âmbar + nome semibold
- `frontend/next.config.ts` — `outputFileTracingRoot: import.meta.dirname`
- `PLAN.md` — pendências do Sprint 6 marcadas como resolvidas

### Validação
- `npx tsc --noEmit` limpo
- `npm run build` limpo, sem aviso de lockfile
- Validação visual no browser: pendente (limitação Claude — Arthur faz)

---

## [2026-05-04] — Sprint 8.5: Polimento pré-cliente

**Fase:** Fase 2 — Painel web + relatórios
**Duração:** ~2h

### O que foi feito

**Item 1 — Polimento de design no painel** (commit `9c34364`)
- `DESIGN.md` na raiz como fonte da verdade do sistema visual: paleta OKLCH (âmbar dourado sobre stone tintado, sem cinza puro), tipografia pareada Geist + Instrument Serif, easings `ease-out-quart`/`expo`/`back`, escalas de duração, anti-pattern audit. `globals.css` reescrito com os novos tokens e `prefers-reduced-motion` zera animações.
- Polimento aplicado em todas as superfícies: `/inbox` (bolhas, header sticky, status selector, lead-edit), `/leads`, `/funil`, `/metricas`, `/relatorios`, `/configuracoes`, `/login` e shell mobile/desktop. Componentes reutilizáveis novos: `ScoreBadge` e `tone-styles.ts`.
- Skills de design adicionadas ao toolkit do projeto: `polish-impeccable`, `taste`, `animacoes-emil`. Instrução de Managed Agents (Fase 4) salva em `docs/managed-agents-instrucao.txt`.
- Build validada: `next build` limpo, `tsc --noEmit` sem erros novos, anti-pattern greps zerados (emojis, gradientes ai-slop, `animate-bounce`, cores hardcoded).

**Item 2 — Handoff conversacional preparatório**
- Worker agora detecta `isHandoffActive` antes do passo de transferência: se há handoff em curso, pula `shouldTransferToHuman` e `analyzeSentiment`, chama `generateResponse({ handoffMode: true })`.
- `buildHandoffPreparatorySystemPrompt(config)` em `ai-engine.prompts.ts`: tom paciente, IA responde dúvidas leves mas sempre fecha lembrando que o corretor já foi acionado. Proibido prometer prazo, depreciar o corretor ou pedir nova transferência.
- `generateResponse` aceita `options.handoffMode`: usa prompt preparatório e descarta qualquer `[TRANSFER:]` que a IA inclua por engano.
- Job `handoff-check` no expirar (15min) agora envia `buildHandoffTimeoutResumeMessage` ao lead via Z-API antes de limpar a flag — texto reconhece a espera sem prometer prazo nem depreciar o corretor.

### Arquivos criados ou modificados
- `DESIGN.md` (novo) — fonte da verdade do sistema visual
- `frontend/src/app/globals.css` — tokens OKLCH, easings, reduced-motion
- 21 arquivos do frontend (telas + shell + login) — aplicação dos tokens
- `frontend/src/components/ui/score-badge.tsx` (novo)
- `frontend/src/lib/domain/tone-styles.ts` (novo)
- `skills/design/{polish-impeccable,taste,animacoes-emil}/` (novo) — skills de design
- `docs/managed-agents-instrucao.txt` (novo) — referência para Fase 4
- `src/modules/ai-engine/ai-engine.prompts.ts` — adiciona `buildHandoffPreparatorySystemPrompt`
- `src/modules/ai-engine/ai-engine.service.ts` — `generateResponse` aceita `options.handoffMode`
- `src/modules/ai-engine/ai-engine.types.ts` — `GenerateResponseOptions`
- `src/modules/ai-engine/index.ts` — exporta `GenerateResponseOptions`
- `src/modules/whatsapp/whatsapp.service.ts` — adiciona `buildHandoffTimeoutResumeMessage`
- `src/modules/whatsapp/whatsapp.worker.ts` — branch handoff em curso + envio da mensagem de retomada na expiração
- `src/tests/ai-engine.prompts.test.ts` — 5 testes do prompt preparatório
- `src/tests/ai-engine.service.test.ts` — 3 testes de `generateResponse` com mock do Anthropic SDK
- `src/tests/whatsapp.service.test.ts` — 2 testes da mensagem de retomada

### Decisões tomadas
- **Design**: âmbar dourado como acento (em vez do azul-corporativo padrão SaaS). Tinta stone (chroma 0.005–0.012) em vez de cinza puro. Display serif (Instrument Serif) só em heros, números grandes e empty states — UI em Geist Sans.
- **Handoff item a1**: IA em modo preparatório responde dúvidas leves (informações gerais, processo) mas sempre fecha lembrando que o corretor vai retornar. Para perguntas que exigem decisão comercial (preço, proposta, agendamento), explica que cabe ao corretor.
- **Handoff item b3**: texto da retomada — "Continuo à disposição. O corretor vai retornar assim que possível, e enquanto isso podemos seguir." Sem prazo específico, sem depreciar o corretor.
- **Strip do `[TRANSFER:]` em handoffMode**: defesa em profundidade — o prompt já instrui a IA a não usar o marcador, mas se ela alucinar, o service ignora.

### Pendências para próxima sessão
- [ ] Validar visualmente o polimento no browser (Arthur faz — limitação do Claude)
- [ ] Backlog técnico ainda em aberto: cap defensivo no `history`, prompt caching no Anthropic SDK quando system prompt passar de 1024 tokens, avaliar `gpt-4o-mini-transcribe` vs Whisper para PT-BR, reativar `attempts > 1` com flag "delivered" por job

### Estado dos testes
- 116 totais passando (antes: 106). +10 testes (5 prompt preparatório + 3 generateResponse mockando Anthropic + 2 mensagem de retomada)
- 2 erros TS pré-existentes em `tenant-settings.service.test.ts` (Sprint 8) seguem presentes — não introduzidos por este ciclo

---

## [2026-05-02] — Backlog técnico de hardening

**Fase:** Fase 2 — Painel web + relatórios (entre Sprint 8 e 8.5)
**Duração:** ~1h30

### O que foi feito
- **Idempotência por messageId** — `markMessageSeen(tenantId, messageId)` com Redis SET NX EX 24h descarta reentregas do webhook Z-API antes de enfileirar. Falha do Redis não bloqueia o atendimento (segue para enqueue, UNIQUE em zapi_message_id pega na persistência). Comentário em `queues.ts` atualizado explicando defesa em camadas.
- **RPC unificada `get_conversation_history`** — substitui 2 round-trips ao Supabase (lookup conversation + fetch messages) por 1 chamada de RPC. JOIN interno com filtros de tenant_id em ambas as tabelas. SECURITY INVOKER + STABLE + search_path fixo. Migration 010.
- **Auth HS256 → JWKS** — `requireAuth` agora usa `jose.createRemoteJWKSet` apontando para `/auth/v1/.well-known/jwks.json` do Supabase. Verifica ES256/RS256, audience=`authenticated`, issuer=`${SUPABASE_URL}/auth/v1`. `jsonwebtoken` removido, `jose` 6.2.3 instalada. `SUPABASE_JWT_SECRET` sai dos envs obrigatórios.

### Arquivos criados ou modificados
- `src/modules/whatsapp/whatsapp.service.ts` — adiciona `markMessageSeen`
- `src/modules/whatsapp/whatsapp.controller.ts` — usa `markMessageSeen` antes do `enqueueMessage`
- `src/shared/queue/queues.ts` — comentário sobre attempts=1 e dedup pré-fila
- `src/tests/whatsapp.service.test.ts` — 3 testes de `markMessageSeen`
- `migrations/010_history_rpc.sql` — RPC `get_conversation_history`
- `src/modules/leads/leads.service.ts` — `getConversationHistory` chama RPC
- `src/tests/leads.service.test.ts` — 5 testes de `getConversationHistory` com mock de `supabase.rpc`
- `src/shared/middleware/auth.ts` — reescrito com `jose` + JWKS lazy
- `src/shared/utils/validate-env.ts` — `SUPABASE_JWT_SECRET` removido da lista
- `src/tests/auth.middleware.test.ts` — chaves ES256 locais, mock de `createRemoteJWKSet`, +1 teste (issuer errado)
- `package.json` / `package-lock.json` — `jose`+, `jsonwebtoken`/`@types/jsonwebtoken`-

### Decisões tomadas
- **Dedup pré-fila + UNIQUE no DB** em vez de retry-safe job: reativar `attempts > 1` exige flag "delivered" por job, ficou para outro ciclo. As duas camadas atuais cobrem o caso real (Z-API reentregando webhook).
- **RPC SECURITY INVOKER** (default) com filtro explícito de tenant_id na query: backend continua usando service-role e bypassa RLS, mas o filtro garante isolamento mesmo nesse cenário. Quando frontend chamar a RPC direto, RLS volta a valer.
- **Forçar relogin na migração JWKS** em vez de manter HS256 como fallback: como ainda estamos pré-cliente, o custo é só Arthur fazer logout/login. Fallback duplo aumentava complexidade sem ganho.

### Pendências para próxima sessão
- [ ] **Pré-deploy**: rodar migration 010 no SQL Editor do Supabase
- [ ] **Pré-deploy**: habilitar asymmetric signing keys no painel Supabase (Project Settings → JWT Signing Keys → Migrate to ECC). Sem isso, o endpoint JWKS retorna `{}` e o login quebra.
- [ ] **Pós-deploy**: logout + relogin no painel `/login` para reemitir JWT no novo formato
- [ ] **Backlog ainda em aberto**: cap defensivo em `history` no ai-engine, prompt caching no Anthropic SDK quando o system prompt passar de 1024 tokens, avaliar `gpt-4o-mini-transcribe` vs Whisper para PT-BR

### Estado dos testes
- 106 totais passando (antes: 97). +9 testes (3 idempotência + 5 RPC histórico + 1 issuer auth)
- 2 erros TS pré-existentes em `tenant-settings.service.test.ts` (Sprint 8) ainda presentes — não introduzidos por este ciclo

---

## [2026-05-02] — Sprint 8: Configurações do agente

**Fase:** Fase 2 — Painel web
**Duração:** sessão única

### O que foi feito
- Migration 009 — colunas em `tenants` (agent_name, realty_name, welcome_message, business_hours_start/end, out_of_hours_message, agent_active) com CHECK constraints + `agents.settings_visibility jsonb` para preferência de UI por corretor
- Módulo backend `tenant-settings` — service com defaults seguros (atende mesmo com migration 009 não aplicada), controller com 4 endpoints (`GET /api/settings`, `PATCH /api/settings/{tenant,visibility,my-phone}`), validação à mão (ranges de hora, lengths, end > start, formato E.164)
- Worker passa a ler config do banco a cada job — `getTenantSettings(tenantId)` substitui `process.env.AGENT_NAME/REALTY_NAME`. Toggle desligado: pipeline sai antes da IA, salva mensagem do lead via `saveIncomingMessagesOnly` para o corretor responder no painel. Horário comercial usa `buildScheduleFromTenant(start, end)` (seg-sex)
- `buildSystemPrompt` recebe `welcomeMessage` opcional e adiciona "Tom e identidade da imobiliária" como contexto (não enviado literal ao lead)
- `getBusinessHoursMessage(custom, schedule)` retorna a mensagem custom do tenant ou cai no template padrão
- Frontend Next.js 16 — tela `/configuracoes` com 7 switches no topo (preferência por agent) controlando a visibilidade de cada seção; 7 seções condicionais (nome agente, marca, tom, horário, msg fora horário, toggle ativo, telefone). Server actions com `revalidatePath` após cada PATCH. Componente `Switch` novo em `components/ui/switch.tsx` (base-ui)
- 21 testes novos (76 → 97 totais passando) — `tenant-settings.service.test.ts` e `whatsapp.service.config.test.ts`

### Arquivos criados ou modificados
- `migrations/009_tenant_settings.sql` — campos do tenant + visibility por agent (NÃO APLICADA NO SUPABASE — Arthur roda)
- `src/modules/tenant-settings/{types,service,controller,routes,index}.ts` — módulo novo
- `src/modules/whatsapp/whatsapp.worker.ts` — pipeline integrado com config do banco e toggle desligado
- `src/modules/whatsapp/whatsapp.service.ts` — `getBusinessHoursMessage` recebe custom + schedule
- `src/modules/ai-engine/ai-engine.types.ts` — `welcomeMessage?` em `AgentConfig`
- `src/modules/ai-engine/ai-engine.prompts.ts` — linha "Tom e identidade da imobiliária" condicional
- `src/modules/leads/leads.service.ts` — nova `saveIncomingMessagesOnly` para o caso agent_active=false
- `src/shared/utils/business-hours.ts` — `buildScheduleFromTenant(start, end)` (seg-sex)
- `src/index.ts` — montagem de `/api/settings`
- `src/tests/tenant-settings.service.test.ts` (15 testes), `src/tests/whatsapp.service.config.test.ts` (6 testes)
- `frontend/src/app/(app)/configuracoes/{page,settings-form,actions}.tsx` — tela completa
- `frontend/src/lib/queries/settings.ts` — fetch do backend com Authorization
- `frontend/src/components/ui/switch.tsx` — wrapper base-ui
- `frontend/src/components/shell/{nav-items,bottom-tabs}.tsx` — item "Configurações" + grid dinâmico

### Decisões tomadas
- **Token Z-API adiado para Fase 3** — entrevista decidiu cadastro via SQL no piloto. Fica fora da tela de configurações
- **Toggle desligado salva mensagem mas IA fica em silêncio** — corretor responde manualmente no painel; modo "transferência permanente"
- **Mensagem de boas-vindas como contexto, não literal** — entra no system prompt como tom da marca; IA mistura naturalmente
- **Horário só por hora abertura/fechamento, seg-sex** — formato simples atende 90% dos casos. Sábado/domingo sempre fechados (decisão da entrevista)
- **Visibilidade jsonb por agent, não por tenant** — preferência pessoal, não vaza para outros corretores. Ausência de chave = visível
- **Defaults seguros em `getTenantSettings`** — se a coluna ainda não existir (migration 009 não aplicada), worker continua atendendo com defaults. Atendimento robusto (CLAUDE.md)
- **Mutations via Server Actions chamando o backend Express** — reusa validação centralizada; revalidate na rota após sucesso

### Pendências para próxima sessão
- [ ] **Aplicar migration 009 no Supabase** (SQL Editor) antes de subir o backend novo em produção
- [ ] Validação visual no browser real da `/configuracoes` (Arthur faz)
- [ ] Sprint 8.5 (polimento pré-cliente) ou Backlog técnico (JWKS, idempotência, RPC histórico)

---

## [2026-04-26] — Sprint 6 (parte 4 e 5): Métricas e Funil — Sprint 6 fechado

**Fase:** Fase 2 — Painel web
**Duração:** sessão única

### O que foi feito
- Tela `/metricas` com 3 cartões: Leads novos (hoje/7d/30d), Em fechamento (qualificados/fechados do mês) e Leads parados (sem msg há mais de 7d e ainda não fechados, com tone warning quando > 0)
- 6 contagens em paralelo via `count: "exact", head: true` — sem trazer linhas, só contadores. `countSafe` isola erros em zero pra não derrubar a tela
- Tela `/funil` em formato kanban com 6 colunas seguindo `STATUS_ORDER`. Mobile: cada coluna é accordion colapsável. Desktop: scroll horizontal, colunas de 18rem
- Card mini do funil mostra nome, telefone formatado e `formatRelative(last_message_at)` — clique abre `/inbox/[leadId]`
- Limite de 20 leads por status no funil com aviso "Mostrando os 20 mais recentes" quando atingido
- Commit anterior pendente da parte 3 também foi aplicado nesta sessão (`/inbox/[leadId]` read-only + migration 007)

### Arquivos criados ou modificados
- `frontend/src/app/(app)/metricas/page.tsx` — server component com auth → agent → metrics
- `frontend/src/app/(app)/metricas/metric-card.tsx` — variantes highlight (com tone) e rows
- `frontend/src/lib/queries/metrics.ts` — `getMetrics`, 6 contagens em paralelo, helpers `startOfTodayISO` e `daysAgoISO`
- `frontend/src/app/(app)/funil/page.tsx` — server component com auth → agent → funnel
- `frontend/src/app/(app)/funil/funnel-board.tsx` — wrapper que mapeia `STATUS_ORDER`
- `frontend/src/app/(app)/funil/funnel-column.tsx` — coluna colapsável (`useState`) no mobile
- `frontend/src/app/(app)/funil/lead-card-mini.tsx` — card compacto que linka pra inbox
- `frontend/src/lib/queries/funnel.ts` — `getLeadsGroupedByStatus` reusa `LEAD_COLUMNS` da query de leads
- `PLAN.md` — Sprint 6 marcado como concluído, fase atual atualizada para 2

### Decisões tomadas
- **Métricas usa `created_at` para qualificados/fechados** — não temos histórico de mudança de status. Limitação documentada na própria UI; evolui quando a tabela `lead_status_history` existir
- **Funil paralelo, não sequencial** — 6 queries `Promise.all` em vez de 1 query agregada. Mais simples, mais legível, RLS bate em cada uma. Para tenants pequenos isso é negligível
- **Limite por coluna em 20** — proteção contra colunas gigantes de "novo" estourarem altura. Opção `?expanded=1` pode ser adicionada se virar dor
- **Mobile colapsável, desktop sempre aberto** — `md:flex` força aberto no desktop mesmo com `open=false` virando "hidden" via classe condicional
- **`countSafe` isola erros** — falha de uma contagem retorna 0, dashboard não derruba inteiro

### Pendências para próxima sessão
- [ ] Validação visual real no browser (autenticado) das duas telas — eu não consigo fazer
- [ ] Resolver lockfiles duplicados (`package-lock.json` na raiz e em `frontend/`)
- [ ] Indicador "não lido" na Lista de Leads (`last_viewed_at < last_message_at`) — opcional
- [ ] Rodar skill `iniciar-sprint` antes do Sprint 7 — Relatórios automáticos em PDF

---

## [2026-04-25] — Sprint 6 (parte 3): Tela de conversa do lead

**Fase:** Fase 2 — Painel web
**Duração:** sessão única

### O que foi feito
- Tela `/inbox/[leadId]` (read-only, layout 2 lados, scroll-to-bottom no mount)
- Bolha de mensagem renderiza por type: text, audio (player), image, document, sticker, location
- Header sticky com avatar, nome, telefone, **Status selector** (dropdown radio), **Editar perfil** (Dialog com nome/região/perfil) e atalho **Abrir no WhatsApp** (`wa.me`)
- Histórico carrega últimos 7 dias por padrão; link `?expanded=1` carrega tudo
- Marca "visto" implícito no render: `markAsViewedAction` grava `last_viewed_at`
- `inbox/page.tsx` virou placeholder funcional ("Selecione um lead na aba Leads")

### Arquivos criados ou modificados
- `migrations/007_lead_view_state.sql` — `leads.last_viewed_at` (per-tenant; evolui pra per-agent quando shared mode for relevante). **Aplicada no Supabase em 2026-04-25.**
- `migrations/README.md` — entrada da 007
- `frontend/src/lib/types/database.ts` — adicionado `last_viewed_at`, `MessageRole`, `MessageType`, `ChatMessage`
- `frontend/src/lib/queries/leads.ts` — novo `getLeadById`, `LEAD_COLUMNS` extraído
- `frontend/src/lib/queries/messages.ts` — novo `getMessagesForLead(supabase, leadId, sinceDays?)`
- `frontend/src/lib/domain/relative-time.ts` — `formatAbsoluteTime`, `formatDayHeader`
- `frontend/src/app/(app)/inbox/[leadId]/page.tsx` — server component, auth → agent → lead → messages → markAsViewed
- `frontend/src/app/(app)/inbox/[leadId]/actions.ts` — `updateStatusAction`, `updateLeadProfileAction`, `markAsViewedAction`
- `frontend/src/app/(app)/inbox/[leadId]/chat-header.tsx` — header sticky com ações
- `frontend/src/app/(app)/inbox/[leadId]/chat-messages.tsx` — lista, agrupamento por dia, scroll-to-bottom
- `frontend/src/app/(app)/inbox/[leadId]/message-bubble.tsx` — renderização por tipo
- `frontend/src/app/(app)/inbox/[leadId]/status-selector.tsx` — dropdown radio
- `frontend/src/app/(app)/inbox/[leadId]/lead-edit-dialog.tsx` — modal de edição
- `frontend/src/app/(app)/inbox/page.tsx` — placeholder do tab raiz

### Decisões tomadas
- **Read-only por enquanto** — corretor responde no celular via WhatsApp; envio pelo painel fica pra sprint futuro
- **Layout 2 lados sem distinguir IA de corretor** — IA e respostas humanas (futuras) ficam ambas à direita como "imobiliária". Mais limpo, alinhado com como o lead vê
- **Mutations via Server Actions** — segue o padrão único existente (`login/actions.ts`); RLS valida via JWT, não precisa passar tenantId
- **`last_viewed_at` per-tenant**, não per-agent — limitação consciente documentada na migration; evolui pra tabela `lead_views(lead_id, agent_id, viewed_at)` quando shared mode pesar
- **Paginação via `?expanded=1`** — searchParam, sem state cliente

### Pendências para próxima sessão
- [ ] Teste end-to-end com Z-API real (assinatura ainda não comprada)
- [ ] Telas restantes do Sprint 6: Métricas (`/metricas`) e Funil (`/funil`)
- [ ] Indicador "não lido" na Lista de Leads (last_viewed_at < last_message_at) — opcional

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
