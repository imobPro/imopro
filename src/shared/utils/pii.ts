// -----------------------------------------------------------------------------
// Máscaras de PII para logs e breadcrumbs.
// -----------------------------------------------------------------------------
//
// LGPD Art. 46: o controlador deve adotar medidas técnicas para proteger dado
// pessoal. Telefone e e-mail em log (stdout do Railway, breadcrumb do Sentry)
// caem nessa definição. Achados #4 e #5 da auditoria de segurança.
//
// Regra: preservar o mínimo necessário para debug operacional (identificar o
// tenant/lead sem revelar o contato). Nunca logar phone/email cru.
// -----------------------------------------------------------------------------

/**
 * Mascara um telefone preservando 5 dígitos do início (país + DDD parcial)
 * e 4 do fim, colocando `****` no meio. Aceita qualquer formato de entrada —
 * o resultado é baseado apenas nos dígitos.
 *
 *   maskPhone('5521988887777')      → '55219****7777'
 *   maskPhone('+55 21 98888-7777')  → '55219****7777'
 *   maskPhone(null)                 → '(null)'
 *   maskPhone(undefined)            → '(null)'
 *   maskPhone('')                   → '(empty)'
 *   maskPhone('12345678')           → '12345****5678'   (fim = últimos 4, começo = primeiros 4)
 *   maskPhone('123')                → '***'             (curto demais)
 */
export function maskPhone(phone: string | null | undefined): string {
  if (phone === null || phone === undefined) return '(null)'
  if (typeof phone !== 'string') return '(invalid)'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 0) return '(empty)'
  if (digits.length < 8) return '***'
  const head = digits.slice(0, Math.min(5, digits.length - 4))
  const tail = digits.slice(-4)
  return `${head}****${tail}`
}

/**
 * Mascara um e-mail preservando a 1ª e a última letra do local part e o
 * domínio completo. Domínio inteiro serve para debug (ex: identificar se é
 * gmail vs corporativo) sem revelar o titular.
 *
 *   maskEmail('arthur@example.com')  → 'a***r@example.com'
 *   maskEmail('a@b.com')             → '*@b.com'
 *   maskEmail('ab@c.com')            → 'a*b@c.com'
 *   maskEmail(null)                  → '(null)'
 *   maskEmail('')                    → '(empty)'
 *   maskEmail('sem-arroba')          → '(invalid-email)'
 */
export function maskEmail(email: string | null | undefined): string {
  if (email === null || email === undefined) return '(null)'
  if (typeof email !== 'string') return '(invalid)'
  const trimmed = email.trim()
  if (trimmed.length === 0) return '(empty)'
  const atIdx = trimmed.indexOf('@')
  if (atIdx <= 0 || atIdx === trimmed.length - 1) return '(invalid-email)'
  const local = trimmed.slice(0, atIdx)
  const domain = trimmed.slice(atIdx + 1)
  if (local.length === 1) return `*@${domain}`
  if (local.length === 2) return `${local[0]}*${local[1]}@${domain}`
  return `${local[0]}***${local[local.length - 1]}@${domain}`
}
