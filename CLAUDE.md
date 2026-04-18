# CLAUDE.md — ImobPro SaaS

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
/imobpro
  CLAUDE.md               ← este arquivo
  PRD.md                  ← requisitos do produto
  PLAN.md                 ← roadmap de fases
  CHANGELOG.md            ← registro do que foi construído
  lessons.md              ← registro de erros e correções
  .gitignore
  .env.example
  /skills/
    /iniciar-sprint/      ← entrevista de negócio antes de cada módulo
    /criar-modulo/
    /criar-migration/
    /integrar-zapi/
    /prompt-claude-api/
    /gerar-relatorio/
    /commit-padrao/
    /seguranca/
    /melhorar-skills/
  /src/
    /modules/
      /whatsapp/
      /ai-engine/
      /leads/
      /sentiment/
      /reports/
      /tenants/
      /auth/
    /shared/
      /database/
      /queue/
      /utils/
  /frontend/
  /docs/
```

---

## Disciplina de sessão — contexto

A janela de contexto enche e o desempenho cai. Seguir sempre sem exceção:

- **Ao iniciar qualquer sessão** — ler o `lessons.md` para evitar repetir erros anteriores
- **Antes de cada sprint** — rodar a skill `iniciar-sprint` para entrevista de negócio
- **A cada hora de trabalho** — verificar uso com `/context`
- **Ao atingir 40–50% do contexto** — rodar `/compact` imediatamente, não esperar encher
- **`/compact`** — ao final de cada sessão de trabalho
- **`/clear`** — ao trocar de módulo completamente
- **Plan mode (Shift+Tab)** — sempre ao iniciar módulo novo ou tarefa complexa
- **Auto accept** — somente após revisar e aprovar o plano

---

## Ritual de início de sprint — OBRIGATÓRIO

Antes de construir qualquer módulo ou feature nova, seguir essa ordem:

1. Ler o `lessons.md` — verificar se há erros anteriores relevantes para esta tarefa
2. Rodar a skill `iniciar-sprint` — conduz entrevista de negócio com o dono do projeto
3. Responder todas as perguntas com calma — são perguntas de comportamento, não técnicas
4. Entrar em plan mode e propor o plano de implementação
5. Aguardar aprovação do plano antes de executar

Nunca pular a entrevista e ir direto para o código.

---

## Self-Improvement Loop — OBRIGATÓRIO

Toda vez que Arthur fizer uma correção no trabalho apresentado:

1. **Parar imediatamente** e entender o que estava errado
2. **Registrar no `lessons.md`** o padrão do erro e a regra que evita que se repita
3. **Aplicar a correção** com a abordagem correta
4. **Revisar o `lessons.md`** no início da próxima sessão

O objetivo é que o mesmo erro nunca aconteça duas vezes no projeto.

---

## Autonomous Bug Fixing

Quando receber um relato de bug ou erro:

1. **Não pedir orientação** — ir direto nos logs, mensagens de erro e testes
2. **Identificar a causa raiz** — nunca corrigir sintoma sem entender a causa
3. **Propor a solução elegante** — não fazer remendos temporários
4. **Testar a correção** antes de apresentar como resolvida
5. **Nunca marcar como resolvido** sem provar que funciona

Se o bug envolve decisão de produto (comportamento esperado), usar AskUserQuestion Tool antes de corrigir.

---

## Demand Elegance

Para qualquer mudança não trivial (mais de 10 linhas ou impacto em múltiplos arquivos):

- Pausar e perguntar internamente: **"existe uma forma mais elegante?"**
- Se a solução parece um remendo: reescrever com a solução correta desde o início
- Impacto mínimo — tocar apenas o que é necessário, não introduzir complexidade desnecessária
- Pular esta etapa apenas para correções simples e óbvias

---

## Verificação antes de concluir

Nunca marcar uma tarefa como concluída sem:

- Provar que funciona — rodar os testes ou demonstrar o comportamento
- Verificar se passou no checklist da skill correspondente
- Confirmar que nenhuma regra de arquitetura foi violada
- Perguntar internamente: *"um desenvolvedor sênior aprovaria este código?"*

---

## Convenções de código

- Linguagem: TypeScript (strict mode)
- Nomeclatura: camelCase para variáveis e funções, PascalCase para classes e tipos
- Arquivos: kebab-case (`lead-service.ts`, `create-migration.sql`)
- Commits: mensagem em português, imperativo — "Adiciona módulo de leads"
- Branches: `feature/nome-da-feature`, `fix/nome-do-bug`
- Sempre tipar retornos de funções — nunca usar `any`

---

## Tom do agente de IA

Regras obrigatórias para todos os system prompts e respostas geradas pelo agente imobiliário:

- **Nunca usar emojis** — nem nas respostas ao lead, nem nas mensagens do sistema
- **Tom profissional e humanizado** — como um atendente bem treinado, não um robô nem um vendedor ansioso
- **Usar o nome do corretor e do lead quando disponível** — personaliza sem ser invasivo
- **Frases diretas e objetivas** — sem exagero de cordialidade, sem "Claro!", "Com certeza!", "Ótimo!"
- **Áudio recebido do lead** — Claude API transcreve para texto e a IA responde normalmente, sem avisar o lead
- **Se transcrição de áudio vier confusa** — pedir para repetir com mensagem neutra: "Não consegui entender bem sua mensagem. Pode me enviar novamente ou escrever o que precisa?" (nunca mencionar qualidade do áudio)

---

## Contexto de negócio

- Mercado-alvo: imobiliárias pequenas e médias no Brasil
- Problema central: leads chegam fora do horário, corretores perdem vendas
- Diferencial: IA em português, LGPD nativa, preço acessível vs concorrentes internacionais
- Concorrentes: Kommo, Respond.io, Wati (todos em dólar, sem português nativo)
- Precificação planejada: R$297–R$597/mês dependendo do plano
- Fase atual: ver PLAN.md
