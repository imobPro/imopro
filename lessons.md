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

<!-- Novas lições entram acima desta linha, em ordem cronológica reversa (mais recente primeiro) -->
