import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../../shared/middleware/auth'
import { requireWebhookSecret } from '../../shared/middleware/webhook-secret'
import {
  getConnection,
  postProvisionZapi,
  postSignup,
  postZapiStatusWebhook,
} from './onboarding.controller'

// Cadastro público — limite apertado por IP contra criação em massa de contas.
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 })

// Rotas de API. /signup é público; as demais exigem sessão (requireAuth por
// rota, porque este router é montado fora do bloco /api que já tem requireAuth).
const apiRouter = Router()
apiRouter.post('/signup', signupLimiter, postSignup)
apiRouter.post('/provision-zapi', requireAuth, postProvisionZapi)
apiRouter.get('/connection', requireAuth, getConnection)

// Rate limit por secret — reconexões/desconexões legítimas ocorrem raramente;
// 60/min por secret é folgado e ainda barra abuso.
const statusPerSecretLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    const s = req.params.secret
    if (typeof s === 'string' && s.length > 0) return s
    return req.ip ?? 'unknown'
  },
})

// Webhook autenticado por secret no path (achados #1/#2 da auditoria).
const webhookRouter = Router()
webhookRouter.post(
  '/zapi-status/:secret',
  statusPerSecretLimiter,
  requireWebhookSecret,
  postZapiStatusWebhook,
)

// Rota legacy sem :secret — mantida durante a janela de deploy para permitir
// rotação de callbacks Z-API. REMOVER depois que todos os tenants apontarem
// para a URL nova.
webhookRouter.post('/zapi-status', postZapiStatusWebhook)

export { apiRouter as onboardingRouter, webhookRouter as onboardingWebhookRouter }
