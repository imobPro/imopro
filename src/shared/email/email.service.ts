import { getResend, getFromEmail } from './resend'

export interface EmailAttachment {
  filename: string
  content: Buffer
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  const resend = getResend()
  const from = getFromEmail()

  const result = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  })

  if (result.error) {
    throw new Error(`[Email] Resend rejeitou envio: ${result.error.message}`)
  }
  if (!result.data) {
    throw new Error('[Email] Resend devolveu resposta sem id')
  }

  return { id: result.data.id }
}
