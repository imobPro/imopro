import { Router } from 'express'
import { getMe } from './auth.controller'

const router = Router()

router.get('/me', getMe)

export { router as authRouter }
