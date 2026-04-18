import { z } from 'zod'
import type { Request, Response } from 'express'
import { enqueueMessage } from './whatsapp.service'

// ---------------------------------------------------------------------------
// Schema Zod — valida o payload Z-API em runtime
// ---------------------------------------------------------------------------

const ZApiWebhookSchema = z.object({
  instanceId:    z.string().min(1),
  messageId:     z.string().min(1),
  phone:         z.string().min(1),
  fromMe:        z.boolean(),
  momment:       z.number(),
  status:        z.string(),
  chatName:      z.string().optional().default(''),
  senderName:    z.string().optional().default(''),
  senderPhoto:   z.string().optional(),
  isGroup:       z.boolean(),
  connectedPhone: z.string().optional().default(''),
  // Tipos de mensagem — apenas um presente por payload
  text:     z.object({ message: z.string() }).optional(),
  audio:    z.object({ audioUrl: z.string(), mimeType: z.string() }).optional(),
  image:    z.object({ imageUrl: z.string(), mimeType: z.string(), caption: z.string().optional() }).optional(),
  document: z.object({ documentUrl: z.string(), mimeType: z.string(), fileName: z.string().optional() }).optional(),
  location: z.object({ latitude: z.number(), longitude: z.number(), name: z.string().optional(), address: z.string().optional() }).optional(),
  sticker:  z.object({ stickerUrl: z.string() }).optional(),
})

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

  // 2. Validação do payload com Zod
  const parsed = ZApiWebhookSchema.safeParse(req.body)
  if (!parsed.success) {
    console.warn('[Webhook] Payload inválido:', parsed.error.flatten().fieldErrors)
    // Retorna 200 para Z-API não retentar com payload inválido
    res.status(200).json({ received: true, action: 'ignored_invalid_payload' })
    return
  }

  const payload = parsed.data

  // 3. Ignorar mensagens enviadas pelo próprio número
  if (payload.fromMe) {
    res.status(200).json({ received: true, action: 'ignored_from_me' })
    return
  }

  // 4. Ignorar eventos de status (leitura, entrega, etc.)
  if (IGNORED_STATUSES.includes(payload.status)) {
    res.status(200).json({ received: true, action: 'ignored_status_event' })
    return
  }

  // 5. Ignorar mensagens de grupos
  if (payload.isGroup) {
    res.status(200).json({ received: true, action: 'ignored_group' })
    return
  }

  // 6. tenantId vem do instanceId da Z-API (cada tenant tem sua instância)
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
