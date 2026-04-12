import { Router } from 'express'
import { receiveWebhook, webhookHealth } from './whatsapp.controller'

const router = Router()

router.post('/whatsapp', receiveWebhook)
router.get('/health', webhookHealth)

export { router as whatsappRouter }
