# SKILL.md — melhorar-skills

## O que é esta skill

Esta é uma meta-skill. Ela não constrói funcionalidades do produto — ela avalia e melhora as próprias skills do projeto.

Use esta skill quando perceber que uma skill existente está gerando resultados inconsistentes, incompletos ou diferentes do esperado.

---

## Quando usar

- Após usar uma skill e perceber que o resultado ficou diferente do esperado
- Quando o Claude Code tomou decisões diferentes em duas execuções da mesma skill
- Quando uma skill não cobriu um caso de borda que apareceu na prática
- Periodicamente — a cada 2 ou 3 sprints — para revisar todas as skills de uma vez
- Quando o projeto evoluir e uma skill antiga não refletir mais a realidade

---

## Como executar

### Passo 1 — Identifique a skill a ser avaliada

Informe qual skill será avaliada. Se for uma revisão geral, liste todas.

### Passo 2 — Leia a skill atual

Leia o arquivo `SKILL.md` da skill indicada na íntegra antes de qualquer avaliação.

### Passo 3 — Avalie com base nos critérios abaixo

Analise a skill respondendo cada pergunta:

**Clareza**
- As instruções são claras o suficiente para não gerar interpretações diferentes?
- Existe algum passo ambíguo que pode ser feito de formas diferentes?
- As regras do tipo "NUNCA faça X" estão explícitas?

**Completude**
- A skill cobre o caminho feliz — quando tudo funciona como esperado?
- A skill cobre casos de erro — o que fazer quando algo dá errado?
- Existe alguma situação real que já aconteceu no projeto e não está coberta?

**Consistência com o projeto**
- A skill ainda está alinhada com o CLAUDE.md?
- As tecnologias e padrões mencionados ainda são os usados no projeto?
- Existe alguma decisão tomada em sprint recente que contradiz a skill?

**Exemplos**
- A skill tem pelo menos um exemplo concreto de uso?
- Os exemplos refletem situações reais do ImobPro?
- Falta algum exemplo de caso de borda?

**Tamanho e foco**
- A skill está tentando fazer coisas demais em um só arquivo?
- Se sim, vale dividir em duas skills menores e mais focadas?

### Passo 4 — Apresente o diagnóstico

Antes de alterar qualquer coisa, apresente:

- O que está funcionando bem na skill
- O que está causando inconsistência ou problema
- O que você propõe adicionar, remover ou reescrever
- Se necessário, se a skill deve ser dividida em duas

### Passo 5 — Aguarde aprovação

Não altere a skill antes de o dono do projeto confirmar as mudanças propostas.

### Passo 6 — Atualize a skill

Após aprovação, reescreva as partes indicadas mantendo o que estava funcionando.

### Passo 7 — Registre a melhoria

Ao final, peça para registrar no CHANGELOG.md o que foi melhorado e por quê.

---

## Regras desta skill

- **Nunca reescrever uma skill inteira sem aprovação** — sempre apresentar o diagnóstico primeiro
- **Preservar o que funciona** — o objetivo é melhorar, não substituir tudo
- **Manter o foco no ImobPro** — exemplos e casos de borda devem ser do contexto imobiliário
- **Perguntas de negócio ao dono** — se a melhoria depende de uma decisão de produto, usar AskUserQuestion Tool antes de propor

---

## Exemplo de abertura

> "Vou avaliar a skill `[nome da skill]`. Deixa eu ler o arquivo atual antes de te apresentar o diagnóstico."

Após ler:

> "Encontrei 3 pontos que podem ser melhorados: [lista]. Posso propor as alterações específicas antes de mudar qualquer coisa?"
