# SKILL.md — prompt-claude-api

## O que é esta skill

Esta skill cria e configura prompts para a Claude API usados no módulo `ai-engine` do ImobPro. Os prompts definem como o agente de IA se comporta no atendimento ao lead — tom, limites, regras e fluxo de conversa.

Use esta skill ao criar um novo comportamento de IA ou ao ajustar um prompt existente que está gerando respostas inconsistentes.

---

## Quando usar

- Ao criar o agente de atendimento principal pela primeira vez
- Ao adicionar uma nova capacidade ao agente (qualificação, sentimento, transferência)
- Quando o agente estiver respondendo de forma inconsistente ou fora do tom esperado
- Quando um caso de borda do negócio imobiliário não estiver sendo tratado corretamente

---

## Regras obrigatórias — NUNCA violar

1. **Modelo padrão: Sonnet** — usar Haiku para tarefas simples, Opus para decisões críticas
2. **Nunca hardcodar o prompt no controller** — prompts ficam em arquivos `.ts` no `ai-engine`
3. **Todo prompt deve incluir `client_id` no contexto** — para rastreabilidade
4. **Prompts em português do Brasil** — o lead é brasileiro, a conversa é em português
5. **Separar system prompt de user prompt** — não misturar instruções com conteúdo da conversa
6. **Testar o prompt com casos reais antes de subir** — simular leads difíceis e edge cases

---

## Estratégia de modelos por tarefa

| Tarefa | Modelo | Motivo |
|---|---|---|
| Resposta ao lead (atendimento) | Sonnet | Qualidade e naturalidade no texto |
| Classificação de intenção | Haiku | Tarefa simples e rápida |
| Análise de sentimento | Haiku | Classificação objetiva |
| Score de qualificação | Sonnet | Requer raciocínio sobre o contexto |
| Decisão de transferir para humano | Sonnet | Decisão crítica de negócio |
| Arquitetura de novo fluxo de IA | Opus | Decisão complexa |

---

## Como executar

### Passo 1 — Identifique o comportamento a ser implementado

Antes de escrever o prompt, responda:
- O que o agente deve fazer neste momento da conversa?
- Quais informações ele precisa para fazer isso?
- Qual é o output esperado — texto livre, JSON estruturado, ou classificação?
- Quais são os casos em que ele NÃO deve agir?

### Passo 2 — Estruture o system prompt

O system prompt define a identidade e as regras do agente. Use este template:

```typescript
// ai-engine/prompts/atendimento.prompt.ts

export const SYSTEM_PROMPT_ATENDIMENTO = `
Você é um assistente de atendimento imobiliário chamado [NOME_AGENTE].
Você representa a imobiliária [NOME_IMOBILIARIA] e atende leads via WhatsApp.

## Seu objetivo
Qualificar o lead coletando as informações abaixo de forma natural, sem parecer um formulário:
- Nome completo
- Interesse: comprar, alugar ou vender?
- Bairro ou região de interesse
- Faixa de preço aproximada
- Urgência: quando pretende concluir?

## Tom e estilo
- Português brasileiro informal, mas profissional
- Respostas curtas — máximo 3 frases por mensagem
- Nunca use listas ou bullets nas respostas — parecem robóticas
- Demonstre empatia quando o lead expressar frustração

## Regras absolutas
- Nunca invente informações sobre imóveis
- Nunca prometa valores, prazos ou condições que não foram confirmados
- Se não souber algo, diga que vai verificar com o corretor
- Se o lead pedir para falar com humano, confirme que vai acionar o corretor

## Quando transferir para o corretor
Transfira imediatamente se:
- O lead pedir explicitamente para falar com humano
- O sentimento da conversa for negativo por mais de 2 mensagens
- A negociação envolver valores acima de R$1.000.000
- O lead mencionar problema jurídico ou documental
`
```

### Passo 3 — Estruture a chamada à API

```typescript
// ai-engine/claude.service.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function generateResponse(
  systemPrompt: string,
  conversationHistory: MessageParam[],
  clientId: string
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',        // padrão do projeto
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
```

### Passo 4 — Implemente extração estruturada

Para classificação e qualificação, use output estruturado:

```typescript
// Prompt que retorna JSON
const PROMPT_CLASSIFICAR_INTENCAO = `
Analise a mensagem abaixo e retorne um JSON com a intenção do lead.

Responda APENAS com JSON válido, sem texto adicional:
{
  "intent": "compra" | "aluguel" | "venda" | "informacao" | "desconhecido",
  "confidence": 0.0 a 1.0,
  "urgency": "alta" | "media" | "baixa"
}

Mensagem: {{MESSAGE}}
`

// Sempre validar o JSON retornado antes de usar
function parseIntentResponse(raw: string): IntentResult {
  try {
    return JSON.parse(raw) as IntentResult
  } catch {
    return { intent: 'desconhecido', confidence: 0, urgency: 'baixa' }
  }
}
```

### Passo 5 — Gerencie o histórico de conversa

O histórico de conversa é o contexto mais importante. Mantenha:

```typescript
// Estrutura do histórico
type MessageParam = {
  role: 'user' | 'assistant'
  content: string
}

// Limite para evitar janela de contexto cheia
const MAX_HISTORY_MESSAGES = 20 // últimas 20 mensagens

function buildConversationHistory(messages: Message[]): MessageParam[] {
  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map(m => ({ role: m.sender === 'lead' ? 'user' : 'assistant', content: m.content }))
}
```

### Passo 6 — Teste o prompt

Antes de subir, teste com pelo menos estes cenários:

1. **Lead objetivo**: "Quero alugar um apartamento no Fonseca, tenho urgência"
2. **Lead vago**: "oi, vi seu anúncio"
3. **Lead frustrado**: "já faz 3 dias que ninguém me responde"
4. **Lead fora do escopo**: "vocês vendem carros?"
5. **Pedido de humano**: "quero falar com um corretor de verdade"
6. **Mensagem incompleta**: "quanto custa"

### Passo 7 — Registre o prompt no CHANGELOG.md

Registre qual prompt foi criado ou modificado, o motivo e o resultado dos testes.

---

## Checklist de entrega

- [ ] Modelo correto para a tarefa (Haiku / Sonnet / Opus)
- [ ] System prompt separado do user prompt
- [ ] Prompt em português do Brasil
- [ ] Sem hardcode de API key — usando variável de ambiente
- [ ] Histórico de conversa limitado para não encher contexto
- [ ] JSON parseado com fallback seguro (sem crashar se retorno for inválido)
- [ ] Testado com os 6 cenários mínimos
- [ ] CHANGELOG.md atualizado

---

## Exemplo de abertura

> "Vou criar o prompt para [comportamento]. Antes de escrever, deixa eu confirmar: quando o agente estiver nesta situação, qual é a resposta ideal que você esperaria ver? Me dá um exemplo real que já aconteceu com um cliente."
