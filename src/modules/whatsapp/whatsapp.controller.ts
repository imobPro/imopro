import { z } from 'zod'
import type { Request, Response } from 'express'
import { enqueueMessage, markMessageSeen, resolveTenantByInstance } from './whatsapp.service'
import { isSafeExternalUrl, safeUrlHost } from '../../shared/utils/safe-url'

// Refinement compartilhado para URLs de mídia (audioUrl, imageUrl, documentUrl,
// stickerUrl). Se a URL falhar validação (scheme != https, hostname privado,
// fora da allowlist), o Zod devolve undefined via .catch() em vez de invalidar
// o payload inteiro — assim uma imagem com caption ainda entra como texto e
// mídia bloqueada é silenciosamente descartada + logada. O worker já filtra
// mensagens sem text nem mediaUrl. Nunca retornamos 400: Z-API iria retentar
// e a URL maliciosa continuaria chegando.
const safeMediaUrl = z
  .string()
  .refine((value) => isSafeExternalUrl(value).ok, {
    message: 'URL de mídia insegura ou hostname bloqueado',
  })
  .optional()
  .catch((ctx) => {
    const raw = ctx.value
    if (typeof raw === 'string' && raw.length > 0) {
      const check = isSafeExternalUrl(raw)
      const reason = check.ok ? 'unknown' : check.reason
      console.warn(`[Webhook] URL de mídia rejeitada | host=${safeUrlHost(raw)} reason=${reason}`)
    }
    return undefined
  })

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
  audio:    z.object({ audioUrl: safeMediaUrl, mimeType: z.string() }).optional(),
  image:    z.object({ imageUrl: safeMediaUrl, mimeType: z.string(), caption: z.string().optional() }).optional(),
  document: z.object({ documentUrl: safeMediaUrl, mimeType: z.string(), fileName: z.string().optional() }).optional(),
  location: z.object({ latitude: z.number(), longitude: z.number(), name: z.string().optional(), address: z.string().optional() }).optional(),
  sticker:  z.object({ stickerUrl: safeMediaUrl }).optional(),
})

// Eventos Z-API que não são mensagens de usuário — ignorar silenciosamente
const IGNORED_STATUSES = ['DELIVERY_ACK', 'READ', 'PLAYED', 'DELETED', 'PENDING', 'SERVER_ACK']

export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  // Auth: quando a rota tem :secret, o middleware requireWebhookSecret já
  // resolveu o tenant e populou req.webhookTenant. Rota legacy sem secret cai
  // no fallback resolveTenantByInstance — mantida durante a janela de deploy
  // para o operador rotacionar callbacks Z-API via /update-every-webhooks.

  const parsed = ZApiWebhookSchema.safeParse(req.body)
  if (!parsed.success) {
    console.warn('[Webhook] Payload inválido:', parsed.error.flatten().fieldErrors)
    // Retorna 200 para Z-API não retentar com payload inválido
    res.status(200).json({ received: true, action: 'ignored_invalid_payload' })
    return
  }

  const payload = parsed.data

  if (payload.fromMe) {
    res.status(200).json({ received: true, action: 'ignored_from_me' })
    return
  }

  if (IGNORED_STATUSES.includes(payload.status)) {
    res.status(200).json({ received: true, action: 'ignored_status_event' })
    return
  }

  if (payload.isGroup) {
    res.status(200).json({ received: true, action: 'ignored_group' })
    return
  }

  let tenantId: string | null
  if (req.webhookTenant) {
    // Defense in depth: quem tem secret válido do tenant B não pode injetar
    // payload marcado como instanceId do tenant A. Só rejeita se o tenant
    // resolvido tem um instanceId conhecido e ele é diferente do do payload.
    const knownInstanceId = req.webhookTenant.zapiInstanceId
    if (knownInstanceId && knownInstanceId !== payload.instanceId) {
      console.warn(
        `[Webhook] Spoofing detectado: secret do tenant=${req.webhookTenant.tenantId} ` +
        `foi usado com instanceId=${payload.instanceId} (esperado ${knownInstanceId})`,
      )
      res.status(401).json({ error: { code: 'INSTANCE_MISMATCH' } })
      return
    }
    tenantId = req.webhookTenant.tenantId
  } else {
    // Rota legacy /webhook/whatsapp (sem :secret) — a remover após rotação
    console.warn('[Webhook] Rota legacy sem :secret usada — rotacionar callbacks Z-API')
    tenantId = await resolveTenantByInstance(payload.instanceId)
    if (!tenantId) {
      console.warn(`[Webhook] instanceId=${payload.instanceId} sem tenant correspondente — ignorado`)
      res.status(200).json({ received: true, action: 'ignored_unknown_instance' })
      return
    }
  }

  // Idempotência: descartar reentrega do mesmo messageId (Z-API retransmite em
  // glitches de rede). Falha do Redis aqui não pode bloquear o atendimento —
  // segue para o enqueue, e a UNIQUE em zapi_message_id pega a duplicata na hora
  // de persistir.
  try {
    const isFirstTime = await markMessageSeen(tenantId, payload.messageId)
    if (!isFirstTime) {
      res.status(200).json({ received: true, action: 'ignored_duplicate_message' })
      return
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Webhook] markMessageSeen falhou — seguindo sem dedup | ${msg}`)
  }

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
