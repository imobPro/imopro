import { Router } from 'express'
import { getSettings, patchMyPhone, patchTenant, patchVisibility } from './tenant-settings.controller'

const router = Router()

router.get('/', getSettings)
router.patch('/tenant', patchTenant)
router.patch('/visibility', patchVisibility)
router.patch('/my-phone', patchMyPhone)

export { router as tenantSettingsRouter }
