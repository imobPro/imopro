# /commit-sprint

Comando para fechar uma sprint com qualidade. Executa verificação, commit completo e push para o GitHub.

## O que este comando faz

1. Verifica o status do projeto
2. Roda os testes disponíveis
3. Confere o checklist de segurança básico
4. Faz o commit com mensagem descritiva
5. Faz o push para o GitHub
6. Atualiza o CHANGELOG.md

---

## Passos de execução

### Passo 1 — Verificar status

```bash
git status
git diff --stat
```

Liste os arquivos modificados e mostre um resumo do que foi alterado nesta sprint.

### Passo 2 — Rodar testes

Se existir script de teste configurado no `package.json`:

```bash
npm run test
```

Se algum teste falhar, **parar imediatamente** e corrigir antes de continuar.
Nunca fazer commit com testes falhando.

### Passo 3 — Checklist pré-commit

Verificar cada item antes de prosseguir:

- [ ] Nenhum arquivo `.env` sendo commitado
- [ ] Nenhuma API key ou token hardcodado no código
- [ ] Nenhum `console.log` com dados sensíveis
- [ ] Todos os testes passando
- [ ] Nenhum `any` no TypeScript (verificar com `grep -r ": any" src/`)

Se algum item falhar, corrigir antes de continuar.

### Passo 4 — Commit com mensagem descritiva

Gerar mensagem de commit em português descrevendo o que foi feito nesta sprint.
Seguir o padrão:

```
[Sprint X] Tipo: descrição clara do que foi implementado

- Item 1 implementado
- Item 2 adicionado
- Item 3 corrigido
```

```bash
git add .
git commit -m "mensagem gerada acima"
```

### Passo 5 — Push para o GitHub

```bash
git push
```

### Passo 6 — Atualizar CHANGELOG.md

Adicionar entrada no `CHANGELOG.md` com:
- Data da sessão
- Sprint concluída
- O que foi implementado
- Arquivos principais criados ou modificados
- Pendências para próxima sessão

### Passo 7 — Atualizar PLAN.md

Marcar as tarefas concluídas nesta sprint com `✅ [data]` no `PLAN.md`.

---

## Mensagem de conclusão

Ao final, apresentar resumo:

```
✅ Sprint commitada com sucesso

Commit: [hash curto]
Branch: [nome da branch]
Testes: X passando
Arquivos: X modificados

CHANGELOG.md atualizado
PLAN.md atualizado

Próximo passo: [primeira tarefa pendente do PLAN.md]
```
