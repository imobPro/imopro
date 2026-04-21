import type { ErrorRequestHandler } from 'express'
import { HttpError } from './http-error'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }

  const message = err instanceof Error ? err.message : 'Erro interno'
  console.error(`[Error] ${req.method} ${req.path} — ${message}`)

  const body: { error: { code: string; message: string; stack?: string } } = {
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno' },
  }
  if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
    body.error.stack = err.stack
  }

  res.status(500).json(body)
}
