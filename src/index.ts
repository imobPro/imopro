import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { whatsappRouter, startWhatsAppWorker } from './modules/whatsapp'

const app = express()
const PORT = process.env.PORT ?? 3000

// Segurança: cabeçalhos HTTP
app.use(helmet())

// Segurança: origens permitidas
app.use(cors({
  origin: process.env.APP_URL ?? 'http://localhost:3001',
  credentials: true,
}))

// Segurança: rate limiting geral — 100 req/min
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
}))

// Parse de JSON
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', project: 'ImobPro' })
})

// Módulo WhatsApp
app.use('/webhook', whatsappRouter)

app.listen(PORT, () => {
  console.log(`ImobPro rodando na porta ${PORT}`)
  startWhatsAppWorker()
})

export default app
