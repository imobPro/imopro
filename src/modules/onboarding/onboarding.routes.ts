import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../../shared/middleware/auth'
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

// Webhook chamado pela Z-API nas callbacks de conexão/desconexão das instâncias
// provisionadas. Sem requireZapiToken: instâncias criadas via Partner API não
// enviam o ZAPI_CLIENT_TOKEN compartilhado por padrão; o instanceId funciona
// como segredo e handleZapiStatusEvent descarta instâncias desconhecidas.
// TODO: validar assinatura quando configurarmos client-token por instância.
const webhookRouter = Router()
webhookRouter.post('/zapi-status', postZapiStatusWebhook)

export { apiRouter as onboardingRouter, webhookRouter as onboardingWebhookRouter }
