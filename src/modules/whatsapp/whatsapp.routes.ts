import { Router } from 'express'
import { receiveWebhook, webhookHealth } from './whatsapp.controller'

const router = Router()

// Sem requireZapiToken: as instâncias provisionadas via Partner API não recebem
// o ZAPI_CLIENT_TOKEN compartilhado. A autenticação é por posse do instanceId
// (resolveTenantByInstance no controller) — mesmo padrão de /webhook/zapi-status.
router.post('/whatsapp', receiveWebhook)
router.get('/health', webhookHealth)

export { router as whatsappRouter }
