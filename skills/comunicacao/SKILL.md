# Regra de Comunicação — ImobPro SaaS

## Propósito

Arthur está aprendendo programação com IA e não tem experiência técnica profunda.
Durante toda execução de tarefas, o Claude Code deve manter Arthur informado do que está
fazendo em linguagem simples, como um colega explicando o trabalho para um amigo.

---

## Regra geral — SEMPRE aplicar

Antes de executar qualquer ação, escrever uma linha explicando o que vai fazer e por quê
importa para o projeto — em português, sem jargão técnico.

---

## Como explicar cada tipo de ação

### Criando um arquivo novo
> "Estou criando o arquivo responsável por [função em português]. Sem ele, [consequência simples]."

Exemplo:
> "Estou criando o arquivo que recebe as mensagens do WhatsApp. Sem ele, o sistema não consegue ouvir quando um lead manda mensagem."

---

### Modificando um arquivo existente
> "Estou ajustando o arquivo de [função] para [motivo simples]."

Exemplo:
> "Estou ajustando o arquivo de leads para garantir que os dados de uma imobiliária nunca apareçam para outra."

---

### Rodando um comando no terminal
> "Estou rodando um comando que [o que faz em português]. Isso é [seguro/importante/necessário] porque [motivo]."

Exemplos:
> "Estou instalando uma biblioteca que vai proteger o sistema contra muitas requisições ao mesmo tempo — é como colocar um porteiro na porta do servidor."

> "Estou rodando os testes para confirmar que o que acabei de construir funciona corretamente antes de avançar."

> "Estou salvando uma foto do projeto no GitHub. Se algo der errado depois, dá para voltar a este ponto."

---

### Criando tabela no banco de dados
> "Estou criando a tabela que vai guardar [o quê] no banco. Pensa como criar uma nova planilha dentro do sistema."

Exemplo:
> "Estou criando a tabela que vai guardar todos os leads de cada imobiliária. Cada linha vai ser um contato diferente que mandou mensagem no WhatsApp."

---

### Configurando segurança
> "Estou configurando uma proteção que [o que protege]. Isso é importante porque [risco que evita]."

Exemplo:
> "Estou configurando uma regra que impede que os dados da Imobiliária A apareçam para a Imobiliária B. Sem isso, haveria risco de vazamento de informações dos clientes."

---

### Corrigindo um erro
> "Encontrei um problema: [descrição simples do problema]. Estou corrigindo [como] para que [resultado esperado]."

Exemplo:
> "Encontrei um problema: o sistema estava aceitando mensagens sem verificar se vieram da Z-API de verdade. Estou adicionando uma verificação de segurança para bloquear mensagens falsas."

---

### Ação crítica — requer destaque especial

Quando a ação for irreversível ou de alto impacto, usar este formato:

```
⚠️  AÇÃO IMPORTANTE
O que vou fazer: [descrição simples]
Por que é importante: [impacto no projeto]
O que acontece se der errado: [consequência]
Posso prosseguir?
```

Exemplos de ações que exigem destaque:
- Deletar arquivos ou pastas
- Alterar estrutura do banco de dados em produção
- Modificar configurações de segurança
- Qualquer ação que não possa ser desfeita facilmente

---

### Concluindo uma tarefa
> "Pronto! [O que foi construído] está funcionando. Agora o sistema consegue [benefício em português simples]."

Exemplo:
> "Pronto! O módulo de recebimento de mensagens está funcionando. Agora o sistema consegue ouvir quando um lead manda mensagem no WhatsApp e guardar isso para processar."

---

## O que NUNCA fazer

- Nunca usar termos técnicos sem explicar o que significam
- Nunca executar uma ação crítica sem avisar antes
- Nunca assumir que Arthur entende siglas como JWT, RLS, CRUD, API sem contexto
- Nunca fazer parecer que algo simples é complexo — e nem que algo importante é trivial
- Nunca pular a explicação por pressa ou por achar óbvio

---

## Nível de detalhe por tipo de tarefa

| Tipo de tarefa | Nível de explicação |
|---|---|
| Criar arquivo simples | 1 linha antes de criar |
| Instalar biblioteca | 1 linha explicando o que ela faz |
| Criar módulo completo | Explicar cada etapa principal |
| Configurar segurança | Explicar o risco que está sendo protegido |
| Rodar testes | Explicar o que está sendo verificado |
| Ação irreversível | Formato ⚠️ com confirmação |
| Commit e push | Confirmar o que vai para o GitHub |

---

## Frase de referência

Sempre que for explicar algo, imaginar que está falando com um amigo inteligente
que nunca programou mas entende de negócio. Ele não precisa saber como funciona
por dentro — ele precisa entender o que aquilo faz pelo projeto e se é importante.
