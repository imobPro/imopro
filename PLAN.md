# PLAN.md — Plano de Execução

ImobBot SaaS · Sistema PAEA · Arthur CG · 2026

Consulte este arquivo para saber o que foi feito, o que está em andamento e o que vem a seguir.
Para detalhes do que foi construído em cada sessão, veja CHANGELOG.md.

---

## Status atual

**Fase:** 2 — Painel web (última sprint concluída: 8 + hardening de 2026-05-02)
**Próximo passo:** Sprint 8.5 — Polimento pré-cliente

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
- [ ] Aplicar design skills no painel antes da primeira demo (Emil Kowalski animation, Impeccable `/polish`, Taste skill) — referência: `docs/design-skills-instrucao.txt`
- [ ] Handoff conversacional preparatório: nos 15 min entre transferência e o corretor assumir, IA mantém tom "preparando entrada do corretor" em vez de silêncio. Se o tempo estourar, mensagem de retomada reconhece a espera sem depreciar o corretor

---

## Backlog técnico — pós-revisão de 2026-04-26

Itens identificados na revisão dos módulos críticos com Context7. Não bloqueiam Sprint 7, mas devem entrar no roadmap de hardening.

### Segurança / Auth
- ✅ 2026-05-02 **JWT HS256 → JWKS** — `requireAuth` migrado para `jose` + `createRemoteJWKSet` apontando para `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Verifica ES256/RS256, audience+issuer. Pré-requisito operacional: habilitar asymmetric signing keys no painel Supabase antes do deploy.

### Robustez do pipeline IA
- ✅ 2026-05-02 **Idempotência por `messageId`** — `markMessageSeen` com Redis SET NX EX 24h descarta reentregas no controller. Defesa em camadas com UNIQUE no DB. `attempts: 1` mantido até flag "delivered" por job ser implementada.
- [ ] **Reativar `attempts > 1`** — exige flag "delivered" por job antes de cada `zapi.sendText` (Redis ou DB) para que retentativas após stalled detection não enviem resposta em duplicata.
- [ ] **Avaliar `gpt-4o-mini-transcribe`** vs `whisper-1` para PT-BR — benchmark com áudios reais de leads.
- [ ] **Prompt caching no Anthropic SDK** — só compensa quando o system prompt passar de 1024 tokens (cache mínimo Sonnet). Quando enriquecermos com glossário de bairros / scripts de objeção, ativar `cache_control: ephemeral`.
- [ ] **Cap defensivo em `history`** dentro do `ai-engine.generateResponse` (ex.: últimas 30 trocas) — defesa em profundidade.

### Performance
- ✅ 2026-05-02 **`getConversationHistory` em uma única RPC** — migration 010 cria `get_conversation_history(tenant_id, lead_id, limit)`. Service consome via `supabase.rpc()`.

### Entregável da Fase 2
- Painel funcional acessível pelo cliente
- 2–3 imobiliárias pagando e usando o painel

---

## Fase 3 — Onboarding automatizado
**Duração estimada:** Mês 7–10
**Status:** 🔲 Não iniciado

- [ ] Tela de cadastro de nova imobiliária
- [ ] Fluxo de conexão WhatsApp via QR code
- [ ] **Token Z-API por tenant** — hoje compartilhado via `process.env.ZAPI_TOKEN`. Adiado do Sprint 8 porque entrevistas decidiram cadastro via SQL no piloto. Quando o onboarding self-service entrar, cliente cola o token na tela de provisionamento
- [ ] Integração Stripe ou Asaas para cobrança recorrente
- [ ] Provisionamento automático após pagamento confirmado
- [ ] Página de planos e preços
- [ ] E-mail de boas-vindas automatizado após cadastro
- [ ] Tela de gestão de assinatura (trocar plano, cancelar)

### Entregável da Fase 3
- Cliente consegue se cadastrar e ativar o produto sem intervenção manual
- Cobrança recorrente funcionando automaticamente

---

## Fase 4 — Escala e novas features
**Duração estimada:** Mês 11–12+
**Status:** 🔲 Não iniciado

- [ ] Planos Basic / Pro / Enterprise com limites e permissões
- [ ] **Áudio como feature paga** — transcrição Whisper desligada no Basic, ligada no Pro/Enterprise. Plug-and-play (já existe na infra), só falta gating por plano
- [ ] Integração com Vivareal (importar portfólio de imóveis)
- [ ] Integração com OLX Imóveis
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
