import type { RequestHandler } from 'express'
import { supabase } from '../database/supabase'

// -----------------------------------------------------------------------------
// requireWebhookSecret — auth de webhook Z-API por secret no path
// -----------------------------------------------------------------------------
//
// A Z-API não assina nem envia HMAC nos webhooks inbound (confirmado em
// developer.z-api.io). O modelo anterior autenticava por "posse do instanceId"
// — frágil, porque instanceId nunca foi um segredo por design (fica cleartext
// no DB, aparece em painéis, é imutável). Achados #1 e #2 da auditoria.
//
// A defesa possível é um token secreto por tenant no path do callback URL,
// gerado no provisionamento (migration 013) e passado à Z-API via
// /update-every-webhooks. Se vazar, rotaciona sem tocar na instância WhatsApp.
//
// Lookup por coluna indexada (UNIQUE) — O(1), sem side channel de timing.
// -----------------------------------------------------------------------------

export const requireWebhookSecret: RequestHandler = async (req, res, next) => {
  const secret = req.params.secret

  // Sanidade — o backfill gera 64 hex chars. Rejeitamos qualquer coisa
  // absurdamente curta antes de bater no banco.
  if (typeof secret !== 'string' || secret.length < 32) {
    res.status(401).json({ error: { code: 'INVALID_WEBHOOK_SECRET' } })
    return
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('id, zapi_instance_id')
    .eq('webhook_secret', secret)
    .maybeSingle()

  if (error) {
    console.error(`[Webhook] lookup por secret falhou: ${error.message}`)
    res.status(500).json({ error: { code: 'WEBHOOK_LOOKUP_FAILED' } })
    return
  }

  if (!data) {
    // Sem mensagem detalhada — não confirmamos existência de qualquer secret
    res.status(401).json({ error: { code: 'INVALID_WEBHOOK_SECRET' } })
    return
  }

  req.webhookTenant = {
    tenantId: data.id as string,
    zapiInstanceId: (data.zapi_instance_id as string | null) ?? null,
  }
  next()
}
