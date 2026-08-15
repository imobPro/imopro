# Dívida técnica registrada

Cada item tem: o que é, os números de hoje, por que existe, quando deve sair.
A intenção é diferente de um TODO. Um TODO fica no código. Isto fica aqui
porque exige planejamento — não é remendo de sprint.

Registrado em 2026-08-15 junto com o baseline do Quality Gate.

---

## 1. `processWhatsAppJob` — quarentena de complexidade

**Onde:** `src/modules/whatsapp/whatsapp.worker.ts:181`

**Números de hoje (2026-08-15):**
- Complexidade ciclomática: **56** (teto do projeto é 25)
- Complexidade cognitiva: **108** (teto é 20)
- Linhas da função: **278** (teto `max-lines-per-function` é 100)
- Profundidade máxima: **5** (teto `max-depth` é 4)
- Cobertura de linhas: **3,77%**

**Estado:** override em `eslint.config.mjs` desligando `complexity` e
`sonarjs/cognitive-complexity` apenas neste arquivo. O comentário do override
tem os números acima e o ponteiro para este documento.

**Por que existe:** função que orquestra o pipeline inteiro — debounce, IA,
mídia, handoff, persistência, envio, transferência a corretor. Nasceu grande
porque cada Sprint (1→9) adicionou um caso a mais no mesmo lugar. Reescrever
tudo no meio da Fase 2 quebraria fluxos com cobertura zero.

**Regras do escopo enquanto está aqui:**
- **Não estender.** Qualquer código novo vai para função separada chamada por
  ela; a assinatura de `processWhatsAppJob` não cresce.
- **Não usar como referência de estilo** — é o oposto do que o projeto quer.
- Cada bug fix no worker aproveita para extrair pelo menos uma sub-função.

**Saída:** Sprint dedicado após primeiro cliente pagante. Meta: ciclomática ≤25
sem override, cobertura ≥85%. Não migrar sem cobertura — o teste protege a
refatoração.

---

## 2. Pontes billing/onboarding ↔ shared/database

**Onde:**
- `src/modules/billing/billing.service.ts` — re-exporta `startTrialClock`
- `src/modules/onboarding/onboarding.service.ts` — re-exporta `getZapiStatus`

**Estado:** implementação verdadeira em `src/shared/database/tenant-status.ts`.
Os re-exports carregam comentário `// PONTE —` explicando o porquê.

**Por que existe:** os módulos billing e onboarding se importavam mutuamente
(`onboarding.service → billing.startTrialClock` e
`billing.controller → onboarding.getZapiStatus`), criando ciclo travado pelo
depcruise. Movi as duas funções para shared/database (são SELECT/UPDATE finos,
sem regra de negócio rica). Preservei re-exports para não obrigar refactor de
todos os callers e testes num único PR.

**Saída:** quando tocar num caller destes módulos, migrar o import para
`../../shared/database/tenant-status`. Remover o re-export quando o último
caller sair. Callers atuais:
- `billing.controller.ts` — já importa direto do shared (não é ponte).
- `whatsapp.worker.ts` — importa `getZapiStatus, getZapiInstanceCredentials`
  de `../onboarding`. Ponte precisa continuar para `getZapiStatus` enquanto
  esse import estiver assim.
- Testes de billing e onboarding — passam pela ponte, mantêm compatibilidade.

**Nota sobre cobertura:** a extração destas duas funções para `shared/database`
mexeu nos denominadores dos módulos onboarding e billing — a variação de
cobertura vista no baseline é ruído matemático do refactor A1, não regressão
real. As linhas de negócio dos dois módulos continuam idênticas.

---

## 3. Ponte agents ↔ shared/database/agents-auth

**Onde:** `src/modules/agents/agents.service.ts` — re-exporta
`findActiveAgentByUserId` e `AgentLookupError`.

**Estado:** implementação em `src/shared/database/agents-auth.ts`. Ponte
carrega comentário `// PONTE —` explicando o porquê.

**Por que existe:** `src/shared/middleware/auth.ts` (JWT middleware) precisa
resolver `user_id → agent → tenant_id` antes de qualquer rota. Importar de
`modules/agents` viola `shared-nao-conhece-modulos`. Movi só o par usado pelo
middleware para shared/database; o resto do módulo agents (handoff target,
listagem para relatórios) continua onde estava.

**Saída:** quando o middleware for o único caller do
`findActiveAgentByUserId`, remover o re-export do módulo agents.

---

## 4. Tipos de domínio duplicando ponte em módulos

**Onde:**
- `src/modules/whatsapp/whatsapp.types.ts` — re-exporta `LeadProfile` de
  `src/shared/types/domain.ts`
- `src/modules/ai-engine/ai-engine.types.ts` — re-exporta `IntentType` idem
- `src/modules/onboarding/onboarding.types.ts` — re-exporta
  `ZapiConnectionStatus` de `src/shared/types/tenant.ts`
- `src/modules/agents/agents.types.ts` — re-exporta `AuthAgent` de
  `src/shared/types/agent.ts`
- `src/modules/leads/leads.types.ts` — re-exporta `LeadProfile` idem

**Por que existe:** tipos que múltiplos módulos consumiam moravam num módulo
"dono". Movi para `src/shared/types/`. Mantive re-export nos módulos para não
obrigar refactor global de imports num PR. Não afeta bundle: `export type` é
apagado no runtime.

**Saída:** ao tocar em qualquer arquivo que importe esses tipos, atualizar o
import para `../../shared/types/...` e remover o re-export do módulo quando o
último caller sair.

---

## 5. `agents` — cobertura real de 33%, não 47%

**Onde:** `src/modules/agents/agents.service.ts`

**Números de hoje (2026-08-15):**
- Cobertura de linhas real: **~33%** (após refactor A2)
- Cobertura aparente pré-refactor: **47,36%** — média inflada pelo par
  `findActiveAgentByUserId` + `AgentLookupError`, que era o único trecho bem
  coberto no módulo (usado por todo teste do middleware de auth).

**O que aconteceu:** o refactor A2 (ver seção 3) moveu esse par bem coberto
para `src/shared/database/agents-auth.ts`. O denominador do módulo caiu
proporcionalmente mais que o numerador, revelando que `agents.service.ts`
sempre esteve em ~33%. **Não houve regressão** — a cobertura das linhas que
permaneceram no módulo não mudou; o que mudou foi a média deixar de ser
mascarada pelo trecho migrado.

**Por que importa:** o módulo `agents` decide roteamento de handoff — qual
corretor recebe qual lead. Isso é **risco médio-alto**: bug de roteamento não
vaza dado entre tenants (a RLS + `tenantDb` seguram), mas manda lead pro
corretor errado dentro do mesmo tenant, o que é dor operacional imediata pro
cliente. Cobertura em 33% para essa lógica é dívida, não conforto.

**Saída:** próximo alvo de cobertura depois que `auth` (piso 95, hoje 0) e
`leads` (piso 90, hoje 12,82) forem cobertos. Não puxar `agents` na frente
desses dois — auth e leads são de risco maior. Meta ao pegar: subir o piso do
Quality Gate para o número real depois da bateria de testes, não antes.

**Lição embutida:** ver `lessons.md` — "Média de cobertura esconde buraco".
Regra de bolso: cobertura de pasta entre 40% e 60% é suspeita de esconder um
arquivo em 0% convivendo com outro em 90%+.

---

## 6. unsafe-any em fronteira de entrada

**Onde:**
- `src/modules/tenant-settings/tenant-settings.controller.ts` (4 ocorrências:
  L32, L37, L44, L49) — payload de request sem tipo. **Validação de input
  faltando na fronteira** — trava T6 do `CLAUDE.md` aparecendo como erro de
  lint. Exige schema de validação (zod), não type assertion.
- `src/modules/leads/leads.service.ts` (6 ocorrências: L29, L52, L171, L244,
  L313, L328) — mesmo módulo que está em 12,82% de cobertura (piso 90%).
  Alvo depois de `auth`.

**Regra:** NÃO resolver unsafe-any com `as Tipo` — isso silencia o lint sem
validar nada. A correção é schema de validação (zod ou equivalente) na
entrada. Uma type assertion diz ao compilador "confia em mim"; um schema diz
ao runtime "prove". Só o segundo bloqueia payload malformado do request real.

**Saída:**
- tenant-settings.controller: schema zod para o payload de update das
  configurações do tenant + `.parse()` no handler antes de qualquer uso do
  `req.body`. Pode entrar antes do sprint de cobertura de leads.
- leads.service: sai junto com o sprint que sobe a cobertura de `leads` do
  12% para o piso 90%.
