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

<!-- Novas lições entram acima desta linha, em ordem cronológica reversa (mais recente primeiro) -->
