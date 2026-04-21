import type { RequestHandler } from 'express'
import { timingSafeEqual } from 'crypto'

export const requireZapiToken: RequestHandler = (req, res, next) => {
  const expected = process.env.ZAPI_CLIENT_TOKEN
  const received = req.headers['client-token']

  if (!expected) {
    console.error('[Webhook] ZAPI_CLIENT_TOKEN não definido no ambiente')
    res.status(500).json({ error: { code: 'SERVER_MISCONFIGURED', message: 'Servidor mal configurado' } })
    return
  }

  if (typeof received !== 'string' || !tokensMatch(expected, received)) {
    res.status(401).json({ error: { code: 'INVALID_ZAPI_TOKEN', message: 'Token inválido' } })
    return
  }

  next()
}

function tokensMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
