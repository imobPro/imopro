# SKILL.md — iniciar-sprint

## O que é esta skill

Esta skill deve ser executada **obrigatoriamente antes de construir qualquer módulo ou feature nova** do ImobPro.

Ela conduz uma entrevista de negócio com o dono do projeto para alinhar comportamentos, regras e casos de borda antes de escrever uma linha de código.

---

## Quando usar

- Antes de iniciar qualquer sprint do PLAN.md
- Antes de construir um módulo que ainda não existe
- Antes de adicionar uma feature significativa a um módulo existente
- Sempre que houver dúvida sobre como o sistema deve se comportar

---

## Regras da entrevista — CRÍTICO

O dono do projeto tem domínio do negócio imobiliário mas está aprendendo programação com IA.

**FAÇA perguntas sobre:**
- Como o sistema deve se comportar em situações específicas
- O que acontece quando algo dá errado (casos de borda)
- Decisões de produto — o que o cliente vê, o que o corretor recebe
- Regras de negócio — quando transferir, quando alertar, quando ignorar
- Prioridades — o que é essencial agora vs o que pode vir depois

**NUNCA pergunte sobre:**
- Implementação técnica interna (indexação, padrões de código, estrutura de dados)
- Escolhas de biblioteca ou framework
- Detalhes de infraestrutura
- Qualquer coisa que o próprio Claude Code pode decidir sozinho

---

## Como executar

### Passo 1 — Identifique o módulo

Leia o PLAN.md e identifique qual sprint ou módulo será construído nesta sessão.

### Passo 2 — Conduza a entrevista

Use o AskUserQuestion Tool para entrevistar o dono do projeto.

Faça as perguntas **uma de cada vez**, em português, de forma clara e simples.
Espere a resposta antes de fazer a próxima pergunta.
Não faça mais de uma pergunta por vez.

### Passo 3 — Perguntas base por tipo de módulo

Use as perguntas abaixo como ponto de partida. Adapte conforme o módulo.

**Para qualquer módulo:**
- O que este módulo deve fazer do ponto de vista do corretor/cliente?
- O que acontece quando algo dá errado? O usuário deve ser avisado?
- Existe alguma regra de negócio específica que não está documentada?
- Tem alguma situação que você já viveu com clientes que precisa ser tratada?

**Módulo WhatsApp / atendimento:**
- O agente deve responder mensagens fora do horário comercial?
- O que acontece se o lead mandar áudio ou imagem?
- Em que momento o agente deve transferir para o corretor humano?
- O que acontece se o corretor não responder após a transferência?
- O lead pode pedir para falar com humano a qualquer momento?

**Módulo leads / CRM:**
- Quais informações são obrigatórias coletar de um lead?
- Como o corretor quer visualizar os leads — por urgência, por data, por bairro?
- O que define um lead como "qualificado" para este negócio?
- O corretor precisa ser notificado quando chega um lead novo? Como?

**Módulo sentimento:**
- Quando o sentimento for negativo, o que deve acontecer?
- O corretor precisa ver o sentimento no painel ou só em alertas?
- Existe algum tipo de mensagem que sempre indica urgência?

**Módulo relatórios:**
- O relatório deve ser enviado por e-mail, disponível no painel, ou os dois?
- Quais métricas são mais importantes para o corretor ver primeiro?
- O corretor precisa de relatório semanal ou só mensal?

**Módulo painel / dashboard:**
- O que o corretor quer ver assim que faz login?
- Existe alguma ação que o corretor faz todos os dias que precisa estar fácil?
- O painel precisa funcionar bem no celular?

### Passo 4 — Consolide as respostas

Após a entrevista, apresente um resumo das decisões tomadas e confirme com o dono do projeto antes de seguir.

### Passo 5 — Inicie o plan mode

Somente após confirmação do resumo, entre em plan mode e proponha o plano de implementação.

---

## Exemplo de abertura da entrevista

> "Antes de começarmos a construir o módulo de [nome], preciso entender melhor como ele deve funcionar. Vou te fazer algumas perguntas sobre o comportamento esperado — são perguntas de negócio, não técnicas, então responda com base na sua experiência e no que seus clientes precisam. Pode ser?"
