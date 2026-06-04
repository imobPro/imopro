import { z } from 'zod'
import type { Request, Response } from 'express'
import { HttpError } from '../../shared/errors/http-error'
import {
  getConnectionStatus,
  handleZapiStatusEvent,
  provisionZapi,
  signup,
} from './onboarding.service'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SignupSchema = z.object({
  operationMode: z.enum(['shared', 'individual']),
  fullName: z.string().trim().min(2).max(80),
  realtyName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().min(3).max(254).regex(EMAIL_RE, 'E-mail inválido'),
  password: z.string().min(8).max(128),
  phone: z.string().trim().min(8).max(20).optional(),
  acceptedTerms: z.literal(true, { message: 'É necessário aceitar os termos' }),
})

export const ZapiStatusWebhookSchema = z.object({
  instanceId: z.string().min(1),
  type: z.string().optional(),
  connected: z.boolean().optional(),
  // Doc Z-API: DisconnectedCallback envia `disconnected: true` (não `connected: false`).
  // Sem este campo, Zod strip-a o flag e classifyEvent só captura desconexão via `type`.
  disconnected: z.boolean().optional(),
})

function firstZodMessage(err: z.ZodError): string {
  return err.issues[0]?.message ?? 'Dados inválidos'
}

function requireAuthCtx(req: Request): { tenantId: string; userId: string } {
  if (!req.auth) throw new HttpError(401, 'MISSING_AUTH', 'Não autenticado')
  return { tenantId: req.auth.tenantId, userId: req.auth.userId }
}

export async function postSignup(req: Request, res: Response): Promise<void> {
  const parsed = SignupSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, 'INVALID_BODY', firstZodMessage(parsed.error))
  }
  const result = await signup(parsed.data)
  res.status(201).json(result)
}

export async function postProvisionZapi(req: Request, res: Response): Promise<void> {
  const { tenantId, userId } = requireAuthCtx(req)
  const result = await provisionZapi(tenantId, userId)
  res.json(result)
}

export async function getConnection(req: Request, res: Response): Promise<void> {
  const { tenantId } = requireAuthCtx(req)
  const result = await getConnectionStatus(tenantId)
  res.json(result)
}

export async function postZapiStatusWebhook(req: Request, res: Response): Promise<void> {
  const parsed = ZapiStatusWebhookSchema.safeParse(req.body)
  if (!parsed.success) {
    console.warn('[Webhook] zapi-status payload inválido:', parsed.error.flatten().fieldErrors)
    // 200 para a Z-API não retentar com payload inválido
    res.status(200).json({ received: true, action: 'ignored_invalid_payload' })
    return
  }
  await handleZapiStatusEvent(parsed.data)
  res.status(200).json({ received: true })
}
