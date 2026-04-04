# PRD.md — Product Requirements Document

ImobBot SaaS · Versão 1.0 · Arthur CG · 2026

---

## O que é

SaaS de atendimento inteligente via WhatsApp para imobiliárias brasileiras.
A imobiliária assina o plano, conecta seu número do WhatsApp e passa a ter um agente de IA respondendo leads 24/7 — qualificando, organizando e entregando relatórios automáticos para o corretor.

---

## Quem usa

### Persona principal — O corretor sobrecarregado
- Corretor autônomo ou pequena imobiliária (1–10 corretores)
- Perde leads porque não consegue responder fora do horário
- Não tem sistema de CRM — usa planilha ou papel
- Tem WhatsApp Business mas responde manualmente tudo
- Não tem equipe de TI — precisa de algo que funcione sem configuração técnica

### Persona secundária — O gestor de imobiliária média
- Imobiliária com 10–30 corretores
- Quer métricas e relatórios de atendimento
- Precisa de visibilidade sobre quantos leads chegam e o que acontece com eles
- Quer integrar com portais como Vivareal e OLX (Fase 4)

---

## Funcionalidades por módulo

### Módulo 1 — Atendimento WhatsApp
- Receber mensagens via Z-API e processar em fila
- Identificar intenção do lead: comprar, alugar, vender, informação
- Responder de forma humanizada usando Claude API
- Manter contexto da conversa (histórico por lead)
- Transferir para corretor humano quando detectar momento certo
- Enviar mensagem de boas-vindas configurável por imobiliária

### Módulo 2 — Qualificação de leads
- Classificar lead por intenção, urgência e perfil
- Capturar: nome, telefone, interesse (compra/aluguel), bairro, faixa de preço
- Status do lead: novo, em conversa, qualificado, transferido, perdido
- Score de qualidade do lead (1–5) baseado nas respostas

### Módulo 3 — Análise de sentimento
- Classificar humor da conversa: positivo, neutro, negativo, urgente
- Sinalizar leads frustrados para prioridade de atendimento humano
- Registrar sentimento por mensagem e por conversa completa
- Alertar corretor quando sentimento cair para negativo

### Módulo 4 — CRM de leads
- Painel com todos os leads por imobiliária (isolado por tenant)
- Filtros: status, data, sentimento, bairro, intenção
- Histórico completo de conversa por lead
- Exportação CSV
- Anotações manuais do corretor por lead

### Módulo 5 — Relatórios automáticos
- Relatório mensal gerado automaticamente em PDF
- Métricas: total de leads, taxa de qualificação, tempo médio de resposta, funil
- Distribuição por intenção (compra vs aluguel vs venda)
- Análise de sentimento agregada
- Enviado automaticamente por e-mail no dia 1 de cada mês

### Módulo 6 — Painel web (dashboard)
- Login por imobiliária com autenticação segura
- Visão geral: leads hoje, semana, mês
- Gráfico de funil de conversão
- Lista de leads com busca e filtros
- Configurações: nome do agente, mensagem de boas-vindas, horário de atendimento
- Histórico de relatórios para download

### Módulo 7 — Onboarding (Fase 3)
- Cadastro da imobiliária pelo painel
- Conexão do WhatsApp via QR code (Z-API)
- Configuração do agente (nome, tom, horário)
- Escolha de plano e pagamento (Stripe/Asaas)
- Ativação automática após pagamento confirmado

---

## O que o produto NÃO faz (escopo fora)

- Não substitui o corretor humano — ele complementa
- Não envia mensagens em massa (spam) — apenas responde quem iniciou
- Não integra com portais de imóveis (Fase 4, fora do MVP)
- Não gerencia contratos ou assinaturas de imóveis
- Não faz ligações telefônicas

---

## Requisitos não-funcionais

- **LGPD**: opt-in explícito, opt-out em qualquer momento, direito de exclusão
- **Disponibilidade**: 99.5% uptime mínimo — o atendimento não pode cair
- **Isolamento**: dados de uma imobiliária jamais visíveis para outra (RLS)
- **Latência**: resposta ao lead em menos de 5 segundos após receber mensagem
- **Segurança**: JWT com expiração, variáveis de ambiente, sem secrets no código
- **Escalabilidade**: arquitetura suporta 100 tenants sem refatoração

---

## Planos e precificação (rascunho)

| Plano | Preço/mês | Leads/mês | Funcionalidades |
|---|---|---|---|
| Basic | R$297 | até 200 | Atendimento + CRM básico |
| Pro | R$497 | até 500 | Tudo do Basic + Relatórios + Sentimento |
| Enterprise | R$797 | ilimitado | Tudo do Pro + Suporte prioritário + API |

---

## Critérios de sucesso — MVP (Fase 1–2)

- 3 imobiliárias pagando e usando ativamente
- Taxa de qualificação de leads acima de 40%
- NPS do cliente acima de 7
- Menos de 2 incidentes de downtime por mês
