import { Resend } from 'resend'

let client: Resend | null = null

export function getResend(): Resend {
  if (!client) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY não definida')
    client = new Resend(process.env.RESEND_API_KEY)
  }
  return client
}

export function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error('RESEND_FROM_EMAIL não definida')
  return from
}
