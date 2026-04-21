# PLAN.md — Plano de Execução

ImobBot SaaS · Sistema PAEA · Arthur CG · 2026

Consulte este arquivo para saber o que foi feito, o que está em andamento e o que vem a seguir.
Para detalhes do que foi construído em cada sessão, veja CHANGELOG.md.

---

## Status atual

**Fase:** 1 — Backend central + atendimento WhatsApp (última sprint concluída: 5)
**Próximo passo:** Sprint 6 — Dashboard Next.js (rodar skill `iniciar-sprint` antes)

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
- [ ] Setup Next.js com Tailwind
- [ ] Tela de login
- [ ] Dashboard: leads hoje, semana, mês
- [ ] Gráfico de funil de conversão
- [ ] Lista de leads com filtros e busca
- [ ] Tela de detalhes do lead com histórico de conversa

### Sprint 7 — Relatórios automáticos
- [ ] Função de geração de relatório mensal em PDF
- [ ] Cron job para disparar no dia 1 de cada mês
- [ ] Envio automático por e-mail
- [ ] Histórico de relatórios no painel para download

### Sprint 8 — Configurações do agente
- [ ] Tela de configurações: nome do agente, mensagem de boas-vindas
- [ ] Configuração de horário de atendimento (fora do horário: mensagem automática)
- [ ] Toggle para ativar/desativar o agente

### Entregável da Fase 2
- Painel funcional acessível pelo cliente
- 2–3 imobiliárias pagando e usando o painel

---

## Fase 3 — Onboarding automatizado
**Duração estimada:** Mês 7–10
**Status:** 🔲 Não iniciado

- [ ] Tela de cadastro de nova imobiliária
- [ ] Fluxo de conexão WhatsApp via QR code
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
- [ ] Integração com Vivareal (importar portfólio de imóveis)
- [ ] Integração com OLX Imóveis
- [ ] API pública para clientes Enterprise
- [ ] Suporte tier (chat no painel para clientes Pro/Enterprise)
- [ ] Dashboard de métricas agregadas (visão do admin)

---

## Regras para atualizar este arquivo

- Ao concluir uma tarefa, marque com ✅ e data: `✅ 2026-04-15`
- Ao iniciar uma sprint, mude o status para 🔄 Em andamento
- Ao concluir uma fase inteira, mude para ✅ Concluído
- Registre detalhes do que foi feito no CHANGELOG.md
