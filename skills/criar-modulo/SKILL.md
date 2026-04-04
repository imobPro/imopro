# SKILL.md — criar-modulo

## O que é esta skill

Esta skill cria a estrutura completa de um módulo novo no ImobPro, seguindo as regras de arquitetura do CLAUDE.md e os padrões da stack definida.

Use esta skill sempre que um módulo novo precisar ser criado do zero — não para adicionar features a módulos existentes.

---

## Quando usar

- Ao iniciar um módulo listado no PLAN.md que ainda não tem código
- Após a skill `iniciar-sprint` ter sido executada e o plano aprovado
- Nunca antes da entrevista de negócio estar concluída

---

## Regras obrigatórias — NUNCA violar

1. **Todo módulo deve ter `client_id` em todas as queries** — isolamento de tenant é inegociável
2. **Controller nunca tem lógica de negócio** — recebe request, chama service, retorna response
3. **Módulos são independentes entre si** — sem imports diretos entre módulos
4. **Toda credencial via variável de ambiente** — nunca hardcodar tokens ou chaves
5. **TypeScript strict mode** — sem `any`, sempre tipar retornos
6. **Testes obrigatórios para funções críticas** — qualificação, sentimento, relatório

---

## Como executar

### Passo 1 — Confirme o módulo e suas responsabilidades

Leia o PRD.md e identifique o módulo que será criado. Confirme:
- Qual é o nome do módulo (ex: `leads`, `sentiment`, `reports`)
- Quais são as entidades principais (ex: Lead, Conversation, Report)
- Quais operações o módulo expõe (ex: criar, listar, atualizar, deletar)

### Passo 2 — Crie a estrutura de pastas

Crie a seguinte estrutura dentro de `src/modules/[nome-do-modulo]/`:

```
/[nome-do-modulo]/
  index.ts              ← exporta o router Express do módulo
  [modulo].routes.ts    ← define as rotas e chama os controllers
  [modulo].controller.ts ← recebe request, chama service, retorna response
  [modulo].service.ts   ← lógica de negócio do módulo
  [modulo].types.ts     ← tipos e interfaces TypeScript do módulo
  [modulo].test.ts      ← testes das funções críticas
```

### Passo 3 — Implemente o controller

O controller deve seguir este padrão:

```typescript
// Correto — controller só orquestra
export async function createLead(req: Request, res: Response): Promise<void> {
  const result = await leadService.create(req.body, req.clientId)
  res.status(201).json(result)
}

// ERRADO — nunca colocar lógica aqui
export async function createLead(req: Request, res: Response): Promise<void> {
  const score = calcularScore(req.body) // ← isso vai no service
  // ...
}
```

### Passo 4 — Implemente o service

O service deve:
- Receber `client_id` em todas as funções que acessam o banco
- Nunca fazer chamadas HTTP diretamente — usar adapters em `src/shared/`
- Validar os dados de entrada antes de persistir
- Retornar tipos bem definidos — nunca `any`

```typescript
// Padrão de função no service
async function create(data: CreateLeadInput, clientId: string): Promise<Lead> {
  // Validação
  // Lógica de negócio
  // Persistência com client_id
  // Retorno tipado
}
```

### Passo 5 — Defina os tipos

No arquivo `[modulo].types.ts`, defina:
- O tipo principal da entidade (ex: `Lead`, `Conversation`)
- Os tipos de input para criação e atualização
- Os tipos de resposta da API
- Enums para status e classificações

### Passo 6 — Configure as rotas

No arquivo `[modulo].routes.ts`:
- Use o Router do Express
- Aplique middleware de autenticação em todas as rotas
- Aplique middleware de validação de `client_id`
- Documente cada rota com comentário de uma linha

### Passo 7 — Escreva os testes mínimos

Escreva testes para as funções críticas de negócio. Para cada função crítica:
- Teste o caminho feliz
- Teste pelo menos um caso de erro
- Teste o isolamento por `client_id`

### Passo 8 — Registre o módulo

- Importe e registre o router do módulo no arquivo principal do Express
- Atualize o `.env.example` se o módulo precisar de novas variáveis
- Registre a criação no CHANGELOG.md

---

## Estrutura de módulo esperada

```typescript
// [modulo].types.ts
export interface Lead {
  id: string
  clientId: string
  name: string
  phone: string
  status: LeadStatus
  createdAt: Date
}

export type LeadStatus = 'novo' | 'em_conversa' | 'qualificado' | 'transferido' | 'perdido'

export interface CreateLeadInput {
  name: string
  phone: string
  clientId: string
}
```

---

## Checklist de entrega

Antes de considerar o módulo criado, confirme:

- [ ] Pasta criada em `src/modules/[nome]/`
- [ ] Arquivos: routes, controller, service, types, test
- [ ] Nenhum `any` no código
- [ ] `client_id` presente em todas as queries
- [ ] Controller sem lógica de negócio
- [ ] Testes escritos para funções críticas
- [ ] Módulo registrado no Express
- [ ] CHANGELOG.md atualizado

---

## Exemplo de abertura

> "Vou criar o módulo de [nome]. Antes de escrever código, deixa eu confirmar a estrutura com você: este módulo terá as operações [lista]. As entidades principais são [lista]. Está correto?"
