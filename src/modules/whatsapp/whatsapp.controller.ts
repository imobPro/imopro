import type { Request, Response } from 'express'
import { enqueueMessage } from './whatsapp.service'
import type { ZApiWebhookPayload } from './whatsapp.types'

// Eventos Z-API que não são mensagens de usuário — ignorar silenciosamente
const IGNORED_STATUSES = ['DELIVERY_ACK', 'READ', 'PLAYED', 'DELETED', 'PENDING', 'SERVER_ACK']

export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  // 1. Validação de token
  const clientToken = req.headers['client-token']
  const expectedToken = process.env.ZAPI_CLIENT_TOKEN

  if (!expectedToken || clientToken !== expectedToken) {
    res.status(401).json({ error: 'Token inválido' })
    return
  }

  const payload = req.body as ZApiWebhookPayload

  // 2. Ignorar mensagens enviadas pelo próprio número
  if (payload.fromMe === true) {
    res.status(200).json({ received: true, action: 'ignored_from_me' })
    return
  }

  // 3. Ignorar eventos de status (leitura, entrega, etc.)
  if (IGNORED_STATUSES.includes(payload.status)) {
    res.status(200).json({ received: true, action: 'ignored_status_event' })
    return
  }

  // 4. Ignorar mensagens de grupos
  if (payload.isGroup) {
    res.status(200).json({ received: true, action: 'ignored_group' })
    return
  }

  // 5. tenantId vem do instanceId da Z-API (cada tenant tem sua instância)
  // Sprint 5 vai buscar o tenantId via JWT — por ora usa o instanceId direto
  const tenantId = payload.instanceId

  try {
    await enqueueMessage(payload, tenantId)
    res.status(200).json({ received: true, action: 'queued' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[Webhook] Falha ao enfileirar mensagem:', message)
    // Retorna 200 para Z-API não retentar — o retry está na fila BullMQ
    res.status(200).json({ received: true, action: 'queue_error', error: message })
  }
}

export function webhookHealth(_req: Request, res: Response): void {
  res.json({ status: 'ok', module: 'whatsapp', timestamp: new Date().toISOString() })
}
