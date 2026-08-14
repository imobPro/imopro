import type { Request, Response } from 'express'
import { HttpError } from '../../shared/errors/http-error'
import {
  getAgentPhone,
  getAgentVisibility,
  getTenantSettings,
  updateAgentPhone,
  updateAgentVisibility,
  updateTenantSettings,
} from './tenant-settings.service'

function requireAuth(req: Request): { tenantId: string; agentId: string } {
  if (!req.auth) throw new HttpError(401, 'MISSING_AUTH', 'Não autenticado')
  return { tenantId: req.auth.tenantId, agentId: req.auth.agentId }
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  const { tenantId, agentId } = requireAuth(req)

  const [tenant, visibility, myPhone] = await Promise.all([
    getTenantSettings(tenantId),
    getAgentVisibility(tenantId, agentId),
    getAgentPhone(tenantId, agentId),
  ])

  res.json({ tenant, visibility, myPhone })
}

export async function patchTenant(req: Request, res: Response): Promise<void> {
  const { tenantId } = requireAuth(req)

  const body = req.body
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'INVALID_BODY', 'Body inválido')
  }

  const updated = await updateTenantSettings(tenantId, body)
  res.json({ tenant: updated })
}

export async function patchVisibility(req: Request, res: Response): Promise<void> {
  const { tenantId, agentId } = requireAuth(req)

  const body = req.body
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'INVALID_BODY', 'Body inválido')
  }

  const visibility = await updateAgentVisibility(tenantId, agentId, body)
  res.json({ visibility })
}

export async function patchMyPhone(req: Request, res: Response): Promise<void> {
  const { tenantId, agentId } = requireAuth(req)

  const phone = (req.body as { phone?: unknown })?.phone
  if (typeof phone !== 'string') {
    throw new HttpError(400, 'INVALID_FIELD', 'Telefone obrigatório')
  }

  const saved = await updateAgentPhone(tenantId, agentId, phone)
  res.json({ phone: saved })
}
