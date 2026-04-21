import { Router } from 'express'
import { receiveWebhook, webhookHealth } from './whatsapp.controller'
import { requireZapiToken } from '../../shared/middleware/zapi-token'

const router = Router()

router.post('/whatsapp', requireZapiToken, receiveWebhook)
router.get('/health', webhookHealth)

export { router as whatsappRouter }
