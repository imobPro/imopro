import type { Request, Response } from 'express'
import { HttpError } from '../../shared/errors/http-error'
import { getSubscription, getZapiStatus, markActive, toSubscriptionView } from './billing.service'

function requireAuth(req: Request): { tenantId: string } {
  if (!req.auth) throw new HttpError(401, 'MISSING_AUTH', 'Não autenticado')
  return { tenantId: req.auth.tenantId }
}

export async function getCurrentSubscription(req: Request, res: Response): Promise<void> {
  const { tenantId } = requireAuth(req)
  const [sub, zapiStatus] = await Promise.all([
    getSubscription(tenantId),
    getZapiStatus(tenantId),
  ])
  if (!sub) {
    throw new HttpError(404, 'NO_SUBSCRIPTION', 'Sem assinatura para este tenant')
  }
  // zapiStatus na mesma resposta evita 2 round-trips no Server Component do
  // frontend (TrialBanner + páginas de assinatura). O banner danger é gerado
  // pelo toBannerVariant quando zapiStatus='disconnected', com prioridade
  // sobre os estados do trial.
  res.json({ subscription: toSubscriptionView(sub), zapiStatus })
}

export async function activateSubscription(req: Request, res: Response): Promise<void> {
  const { tenantId } = requireAuth(req)

  const planId = (req.body as { planId?: unknown })?.planId
  if (typeof planId !== 'string' || planId.trim().length === 0) {
    throw new HttpError(400, 'INVALID_FIELD', 'planId obrigatório')
  }

  const updated = await markActive(tenantId, planId.trim())
  res.json({ subscription: toSubscriptionView(updated) })
}
