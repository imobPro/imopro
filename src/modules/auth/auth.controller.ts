import type { Request, Response } from 'express'
import { HttpError } from '../../shared/errors/http-error'

export function getMe(req: Request, res: Response): void {
  if (!req.auth) {
    throw new HttpError(401, 'MISSING_AUTH', 'Não autenticado')
  }

  res.json({
    userId: req.auth.userId,
    email: req.auth.email,
    tenantId: req.auth.tenantId,
    agentId: req.auth.agentId,
  })
}
