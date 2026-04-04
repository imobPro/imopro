# SKILL.md — integrar-zapi

## O que é esta skill

Esta skill configura e integra a Z-API para receber e enviar mensagens via WhatsApp no ImobPro. Cada imobiliária (tenant) tem sua própria instância Z-API — isolamento total entre clientes.

Use esta skill ao conectar um tenant novo ao WhatsApp ou ao construir/modificar o módulo de atendimento.

---

## Quando usar

- Ao criar o módulo `/whatsapp` pela primeira vez
- Ao conectar uma imobiliária nova ao sistema
- Ao adicionar suporte a um novo tipo de mensagem (áudio, imagem, documento)
- Ao debugar problemas de entrega ou recebimento de mensagens

---

## Regras obrigatórias — NUNCA violar

1. **Uma instância Z-API por tenant** — nunca compartilhar instâncias entre imobiliárias
2. **Credenciais Z-API sempre em variáveis de ambiente** — nunca hardcodar instance ID ou token
3. **Toda mensagem recebida deve ser enfileirada no BullMQ** — nunca processar direto no webhook
4. **Webhook deve responder em menos de 2 segundos** — processamento pesado vai para a fila
5. **Validar autenticidade do webhook** — verificar header de segurança da Z-API antes de processar
6. **Toda operação deve registrar `client_id`** — rastreabilidade por tenant

---

## Como executar

### Passo 1 — Configure as variáveis de ambiente

Para cada tenant, as seguintes variáveis são necessárias:

```env
# Armazenadas no banco por tenant, não no .env global
ZAPI_INSTANCE_ID=     # ID da instância Z-API do tenant
ZAPI_TOKEN=           # Token de segurança da instância
ZAPI_CLIENT_TOKEN=    # Client token da conta Z-API

# Webhook
ZAPI_WEBHOOK_SECRET=  # Secret para validar autenticidade do webhook
```

As credenciais por tenant devem ser armazenadas na tabela `tenants` no Supabase, **nunca** no arquivo `.env` global.

### Passo 2 — Configure o webhook no Z-API

No painel Z-API, configure o webhook apontando para:

```
POST https://[seu-dominio]/api/whatsapp/webhook/[client_id]
```

Eventos a ativar:
- `on-message-received` — mensagens recebidas
- `on-message-read` — confirmação de leitura
- `on-connected` — WhatsApp conectado
- `on-disconnected` — WhatsApp desconectado

### Passo 3 — Implemente o endpoint de webhook

```typescript
// whatsapp.routes.ts
router.post('/webhook/:clientId', validateWebhookSecret, async (req, res) => {
  // Responde imediatamente — processamento vai para a fila
  res.status(200).json({ received: true })

  // Enfileira para processamento assíncrono
  await messageQueue.add('process-message', {
    clientId: req.params.clientId,
    payload: req.body,
    receivedAt: new Date().toISOString()
  })
})
```

### Passo 4 — Implemente o middleware de validação

```typescript
// Valida que o webhook veio mesmo da Z-API
function validateWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-zapi-secret']
  if (secret !== process.env.ZAPI_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
```

### Passo 5 — Implemente o processador de mensagens

O worker do BullMQ deve:

1. Identificar o tipo de mensagem (texto, áudio, imagem, documento)
2. Buscar as credenciais do tenant pelo `client_id`
3. Persistir a mensagem no banco
4. Acionar o módulo de IA para gerar resposta
5. Enviar a resposta via Z-API

```typescript
// Tipos de mensagem suportados
type MessageType = 'text' | 'audio' | 'image' | 'document' | 'sticker'

// Para mensagens não suportadas (ex: áudio no MVP)
const UNSUPPORTED_RESPONSE = 'Olá! Por enquanto só consigo ler mensagens de texto. Pode me escrever?'
```

### Passo 6 — Implemente o envio de mensagens

```typescript
// whatsapp.service.ts
async function sendMessage(
  clientId: string,
  phone: string,
  message: string
): Promise<void> {
  const tenant = await getTenantCredentials(clientId)

  await fetch(`https://api.z-api.io/instances/${tenant.zapiInstanceId}/token/${tenant.zapiToken}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': tenant.zapiClientToken },
    body: JSON.stringify({ phone, message })
  })
}
```

### Passo 7 — Trate desconexões

O WhatsApp pode desconectar. Implemente:
- Listener para evento `on-disconnected`
- Registro do status de conexão no banco por tenant
- Alerta para o corretor quando o número desconectar
- Endpoint para verificar status de conexão: `GET /api/whatsapp/status/:clientId`

### Passo 8 — Teste a integração

Sequência de testes mínimos:
1. Enviar mensagem de texto para o número conectado → verificar se chegou no webhook
2. Verificar se a mensagem foi enfileirada no BullMQ
3. Verificar se a resposta foi enviada de volta
4. Testar com número desconectado → verificar se o alerta dispara

---

## Checklist de entrega

- [ ] Credenciais Z-API armazenadas por tenant no banco, não no `.env` global
- [ ] Webhook responde em menos de 2 segundos
- [ ] Middleware de validação de autenticidade ativo
- [ ] Toda mensagem enfileirada antes de processar
- [ ] Mensagens não suportadas respondem com mensagem amigável em português
- [ ] Desconexão do WhatsApp gera alerta para o corretor
- [ ] Logs registram `client_id` em toda operação
- [ ] CHANGELOG.md atualizado

---

## Exemplo de abertura

> "Vou configurar a integração Z-API para o módulo de WhatsApp. Antes de começar, confirma: já existe uma instância Z-API criada para este tenant, ou preciso orientar a criação também?"
