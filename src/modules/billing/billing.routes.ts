import { Router } from 'express'
import { activateSubscription, getCurrentSubscription } from './billing.controller'

const router = Router()

router.get('/', getCurrentSubscription)
router.post('/activate', activateSubscription)

export { router as billingRouter }
