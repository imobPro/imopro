# lessons.md — Registro de Erros e Correções

ImobPro SaaS · Arthur CG · 2026

Leia este arquivo no início de cada sessão antes de trabalhar.
Toda vez que Arthur corrigir algo, registrar aqui o padrão do erro e a regra que evita repetição.

---

## Como usar este arquivo

Quando Arthur fizer uma correção, adicionar uma entrada seguindo o formato:

```
## [DATA] — Título curto do erro

**Contexto:** onde aconteceu (módulo, arquivo, situação)
**O que estava errado:** descrição clara do problema
**O que foi corrigido:** o que mudou
**Regra para não repetir:** instrução clara e objetiva
```

---

## Lição 001 — Template (substituir pela primeira lição real)

**Contexto:** Este é um exemplo de como registrar uma lição
**O que estava errado:** Nenhum erro real registrado ainda
**O que foi corrigido:** N/A
**Regra para não repetir:** Registrar aqui toda vez que Arthur fizer uma correção, imediatamente após a correção ser aplicada

---

## [2026-04-18] — RPC chamada antes de ser definida na migration

**Contexto:** Sprint 3 — leads.service.ts chamava `increment_lead_score` e `increment_conversation_count` mas essas funções não existiam na migration 001.
**O que estava errado:** As RPCs foram escritas no service antes de serem criadas no banco. Em produção, toda chamada a essas funções falharia silenciosamente (o service tem fallback, mas o problema não apareceria nos testes locais).
**O que foi corrigido:** RPCs adicionadas ao final da migration 001_initial_schema.sql.
**Regra para não repetir:** Antes de commitar qualquer service que chame `supabase.rpc('nome')`, verificar se a função existe na migration correspondente. Criar RPC e service no mesmo commit.

---

## [2026-04-18] — Migration sem UNIQUE constraint usada em onConflict

**Contexto:** Sprint 3 — saveConversationMessages() usava `onConflict: 'tenant_id,lead_id'` na tabela conversations, mas a migration não tinha `UNIQUE (tenant_id, lead_id)`.
**O que estava errado:** O Supabase/PostgreSQL exige que a coluna usada em `ON CONFLICT` tenha uma constraint UNIQUE ou seja PRIMARY KEY. Sem isso, o upsert lança erro em produção.
**O que foi corrigido:** `UNIQUE (tenant_id, lead_id)` adicionado à tabela conversations na migration.
**Regra para não repetir:** Ao escrever um upsert com `onConflict`, imediatamente verificar se a migration tem UNIQUE ou PK correspondente. Bater service contra migration antes de commitar os dois.

---

## [2026-04-18] — Assumir suporte de API de terceiro sem verificar documentação

**Contexto:** Sprint 2 — assumi que Claude API suportava entrada de áudio via `document` block. Não suporta. O build falhou com erro de tipo e a funcionalidade teve que ser reescrita para usar Whisper (OpenAI).
**O que estava errado:** Integração planejada e codificada sem consultar a documentação oficial da API antes de escrever o código.
**O que foi corrigido:** Transcrição de áudio reescrita usando Whisper API (OpenAI) com download + base64 + `openai.audio.transcriptions.create()`.
**Regra para não repetir:** Antes de usar qualquer recurso de API externa (multimodal, streaming, função específica), abrir a documentação oficial e confirmar que o recurso existe e qual é o formato correto. Nunca assumir por analogia com outras APIs.

---

## [2026-04-19] — Histórico de conversa em Map de memória

**Contexto:** ai-engine.service.ts — conversationHistory armazenado em Map<string, ConversationMessage[]>
**O que estava errado:** Map em memória é perdido em qualquer restart do servidor (deploy no Railway) e não funciona com múltiplas instâncias. A IA perdia o contexto de toda conversa em andamento a cada deploy.
**O que foi corrigido:** Histórico lido do Supabase via `getConversationHistory(tenantId, leadId)`. Worker carrega antes de chamar `generateResponse` e passa como parâmetro. `getHistory/appendHistory/clearHistory` removidos.
**Regra para não repetir:** Nunca usar Map/variável de módulo para estado de sessão por usuário. Estado que precisa sobreviver a restarts vai no banco ou no Redis.

---

## [2026-04-19] — Contador de falhas da IA não persistia entre mensagens

**Contexto:** whatsapp.worker.ts — `context.aiFailedAttempts += 1` dentro do catch do generateResponse
**O que estava errado:** O incremento era feito na variável local do job. Como o job retornava sem salvar, o banco ficava com o valor antigo. A lógica "2 falhas → transferir" nunca funcionava entre mensagens diferentes.
**O que foi corrigido:** `persistAiFailure(tenantId, leadId, newCount)` chamado no catch antes do return. Salva no banco imediatamente.
**Regra para não repetir:** Qualquer contador/flag que precise acumular entre jobs separados deve ser persistido no banco ANTES do return, não depois.

---

## [2026-04-19] — messageCount media tamanho do batch, não total da conversa

**Contexto:** whatsapp.worker.ts — `context.messageCount = pendingMessages.length`
**O que estava errado:** `pendingMessages.length` é o número de mensagens no burst de 8s (debounce). O gatilho "5+ mensagens sem resolução" disparava para qualquer lead que enviasse 5 mensagens rápidas na primeira interação.
**O que foi corrigido:** `messageCount` vem de `getConversationStats(tenantId, leadId).messageCount` — total real da tabela `conversations`.
**Regra para não repetir:** Ao usar contadores de negócio (mensagens, tentativas, etc.), sempre carregar do banco. Dados do job/fila são efêmeros e representam apenas o evento atual.

---

## [2026-04-19] — OPENAI_API_KEY lançava erro na importação do módulo

**Contexto:** ai-engine.service.ts — `throw new Error('OPENAI_API_KEY não definida')` no topo do arquivo
**O que estava errado:** O check era executado na importação. Servidor não subia em desenvolvimento sem a chave da OpenAI, mesmo sem nenhum áudio para transcrever.
**O que foi corrigido:** Clientes Anthropic e OpenAI com lazy init — instanciados na primeira chamada via `getAnthropic()` / `getOpenAI()`.
**Regra para não repetir:** Checks de variáveis de ambiente obrigatórias ficam no entry point (`src/index.ts`) ou dentro da função que usa a variável — nunca no topo de módulos importados por outros módulos.

---

## [2026-04-19] — Áudio com falha descartava texto do mesmo batch

**Contexto:** ai-engine.service.ts — `return AUDIO_FALLBACK_MESSAGE` dentro do loop de pendingMessages
**O que estava errado:** Se um áudio falhava na transcrição e o lead havia enviado texto no mesmo burst de 8s, o `return` antecipado descartava o texto. A intenção do lead se perdia.
**O que foi corrigido:** Loop continua após falha de áudio (`continue` implícito). Fallback só retorna se `userLines.length === 0` ao final do loop (todos falharam).
**Regra para não repetir:** Em loops de processamento de batch, nunca fazer `return` dentro do loop por falha de um item. Coletar erros e decidir no final.

---

## [2026-04-19] — "minha casa" causava falso positivo em intenção de compra

**Contexto:** ai-engine.service.ts — regex `/\b(comprar?|financiamento|entrada|minha casa)\b/`
**O que estava errado:** "minha casa" é ambíguo — aparece em "preciso vender minha casa" (intenção=venda) mas o regex retornava "compra". O teste `detecta venda` falhou com esse caso.
**O que foi corrigido:** "minha casa" removido do regex de compra. Era genérico demais para ser discriminador.
**Regra para não repetir:** Keywords de intenção devem ser específicas o suficiente para não capturar frases do sentido oposto. Testar com frases negativas (o que NÃO deve capturar) além das positivas.

---

## [2026-04-23] — Migration commitada no Git ≠ migration aplicada no Supabase

**Contexto:** Sprint 6 — rodei a migration 004 (RLS por ownership) e o Supabase retornou "column `user_id` does not exist on agents". Mas no repositório tanto a migration 003 quanto o backend (`agents.service.ts`) referenciavam `user_id`. Nada inconsistente no código.
**O que estava errado:** A migration 003 nunca foi rodada no SQL Editor do Supabase. O Sprint 5 foi commitado com o código que dependia de `agents.user_id` e `agents.active`, mas o SQL só foi escrito no arquivo — ninguém clicou em "Run". A 004 batia numa tabela `agents` ainda no estado da migration 001.
**O que foi corrigido:** Aplicada a 003 primeiro e depois a 004. Nenhuma mudança no código.
**Regra para não repetir:** Ao commitar qualquer migration nova, registrar explicitamente em CHANGELOG.md se ela já foi aplicada no Supabase ou não. Antes de construir qualquer feature que dependa de colunas/policies da migration, rodar a query de diagnóstico abaixo e comparar com o que o arquivo da migration declara. Se "column does not exist" aparecer e o código referencia a coluna, a primeira hipótese é migration não aplicada, não typo no código.

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '<tabela>'
ORDER BY ordinal_position;
```

---

## [2026-04-23] — Recursão infinita em RLS que referencia a própria tabela

**Contexto:** Sprint 6 — as policies das migrations 003 e 004 usavam subqueries do tipo `SELECT tenant_id FROM agents WHERE user_id = auth.uid() AND active = true` dentro da própria RLS de `agents` (e também nas policies de leads/conversations/messages que leem agents). Com o frontend logando via JWT do usuário pela primeira vez, o Postgres aplicava a RLS ao subquery, que aplicava de novo, e assim por diante. Resultado: "infinite recursion detected in policy for relation agents" — o `maybeSingle()` engolia o erro e o painel mostrava "Conta sem imobiliária vinculada" mesmo com o agent linkado corretamente.
**O que estava errado:** Duas coisas em sequência. Primeiro, escrevi as policies sem perceber que o subquery recursivo geraria loop na primeira leitura do próprio usuário. Depois, tentei "quebrar" a recursão na migration 005 adicionando uma policy permissiva `user_id = auth.uid()` — falhou porque o PG avalia **todas** as policies permissivas antes de combinar com OR, e o erro da recursiva aborta a query inteira antes da OR acontecer.
**O que foi corrigido:** Migration 006 — funções `auth_tenant_ids()` e `auth_agent_ids()` com `SECURITY DEFINER` + `search_path` fixo. SECURITY DEFINER bypassa RLS durante a execução da função. Policies reescritas chamando as funções em vez de subqueries recursivas. GRANT EXECUTE só pra role `authenticated`.
**Regra para não repetir:** Sempre que uma policy RLS precisar consultar a tabela que ela protege (ou qualquer tabela cuja policy também consulte esta), encapsular o lookup em função `SECURITY DEFINER` com `STABLE`, `search_path = public, pg_temp` e GRANT EXECUTE restrito. Nunca confiar que "múltiplas policies permissivas combinam por OR" resolve recursão — elas são avaliadas antes da combinação, e qualquer erro em uma delas aborta a query. Validar policies novas rodando `SELECT * FROM <tabela>` como role `authenticated` antes de subir (via `SET LOCAL ROLE authenticated` no SQL Editor).

---

## [2026-04-26] — `jobId` cru no BullMQ deduplica também contra jobs em retenção

**Contexto:** whatsapp.service.ts — `enqueueMessage` usava `queue.add(jobId, data, { jobId, delay })` para debounce de 8s, com `removeOnComplete: 100` na fila.
**O que estava errado:** `jobId` cru bloqueia novos `add` enquanto o job estiver em qualquer estado, incluindo completed retidos por `removeOnComplete`. Em pouca movimentação, o segundo burst de mensagens do mesmo lead virava no-op silencioso — a mensagem entrava na lista Redis (`pending:`) mas nenhum worker era acionado para drená-la. Resultado: lead manda burst → IA responde → próximo burst do mesmo lead fica órfão até o slot rotacionar.
**O que foi corrigido:** Substituído por `deduplication: { id, ttl, extend: true, replace: true }` (modo debounce oficial do BullMQ). O id volta a estar livre assim que o job sai da fila. Validado contra docs do Context7 (`/taskforcesh/bullmq`).
**Regra para não repetir:** Para debounce/throttle, sempre usar a opção `deduplication` do BullMQ, nunca `jobId` cru. `jobId` é para identificação humana e não foi desenhado para deduplicação confiável quando há retenção de completed/failed.

---

## [2026-04-26] — `lockDuration` default (30s) menor que duração real do pipeline IA

**Contexto:** whatsapp.worker.ts — Worker iniciado sem `lockDuration` explícito. O job interno chama Whisper, Claude Sonnet, Haiku (sentimento), múltiplas queries Supabase e Z-API.
**O que estava errado:** Pipeline real costuma passar de 30s, especialmente quando há áudio. BullMQ auto-renova lock na metade do intervalo, mas qualquer glitch de rede no renew faz o job virar `stalled` → re-processado → IA responde duas vezes ao mesmo lead.
**O que foi corrigido:** `lockDuration: 120_000` no Worker.
**Regra para não repetir:** Sempre dimensionar `lockDuration` com base no P99 real do pipeline + margem. Para qualquer Worker que faça chamadas a múltiplos serviços externos (LLM, transcrição, banco), default 30s é insuficiente. Mensurar antes, não depois.

---

## [2026-04-26] — `attempts > 1` em job que envia mensagem ao lead sem idempotência

**Contexto:** queues.ts — `defaultJobOptions: { attempts: 3, backoff: exponential }` para a fila `whatsapp-messages`.
**O que estava errado:** Se o job concluísse `zapi.sendText` (lead já recebeu a resposta) mas falhasse depois (ex.: erro ao persistir no Supabase), o BullMQ retentava do zero — o lead recebia a mesma resposta múltiplas vezes.
**O que foi corrigido:** `attempts: 1` no job principal. Job de `handoff-check` (idempotente — só lê uma flag Redis) recebe `attempts: 3` localmente.
**Regra para não repetir:** Retry automático só pode ser habilitado em jobs comprovadamente idempotentes. Mensagens com side effect externo (envio ao usuário, cobrança, e-mail) precisam de flag de "já entregue" no banco antes que retries voltem a ser seguros. Se a idempotência ainda não está implementada, `attempts: 1` é a opção segura.

---

## [2026-04-26] — `result.content[0]` do Anthropic SDK acessado sem optional chaining

**Contexto:** ai-engine.service.ts — `result.content[0].type` sem `?.` após `messages.create`.
**O que estava errado:** Embora raro, `content` pode vir como array vazio (refusal, edge cases). Sem optional chaining, vira "Cannot read properties of undefined (reading 'type')" — exception não tratada que sobe pelo worker.
**O que foi corrigido:** `block?.type === 'text' ? block.text : ''`.
**Regra para não repetir:** Acesso a primeiro elemento de array vindo de SDK externo sempre com optional chaining. SDKs evoluem e responses raros podem aparecer.

---

## [2026-04-26] — `parseTransfer` aceitava qualquer razão sem whitelist

**Contexto:** ai-engine.service.ts — regex `/\[TRANSFER:([^\]]+)\]/` retornava qualquer string como `transferReason`.
**O que estava errado:** O system prompt define 3 razões válidas (`pedido_explicito`, `intencao_fechamento`, `ia_sem_resposta`), mas se a IA alucinasse `[TRANSFER:lead_chato]`, o handoff disparava com razão inválida e o downstream tratava como handoff legítimo.
**O que foi corrigido:** Whitelist `VALID_TRANSFER_REASONS` checada antes de retornar `shouldTransfer: true`. Razão fora da lista → `shouldTransfer: false` e o texto limpo é entregue normalmente. Tipo `TransferReason` adicionado em `ai-engine.types.ts`.
**Regra para não repetir:** Qualquer marcador estruturado extraído de output de LLM (tags, comandos, classificações) precisa validar contra whitelist explícita. LLM eventualmente alucina formato — a fronteira de confiança fica no parser, não no prompt.

---

## [2026-04-26] — Erros de Supabase silenciados em massa no leads.service

**Contexto:** leads.service.ts — `getConversationStats`, `getConversationHistory`, `updateConversationSentiment`, `persistAiFailure` faziam `await supabase.from(...)` ignorando o `error` retornado, ou usavam `.catch(() => default)` no caller.
**O que estava errado:** Em produção, qualquer indisponibilidade do Supabase virava "tudo zerado/vazio" sem rastro nos logs. Sintoma silencioso típico: lead recebe IA respondendo do zero como se fosse a 1ª mensagem (porque `getConversationHistory` retornou `[]`). Pior: `persistAiFailure` engolido faz a lógica "2 falhas → transferir" parar de funcionar entre jobs.
**O que foi corrigido:** Cada chamada agora inspeciona `error` e loga `console.error` com `leadId` antes de retornar default. `single()` substituído por `maybeSingle()` em queries que podem legitimamente não ter linha.
**Regra para não repetir:** Toda chamada Supabase deve inspecionar `error`. `.catch(() => default)` no caller esconde a causa raiz. Quando o default for parte do contrato (ex.: "primeira mensagem do lead → histórico vazio"), checar pelo código específico (`PGRST116` = no rows) em vez de engolir tudo.

---

## [2026-04-26] — `findActiveAgentByUserId` mascarava falha de banco como "sem corretor vinculado"

**Contexto:** middleware/auth.ts — chamava `findActiveAgentByUserId` e retornava 403 `NO_ACTIVE_AGENT` quando o resultado era `null`.
**O que estava errado:** A função retornava `null` em duas situações distintas: (1) o usuário realmente não tem agent ativo, (2) a query Supabase falhou. Em produção com Supabase indisponível, todos os usuários autenticados viam "Conta sem imobiliária vinculada" — diagnóstico ruim que disfarça o incidente como problema de cadastro.
**O que foi corrigido:** Criada `AgentLookupError` no service. Falha de banco lança a exceção; ausência legítima retorna `null`. Middleware diferencia: 500 `AGENT_LOOKUP_FAILED` vs 403 `NO_ACTIVE_AGENT`. Filtro `active=true` movido para a query (em vez de filtrar em memória).
**Regra para não repetir:** `null` em retorno deve significar uma única coisa (ausência legítima do recurso). Falha de infraestrutura é exceção, não null. Quando o caller precisa decidir entre 500 e 4xx, a distinção tem que vir do callee — não do `error` engolido.

---

## [2026-05-09] — Chave de runOnce derivada de tenant+phone colide entre conversas

**Contexto:** whatsapp.worker.ts — primeira implementação do `runOnce` para reativar `attempts > 1` keyava em `data.jobId`, que era setado em `enqueueMessage` como `"debounce:${tenantId}:${phone}"`. Constante por lead. TTL de 24h no Redis.
**O que estava errado:** A flag `once:debounce:tenant:phone:sendText:ai_response` era reusada entre todas as conversas do mesmo lead em 24h. Após a 1ª resposta, `sendTextOnce`/`scoreUp`/`handoff_resume` da 2ª conversa em diante eram pulados silenciosamente — lead nunca mais recebia resposta da IA naquele dia. Os testes não pegaram porque mockavam Redis com jobIds inventados, sem cenário multi-batch com jobId constante.
**O que foi corrigido:** `processWhatsAppJob(job, queue)` agora recebe o `Job<>` do BullMQ e usa `job.id` (auto-gerado, único por job, estável em retries do mesmo job) como chave do `runOnce`. Discriminação debounce vs handoff-check via `job.name === 'handoff-check'`. Campo `jobId` removido do `WhatsAppMessageJob` por ser redundante e enganoso. Teste de regressão explícito: dois `jobIds` diferentes com mesma label não compartilham flag.
**Regra para não repetir:** Chave de idempotência tem que ter o **escopo da unidade de execução** que se quer dedupar. Para retry de UM job (stalled detection), o escopo é o `job.id` interno do BullMQ — único por job, estável em retries do mesmo, distinto entre jobs sucessivos. Nunca derivar a chave de identidade do **domínio** (tenant+phone, leadId, conversationId) quando o que se quer é deduplicar **execuções de um mesmo job**. Se a chave é constante entre execuções logicamente independentes, a flag vai bloquear cenários legítimos. Validar escrevendo um teste que prova explicitamente: "duas execuções com mesmo escopo de domínio mas IDs de execução distintos NÃO compartilham flag."

---

<!-- Novas lições entram acima desta linha, em ordem cronológica reversa (mais recente primeiro) -->
