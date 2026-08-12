import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { requireWebhookSecret } from '../../shared/middleware/webhook-secret'
import { receiveWebhook, webhookHealth } from './whatsapp.controller'

const router = Router()

// Rate limit por secret (chave = valor do path). Um tenant realista não recebe
// 120 msgs/min pelo mesmo número — cap protege contra abuso de custo Claude
// caso um secret vaze antes de ser rotacionado. Fallback ipKeyGenerator
// normaliza IPv6 conforme exigência do express-rate-limit.
const perSecretLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => {
    const s = req.params.secret
    if (typeof s === 'string' && s.length > 0) return s
    return ipKeyGenerator(req.ip ?? '')
  },
})

// Rota autenticada por secret no path (achados #1/#2 da auditoria de segurança).
router.post('/whatsapp/:secret', perSecretLimiter, requireWebhookSecret, receiveWebhook)

// Rota legacy sem :secret — mantida durante a janela de deploy para permitir
// rotação de callbacks na Z-API (/update-every-webhooks). REMOVER após todos
// os tenants apontarem para a URL nova.
router.post('/whatsapp', receiveWebhook)

router.get('/health', webhookHealth)

export { router as whatsappRouter }
