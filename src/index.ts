// IMPORTANTE: ./instrument importa dotenv/config e inicializa o Sentry.
// Deve ser o primeiro import deste arquivo para que outros módulos sejam
// criados com o cliente Sentry já ativo.
import './instrument'

import { validateEnv } from './shared/utils/validate-env'
validateEnv()

import express from 'express'
import * as Sentry from '@sentry/node'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { whatsappRouter, startWhatsAppWorker } from './modules/whatsapp'
import { authRouter } from './modules/auth'
import { onboardingRouter, onboardingWebhookRouter } from './modules/onboarding'
import {
  reportsRouter,
  registerReportsSchedules,
  startReportsWorker,
} from './modules/reports'
import { tenantSettingsRouter } from './modules/tenant-settings'
import {
  billingRouter,
  registerBillingSchedules,
  startBillingWorker,
} from './modules/billing'
import { requireAuth } from './shared/middleware/auth'
import { errorHandler } from './shared/errors/error-handler'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())

app.use(cors({
  origin: process.env.APP_URL ?? 'http://localhost:3001',
  credentials: true,
}))

// Limit explícito = default do body-parser (100kb). Documenta a decisão
// de que WhatsApp/Z-API cabem folgado. Trocar exige revisão de DoS.
app.use(express.json({ limit: '100kb' }))

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 })
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 600 })

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', project: 'ImobPro' })
})

app.use('/webhook', webhookLimiter, whatsappRouter)
app.use('/webhook', webhookLimiter, onboardingWebhookRouter)

// /api/onboarding tem rota pública (/signup) — montado ANTES do bloco /api que
// aplica requireAuth a tudo. As rotas autenticadas do onboarding usam requireAuth
// por rota; /signup tem seu próprio limiter mais apertado dentro do router.
app.use('/api/onboarding', apiLimiter, onboardingRouter)
app.use('/api', apiLimiter, requireAuth, authRouter)
app.use('/api/reports', apiLimiter, requireAuth, reportsRouter)
app.use('/api/settings', apiLimiter, requireAuth, tenantSettingsRouter)
app.use('/api/subscription', apiLimiter, requireAuth, billingRouter)

// Sentry: precisa vir ANTES do errorHandler para capturar a exception bruta
// (com stacktrace original). O errorHandler customizado roda depois para
// devolver o JSON consistente ao cliente.
Sentry.setupExpressErrorHandler(app)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`ImobPro rodando na porta ${PORT}`)
  startWhatsAppWorker()
  startReportsWorker()
  startBillingWorker()
  // app.listen callback é síncrono (retorno void). Envelopamos os schedules
  // async num IIFE + void para respeitar a assinatura sem misturar Promise.
  void (async () => {
    try {
      await registerReportsSchedules()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Boot] Falha ao registrar schedules de relatórios: ${msg}`)
    }
    try {
      await registerBillingSchedules()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Boot] Falha ao registrar schedules de billing: ${msg}`)
    }
  })()
})

export default app
