# ENVYRO.md — Visão Estratégica

Documento de visão da empresa. Leia antes de tomar decisões de produto ou negócio.
Dono: Arthur CG — Niterói, Rio de Janeiro, Brasil.

---

## O que é a Envyro

Envyro é uma AI Native Agency — uma empresa que usa inteligência artificial
para transformar a maneira de trabalho de pequenas e médias empresas brasileiras.

O nome vem de "environment" — ambiente. A proposta é criar um novo ambiente
de trabalho para nossos clientes: mais eficiente, mais automatizado, mais lucrativo.

Não vendemos apenas software. Entregamos resultado.

---

## Modelo de negócio

A Envyro opera em dois níveis simultâneos:

### Nível 1 — Produtos SaaS verticais
Ferramentas AI Native para nichos específicos.
Cada produto resolve um problema claro de um mercado claro.

### Nível 2 — Serviço gerenciado
Para clientes maiores que não querem operar a ferramenta —
querem o resultado. A Envyro configura, opera e entrega.

### Por que os dois juntos?
- Pequenas empresas entram pelo SaaS (baixo ticket, escala)
- Empresas maiores migram para o serviço (alto ticket, margem)
- O mesmo produto serve os dois públicos — sem retrabalho

---

## Portfólio de produtos

### Produto 1 — ImobPro (em desenvolvimento)
Atendimento via WhatsApp com IA para imobiliárias brasileiras.
Qualifica leads, conduz conversas, notifica corretores e gera relatórios.

**Status:** Sprint 8 — painel web em construção
**Repositório:** github.com/ImobPro/imobpro
**Documentação:** ver CLAUDE.md e PLAN.md do projeto

### Produto 2 — a definir
Próximo vertical após validação do ImobPro.
Candidatos: clínicas, escritórios de advocacia, salões, restaurantes.
Decisão baseada no aprendizado comercial do ImobPro.

### Produto 3+ — a definir
A estrutura técnica do ImobPro (fila, IA, CRM, relatórios) se reaproveita
em qualquer produto vertical. Cada novo produto custa menos para construir.

---

## Modelo de precificação

| Perfil do cliente | Modelo | Preço estimado |
|---|---|---|
| Corretor individual | SaaS self-service | R$297/mês |
| Imobiliária média | SaaS + suporte | R$597/mês |
| Imobiliária grande | Serviço gerenciado | R$2.000–3.000/mês |

O serviço gerenciado tem margem de software com preço de agência.
É o modelo mais lucrativo e o que mais fideliza o cliente.

---

## Vantagens competitivas

**1. AI Native desde o início**
Concorrentes (Kommo, Wati, Respond.io) são SaaS tradicionais com IA adicionada.
A Envyro nasce com IA no centro — arquitetura, produto e entrega.

**2. Português nativo + mercado brasileiro**
Concorrentes cobram em dólar e não falam português nativamente.
LGPD nativa, tom brasileiro, preço acessível.

**3. Company Brain estruturado**
Todo conhecimento do negócio está documentado e acessível à IA.
Cada produto novo se beneficia do aprendizado dos anteriores.

**4. Modelo de serviço escalável**
Com IA, entregamos o que uma agência de 15 pessoas entrega
com uma equipe pequena e margem muito maior.

---

## Estratégia de validação

Antes de escalar, validar com clientes reais:

1. **ImobPro funciona?** — testar com 2-3 imobiliárias piloto
2. **Qual modelo converte mais?** — SaaS vs serviço gerenciado
3. **Qual o ticket médio real?** — o mercado decide, não a planilha
4. **O aprendizado replica?** — usar ImobPro como base para produto 2

Só avançar para o produto 2 após ter clientes pagando no produto 1.

---

## Abordagem comercial

Inspirado no vídeo: não apresentar — demonstrar.

Quando reunir com um cliente potencial:
- Chegar com a IA já configurada com o nome da empresa dele
- Mostrar uma conversa de exemplo rodando ao vivo
- Deixar ele interagir na hora
- Fechar na própria reunião

"Você não vende software. Você mostra o futuro do negócio dele."

---

## Infraestrutura técnica reutilizável

Tudo construído no ImobPro se reaproveita nos próximos produtos:

| Componente | ImobPro | Próximos produtos |
|---|---|---|
| Fila de mensagens (BullMQ) | ✅ | Reaproveita |
| Motor de IA (Claude API) | ✅ | Reaproveita |
| Multi-tenant (Supabase + RLS) | ✅ | Reaproveita |
| Autenticação | ✅ | Reaproveita |
| Painel web (Next.js) | ✅ | Reaproveita |
| Relatórios automáticos | ✅ | Reaproveita |

Estimativa: produto 2 leva 40% do tempo que o ImobPro levou.
Produto 3 leva 25%. O custo de construção cai, a margem sobe.

---

## Roadmap da Envyro

| Fase | O que fazer | Quando |
|---|---|---|
| Agora | Terminar e validar ImobPro | 2026 |
| Próximo | 2-3 clientes pagando + aprendizado comercial | 2026 |
| Depois | Definir produto 2 com base no aprendizado | 2026-2027 |
| Futuro | Serviço gerenciado para clientes enterprise | 2027 |
| Escala | MCP próprio conectando todos os produtos | 2027+ |

---

## Regras da Envyro

1. Validar antes de construir — nunca construir para um mercado hipotético
2. Resultado primeiro — o cliente paga pelo resultado, não pela ferramenta
3. Infraestrutura compartilhada — nenhum produto começa do zero
4. Margem de software, preço de serviço — o modelo mais lucrativo
5. Documentar tudo — o Company Brain é um ativo da empresa

---

## Referências e inspirações

- Y Combinator Request for Startups (2026)
- Tese AI Native Agency — entregar resultado, não ferramenta
- Tese Company Brain — conhecimento centralizado como ativo
- Karpathy Second Brain — memória estruturada para IA operar
- Managed Agents Anthropic — infraestrutura de agentes para escala futura
