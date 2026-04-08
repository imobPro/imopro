# /revisar-modulo

Comando de revisão completa de um módulo antes de marcar como concluído.
Implementa o Feedback Loop — o Claude Code testa, detecta problemas e corrige sozinho.

## O que este comando faz

Analisa o módulo indicado em 5 dimensões, roda os testes automaticamente, corrige o que encontrar e só apresenta o resultado quando tudo estiver passando.

---

## Como usar

```
/revisar-modulo [nome do módulo]
```

Exemplo: `/revisar-modulo leads`

---

## Passos de execução — Feedback Loop

### Passo 1 — Localizar o módulo

Navegar até `src/modules/[nome]/` e listar todos os arquivos.

### Passo 2 — Rodar os testes do módulo

```bash
npm run test -- --testPathPattern=[nome]
```

Se testes falharem:
1. Ler a mensagem de erro completa
2. Identificar a causa raiz
3. Corrigir o código
4. Rodar os testes novamente
5. Repetir até todos os testes passarem

**Nunca apresentar o módulo como concluído com testes falhando.**

### Passo 3 — Revisar segurança

Verificar no código do módulo:

- [ ] Toda query tem `client_id` — sem exceção
- [ ] Nenhuma credencial hardcodada
- [ ] Webhook validando token de autenticação (se aplicável)
- [ ] Dados de entrada validados com Zod
- [ ] Rate limiting configurado nas rotas públicas

Se encontrar problema: corrigir imediatamente e re-rodar os testes.

### Passo 4 — Revisar arquitetura

- [ ] Controller sem lógica de negócio
- [ ] Lógica de negócio no service
- [ ] Types definidos para todos os retornos
- [ ] Nenhum `any` no TypeScript
- [ ] Módulo independente — sem imports diretos de outros módulos

Se encontrar problema: corrigir e re-rodar os testes.

### Passo 5 — Revisar qualidade do código

Para cada função crítica de negócio:
- Existe teste unitário?
- O teste cobre o caminho feliz E os casos de erro?
- A função tem retorno tipado?

Se faltar teste: criar o teste, rodar, confirmar que passa.

### Passo 6 — Verificar elegância

Para cada trecho de código:
- Existe uma forma mais simples de fazer isso?
- O código está repetido em algum lugar que poderia ser centralizado?
- O nome das funções e variáveis é claro sem precisar de comentário?

Se encontrar algo a melhorar: refatorar e re-rodar os testes.

### Passo 7 — Rodar cobertura de testes

```bash
npm run test -- --coverage --testPathPattern=[nome]
```

Meta mínima: 70% de cobertura nas funções críticas de negócio.

### Passo 8 — Apresentar relatório de revisão

Só apresentar o relatório após todos os itens acima estarem aprovados.

```
## Revisão do módulo: [nome]

### Testes
- X testes passando
- Cobertura: X%

### Segurança
- ✅ client_id em todas as queries
- ✅ Validação de dados de entrada
- [outros itens]

### Arquitetura
- ✅ Controller sem lógica de negócio
- [outros itens]

### Problemas encontrados e corrigidos
- [lista do que foi corrigido automaticamente]

### Pendências para o dono do projeto decidir
- [apenas decisões de produto/negócio que precisam de input humano]

### Conclusão
✅ Módulo aprovado para commit
```

---

## Regra do Feedback Loop

Se em qualquer passo encontrar um problema:
1. Corrigir imediatamente sem pedir orientação
2. Re-rodar os testes para confirmar a correção
3. Só avançar para o próximo passo após confirmação
4. Se o problema envolver decisão de negócio, usar AskUserQuestion Tool

O módulo só é considerado concluído quando todos os passos estiverem verdes.
