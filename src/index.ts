import 'dotenv/config'
import { validateEnv } from './shared/utils/validate-env'
validateEnv()

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { whatsappRouter, startWhatsAppWorker } from './modules/whatsapp'
import { authRouter } from './modules/auth'
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

app.use(express.json())

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 })
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 600 })

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', project: 'ImobPro' })
})

app.use('/webhook', webhookLimiter, whatsappRouter)

app.use('/api', apiLimiter, requireAuth, authRouter)
app.use('/api/reports', apiLimiter, requireAuth, reportsRouter)
app.use('/api/settings', apiLimiter, requireAuth, tenantSettingsRouter)
app.use('/api/subscription', apiLimiter, requireAuth, billingRouter)

app.use(errorHandler)

app.listen(PORT, async () => {
  console.log(`ImobPro rodando na porta ${PORT}`)
  startWhatsAppWorker()
  startReportsWorker()
  startBillingWorker()
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
})

export default app
