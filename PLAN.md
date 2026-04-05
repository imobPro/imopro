# PLAN.md — Plano de Execução

ImobBot SaaS · Sistema PAEA · Arthur CG · 2026

Consulte este arquivo para saber o que foi feito, o que está em andamento e o que vem a seguir.
Para detalhes do que foi construído em cada sessão, veja CHANGELOG.md.

---

## Status atual

**Fase:** 1 — Backend central + atendimento WhatsApp
**Próximo passo:** Iniciar Sprint 1 — Módulo WhatsApp (rodar skill `iniciar-sprint` antes)

---

## Fase 0 — Setup do projeto
**Duração estimada:** 1 semana
**Status:** ✅ Concluído

- ✅ 2026-04-03 Criar repositório no GitHub
- ✅ 2026-04-03 Criar estrutura de pastas conforme CLAUDE.md
- ✅ 2026-04-03 Configurar `.gitignore` e `.env.example`
- [ ] Instalar dependências base (Node.js, TypeScript, Express)
- [ ] Configurar Supabase — projeto e credenciais
- ✅ 2026-04-03 Criar skills iniciais (`/skills/`)
- ✅ 2026-04-03 Primeiro commit no GitHub

---

## Fase 1 — Backend central + atendimento WhatsApp
**Duração estimada:** Mês 1–3
**Status:** 🔲 Não iniciado

### Sprint 1 — Módulo WhatsApp
- [ ] Configurar Z-API e testar recepção de webhook
- [ ] Criar endpoint de recepção de mensagens
- [ ] Configurar fila BullMQ + Redis
- [ ] Enfileirar mensagens recebidas
- [ ] Criar worker que processa a fila

### Sprint 2 — Motor de IA
- [ ] Integrar Claude API (Sonnet)
- [ ] Criar system prompt base para agente imobiliário
- [ ] Implementar detecção de intenção (compra, aluguel, venda, info)
- [ ] Implementar lógica de handoff para corretor humano
- [ ] Manter histórico de conversa por lead no Supabase

### Sprint 3 — CRM de leads
- [ ] Criar schema Supabase: `tenants`, `leads`, `conversations`, `messages`
- [ ] Ativar RLS em todas as tabelas com `client_id`
- [ ] CRUD completo de leads
- [ ] Status do lead: novo, em conversa, qualificado, transferido, perdido
- [ ] Score de qualidade do lead (1–5)

### Sprint 4 — Análise de sentimento
- [ ] Implementar análise de sentimento via Claude API por mensagem
- [ ] Registrar sentimento agregado por conversa
- [ ] Alertar quando sentimento cair para negativo

### Entregável da Fase 1
- Sistema recebendo mensagens, respondendo com IA e salvando leads no banco
- Testado com número WhatsApp real de pelo menos 1 cliente piloto

---

## Fase 2 — Painel web + relatórios
**Duração estimada:** Mês 4–6
**Status:** 🔲 Não iniciado

### Sprint 5 — Autenticação e multi-tenant
- [ ] Supabase Auth — login por imobiliária
- [ ] Middleware de tenant no backend (extrai `client_id` do JWT)
- [ ] Proteger todas as rotas com autenticação

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
