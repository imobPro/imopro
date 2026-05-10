# Política de Privacidade — ImobPro

**Última atualização:** 10/05/2026
**Vigência:** a partir da publicação desta versão
**Status:** versão inicial para piloto. Substituir por revisão de advogado antes de operação em escala.

---

## 1. Quem somos

O **ImobPro** é uma plataforma de software como serviço (SaaS) que atende
imobiliárias e corretores via WhatsApp com inteligência artificial.

**Controlador dos dados desta política:** Arthur Camargo Garcia, CPF a confirmar,
com sede em Niterói/RJ, contato via e-mail [arthurcg12@gmail.com](mailto:arthurcg12@gmail.com).

> Quando a operação for transferida para pessoa jurídica, este item será
> atualizado com o CNPJ correspondente.

**Encarregado pelo Tratamento de Dados Pessoais (DPO):** Arthur Camargo Garcia
— mesmo contato acima até nomeação formal.

---

## 2. A quem esta política se aplica

Esta política descreve como o ImobPro trata dados pessoais de:

- **Clientes-corretores e clientes-imobiliárias** que assinam a plataforma
- **Visitantes** do site institucional do ImobPro

> **Importante — leads finais (consumidores que falam pelo WhatsApp):**
> O ImobPro atua como **operador** dos dados dos leads, em nome da imobiliária
> que contrata o serviço. A imobiliária é a **controladora** desses dados e
> deve manter sua própria política de privacidade voltada ao lead final.
> Veja a seção 9 e o documento `Acordo de Operador (DPA)` para os detalhes.

---

## 3. Quais dados coletamos do cliente-corretor

| Categoria | Dado | Origem |
|---|---|---|
| Cadastro | Nome, e-mail, telefone, nome da imobiliária | Formulário de cadastro |
| Autenticação | Senha (armazenada com hash pelo Supabase Auth) | Formulário de cadastro |
| Operação | Configuração do agente (nome, mensagem de boas-vindas, horário) | Painel `/configuracoes` |
| Operação | Telefone de handoff (para receber transferências do agente) | Painel `/configuracoes` |
| Faturamento | Dados de pagamento (quando a cobrança automática entrar em produção) | Stripe ou Asaas — o ImobPro não armazena número completo de cartão |
| Suporte | E-mails e mensagens trocadas com o suporte | Iniciado pelo próprio usuário |

---

## 4. Como usamos os dados do cliente-corretor

| Finalidade | Base legal LGPD (art. 7º) |
|---|---|
| Executar o contrato (rodar a plataforma, atender pelo WhatsApp, gerar relatórios) | Execução de contrato — inciso V |
| Cobrança recorrente | Execução de contrato — inciso V |
| Suporte técnico, comunicação operacional | Execução de contrato — inciso V |
| Métricas internas de uso para melhorar o produto | Legítimo interesse — inciso IX |
| Cumprir obrigações legais (notas fiscais, ordens judiciais) | Cumprimento de obrigação legal — inciso II |
| Envio de comunicações promocionais | Consentimento — inciso I (com opt-out fácil) |

Não tratamos dados pessoais para finalidades incompatíveis com as listadas
acima sem comunicação prévia.

---

## 5. Com quem compartilhamos dados (sub-operadores)

O ImobPro depende dos seguintes prestadores de serviço para funcionar.
Todos são sub-operadores e estão obrigados contratualmente a tratar os dados
apenas para as finalidades da plataforma.

| Sub-operador | Finalidade | Localização do tratamento |
|---|---|---|
| Supabase | Banco de dados, autenticação, storage | EUA / União Europeia |
| Anthropic (Claude API) | Geração das respostas do agente | EUA |
| OpenAI (Whisper) | Transcrição de áudio recebido pelo lead | EUA |
| Z-API | Recepção e envio de mensagens WhatsApp | Brasil |
| Railway | Hospedagem do backend | EUA |
| Vercel | Hospedagem do painel web | Global (CDN) |
| Resend | Envio de e-mails transacionais (relatórios) | EUA |
| Stripe ou Asaas | Processamento de pagamento (quando ativado) | EUA / Brasil |
| Sentry | Monitoramento de erros (quando ativado) | EUA |

**Transferência internacional:** parte dos sub-operadores está fora do Brasil.
A LGPD permite a transferência (art. 33, IX) por execução de contrato com o
titular ou cláusulas contratuais padrão. Continuamos avaliando opções de
processamento exclusivamente no Brasil para versões futuras da plataforma.

Não vendemos, alugamos ou cedemos dados pessoais para terceiros não listados
acima.

---

## 6. Por quanto tempo guardamos os dados

| Dado | Prazo |
|---|---|
| Cadastro do cliente-corretor | Enquanto a conta estiver ativa + 5 anos após o cancelamento (prazo prescricional do CDC) |
| Conversas, leads e mensagens (dados do operador) | Pelo prazo definido pela imobiliária controladora; padrão 24 meses |
| Logs técnicos e de auditoria | 12 meses |
| Notas fiscais e dados de pagamento | 5 anos (obrigação fiscal) |
| Backups | Até 30 dias após exclusão do dado original |

Após o prazo, os dados são excluídos ou anonimizados de forma irreversível.

---

## 7. Direitos do titular

Como titular dos dados pessoais, você pode, a qualquer momento e sem custo,
solicitar:

- Confirmação da existência de tratamento
- Acesso aos dados
- Correção de dados incompletos, inexatos ou desatualizados
- Anonimização, bloqueio ou eliminação de dados desnecessários
- Portabilidade
- Eliminação dos dados tratados com base em consentimento
- Informação sobre as entidades com quem compartilhamos os dados
- Revogação do consentimento, quando aplicável

**Como exercer:** envie e-mail para [arthurcg12@gmail.com](mailto:arthurcg12@gmail.com)
com o assunto "LGPD — solicitação de titular". Respondemos em até 15 dias.

---

## 8. Segurança da informação

Adotamos as seguintes medidas técnicas e administrativas:

- Conexões em HTTPS/TLS
- Senhas armazenadas com hash (Supabase Auth)
- Isolamento por tenant via Row Level Security (RLS) no banco
- Tokens de API armazenados em variáveis de ambiente, fora do repositório
- Acesso à infraestrutura restrito por autenticação de dois fatores
- Auditoria de logs de acesso

Nenhum sistema é 100% imune a incidentes. Em caso de violação que possa gerar
risco relevante aos titulares, comunicamos a ANPD e os titulares afetados nos
prazos legais (art. 48 da LGPD).

---

## 9. Tratamento de dados de leads (papel de operador)

Quando uma imobiliária assina o ImobPro, ela usa a plataforma para conversar
com seus próprios leads pelo WhatsApp. O ImobPro **não é controlador** desses
dados — é **operador**, processando em nome e por conta da imobiliária.

A imobiliária é responsável por:

- Manter sua própria política de privacidade voltada ao lead
- Definir a base legal do tratamento (geralmente legítimo interesse para
  prospecção comercial e execução de contrato após qualificação)
- Atender solicitações de titulares dos leads
- Decidir prazos de retenção dentro dos limites da plataforma

O ImobPro se compromete a:

- Tratar os dados apenas conforme as instruções do controlador
- Garantir confidencialidade
- Notificar o controlador de qualquer incidente em até 48 horas
- Excluir ou devolver os dados ao fim do contrato

Os termos detalhados estão no `Acordo de Operador (DPA)` que faz parte do
contrato de assinatura.

---

## 10. Uso de cookies e rastreamento no painel web

O painel `app.imobpro.com.br` (a definir) usa apenas cookies estritamente
necessários:

- Cookie de sessão do Supabase Auth
- Preferência de tema escuro/claro

Não utilizamos cookies de marketing, analytics de terceiros ou pixels de
rastreamento na versão atual. Caso isso mude, esta política será atualizada
com 15 dias de antecedência.

---

## 11. Crianças e adolescentes

O ImobPro é um produto B2B destinado a profissionais maiores de 18 anos. Não
coletamos intencionalmente dados de crianças ou adolescentes. Se você
identificar tratamento indevido, entre em contato pelo canal da seção 7.

---

## 12. Alterações desta política

Podemos atualizar esta política a qualquer momento. Em caso de mudança
relevante, notificamos os clientes ativos por e-mail com pelo menos 15 dias de
antecedência. A data de "Última atualização" no topo indica a versão vigente.

---

## 13. Foro e legislação aplicável

Esta política é regida pelas leis brasileiras, em especial pela
Lei 13.709/2018 (LGPD), Marco Civil da Internet (Lei 12.965/2014) e Código
de Defesa do Consumidor (Lei 8.078/1990).

Fica eleito o foro da Comarca de Niterói/RJ para dirimir qualquer controvérsia
decorrente desta política, salvo hipótese legal em contrário.
