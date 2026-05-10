# Acordo de Operador de Dados (DPA) — ImobPro

**Última atualização:** 10/05/2026
**Vigência:** parte integrante do contrato de assinatura, válida enquanto durar o serviço
**Status:** versão inicial para piloto. Substituir por revisão de advogado antes de operação em escala.

---

## 1. Partes

**Controlador:** o Cliente (imobiliária ou corretor pessoa física) que contrata
o ImobPro e insere dados de leads na plataforma. Identificado no contrato de
assinatura.

**Operador:** Arthur Camargo Garcia, com sede em Niterói/RJ, contato
[arthurcg12@gmail.com](mailto:arthurcg12@gmail.com).

> Quando a operação for transferida para pessoa jurídica, este item será
> atualizado com o CNPJ correspondente.

---

## 2. Objeto

Este acordo regula o tratamento de dados pessoais de **leads, clientes finais
e prospects** da imobiliária Controladora, realizado pelo ImobPro como
Operador, em nome e por conta da Controladora, no contexto da prestação do
serviço descrito nos [Termos de Uso](./termos.md).

Está em conformidade com o art. 39 da Lei 13.709/2018 (LGPD).

---

## 3. Natureza, finalidade e duração

| Item | Detalhe |
|---|---|
| **Natureza do tratamento** | Coleta, armazenamento, classificação, análise por IA, transferência ao corretor humano, geração de relatórios. |
| **Finalidade** | Atendimento via WhatsApp, qualificação de leads, métricas comerciais para o Controlador. |
| **Duração** | Pelo prazo da assinatura, mais o prazo de retenção definido na seção 9. |

---

## 4. Categorias de titulares e tipos de dados

| Titular | Dados tratados |
|---|---|
| **Lead final / cliente da imobiliária** | Nome, telefone, mensagens enviadas (texto e áudio transcrito), perfil inferido (compra/aluguel/venda/visita), score, histórico de interação, sentimento agregado da conversa. |

**Não tratamos** dados sensíveis (origem racial, opinião política, saúde,
biometria) intencionalmente. Se um lead enviar espontaneamente esse tipo de
informação na conversa, ela será armazenada como parte do histórico mas não
processada para qualquer finalidade adicional.

---

## 5. Obrigações do Operador

O ImobPro compromete-se a:

1. Tratar os dados pessoais **apenas conforme as instruções documentadas** do
   Controlador, expressas neste acordo, nos Termos de Uso e nas configurações
   feitas no painel
2. Garantir que toda pessoa autorizada a tratar dados pessoais esteja sob
   **dever de confidencialidade**
3. Implementar e manter as **medidas técnicas e administrativas** descritas
   na seção 8
4. Auxiliar o Controlador no atendimento das **solicitações de titulares**
   (acesso, correção, exclusão, portabilidade)
5. Auxiliar o Controlador no cumprimento das obrigações dos arts. 46 a 51 da
   LGPD (segurança e boas práticas)
6. **Notificar o Controlador em até 48 horas** após tomar conhecimento de
   qualquer incidente de segurança que afete dados pessoais
7. **Excluir ou devolver** os dados pessoais ao fim da prestação do serviço,
   conforme a seção 9
8. Manter registros das operações de tratamento realizadas e disponibilizá-los
   ao Controlador mediante solicitação razoável

---

## 6. Sub-operadores

O Controlador autoriza o ImobPro a usar os seguintes sub-operadores para
prestar o serviço:

| Sub-operador | Finalidade | Localização |
|---|---|---|
| Supabase | Banco de dados, autenticação, storage | EUA / União Europeia |
| Anthropic (Claude API) | Geração das respostas do agente | EUA |
| OpenAI (Whisper) | Transcrição de áudio | EUA |
| Z-API | Recepção e envio de mensagens WhatsApp | Brasil |
| Railway | Hospedagem do backend | EUA |
| Vercel | Hospedagem do painel | Global (CDN) |
| Resend | Envio de e-mails transacionais | EUA |
| Sentry | Monitoramento de erros (quando ativado) | EUA |
| Stripe ou Asaas | Processamento de pagamento (quando ativado) | EUA / Brasil |

O ImobPro garante que cada sub-operador está obrigado contratualmente a
adotar nível de proteção equivalente ao deste acordo.

**Mudança de sub-operador:** o ImobPro pode substituir ou adicionar
sub-operadores mediante comunicação ao Controlador com 30 dias de
antecedência. O Controlador pode se opor com justificativa razoável; persistindo
o impasse, qualquer das partes pode rescindir o contrato sem multa.

---

## 7. Transferência internacional

Parte dos sub-operadores está fora do Brasil. A transferência se justifica
pelo art. 33, IX da LGPD (execução de contrato com o titular ou diligência
prévia para celebração) e/ou por cláusulas contratuais padrão equivalentes.

O ImobPro avalia continuamente alternativas de processamento exclusivamente
no Brasil para versões futuras.

---

## 8. Medidas de segurança

Medidas técnicas e administrativas adotadas:

- Conexões em **HTTPS/TLS** em todas as integrações
- **Isolamento por tenant** via Row Level Security (RLS) no banco — dados de
  uma imobiliária nunca são acessíveis a outra
- **Tokens e credenciais** armazenados em variáveis de ambiente, fora do
  repositório de código
- Senhas armazenadas com **hash** (Supabase Auth)
- Acesso à infraestrutura restrito por **autenticação de dois fatores**
- **Backups** automáticos diários com retenção de 7 dias (free tier) ou 30
  dias (planos pagos)
- **Auditoria de logs** de acesso e operação
- **Idempotência** por messageId no webhook de entrada (evita reprocessamento)
- **Cap defensivo** em chamadas à IA (limite de mensagens por contexto)

---

## 9. Devolução e exclusão dos dados

Ao fim do contrato:

1. O Controlador tem **30 dias** para exportar os dados via painel ou
   solicitar exportação assistida pelo ImobPro
2. Após o prazo de exportação, os dados são **excluídos definitivamente** do
   ambiente principal em até 15 dias
3. Cópias em **backup** são excluídas conforme o ciclo de retenção (até 30
   dias após o backup mais recente conter o dado)
4. O ImobPro emite **declaração formal de exclusão** mediante solicitação

Exceções: dados que o ImobPro precise reter por **obrigação legal**
(notas fiscais, ordens judiciais) permanecem armazenados pelo prazo legal,
isolados e sem uso para qualquer outra finalidade.

---

## 10. Auditoria

O Controlador pode auditar o cumprimento deste acordo até **uma vez por ano**,
mediante aviso prévio de 30 dias. A auditoria pode ser:

- Análise documental (políticas, registros, certificações dos
  sub-operadores), ou
- Questionário escrito respondido pelo Operador, ou
- Em casos de incidente comprovado, vistoria presencial nas instalações
  acessíveis (a infraestrutura de cloud não está sujeita a vistoria física)

Custos da auditoria correm por conta do Controlador, salvo se forem
constatadas violações relevantes deste acordo.

---

## 11. Responsabilidade

A responsabilidade do ImobPro como Operador limita-se aos atos e omissões
diretamente atribuíveis a ele, conforme o art. 42 da LGPD.

O Controlador é responsável por:

- Definir a base legal do tratamento perante os leads
- Manter sua própria política de privacidade voltada ao titular final
- Atender solicitações de titulares (com auxílio do Operador, conforme
  seção 5)
- Não usar a plataforma para tratamento incompatível com a LGPD ou com as
  políticas do WhatsApp Business

A limitação total de responsabilidade segue o disposto na seção 13 dos
[Termos de Uso](./termos.md).

---

## 12. Vigência e alterações

Este acordo entra em vigor com o aceite dos Termos de Uso e permanece
vigente enquanto durar a prestação do serviço, mais o prazo de retenção
descrito na seção 9.

Alterações relevantes seguem o mesmo procedimento da seção 15 dos Termos de
Uso (comunicação com 15 dias de antecedência, direito de cancelamento sem
multa).

---

## 13. Foro

Fica eleito o foro da Comarca de Niterói/RJ para dirimir qualquer
controvérsia decorrente deste acordo, salvo hipótese legal em contrário.
