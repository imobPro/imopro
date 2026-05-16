// Helpers de observabilidade centralizados em cima do Sentry.
//
// Por que centralizar?
// 1. Aplicar consistência de tags/context em todos os call sites.
// 2. Manter o resto do código limpo (se um dia trocarmos Sentry por outra
//    ferramenta, só mudamos aqui).
// 3. Padronizar os pontos da lição 018 — erros silenciados do Supabase que
//    retornam default sem subir exceção. Logar ainda no console + reportar
//    ao Sentry como mensagem (não como exception) preserva o comportamento
//    atual de não derrubar o atendimento.

import * as Sentry from '@sentry/node'

export type SilentErrorContext = {
  module: string
  operation: string
  tenantId?: string
  leadId?: string
  conversationId?: string
  extra?: Record<string, unknown>
}

/**
 * Reporta um erro que foi engolido propositalmente (try/catch que retorna
 * default). Loga no console em qualquer ambiente; envia ao Sentry como
 * mensagem de nível "error" se SENTRY_DSN estiver configurado.
 *
 * Use quando o caller PRECISA seguir mesmo se a operação secundária falhar
 * — ex.: persistir sentimento da conversa. Não use para erros que devem
 * propagar (use `throw` ou `Sentry.captureException` direto).
 */
export function captureSilentError(
  error: unknown,
  ctx: SilentErrorContext,
): void {
  const message = error instanceof Error ? error.message : String(error)
  const prefix = `[${ctx.module}] ${ctx.operation} falhou`
  const idsSuffix = [
    ctx.tenantId && `tenantId=${ctx.tenantId}`,
    ctx.leadId && `leadId=${ctx.leadId}`,
    ctx.conversationId && `conversationId=${ctx.conversationId}`,
  ]
    .filter(Boolean)
    .join(' ')

  console.error(
    idsSuffix ? `${prefix} | ${idsSuffix} | erro=${message}` : `${prefix} | erro=${message}`,
  )

  Sentry.withScope((scope) => {
    scope.setLevel('error')
    scope.setTag('module', ctx.module)
    scope.setTag('operation', ctx.operation)
    if (ctx.tenantId) scope.setTag('tenant_id', ctx.tenantId)
    if (ctx.leadId) scope.setContext('lead', { id: ctx.leadId })
    if (ctx.conversationId)
      scope.setContext('conversation', { id: ctx.conversationId })
    if (ctx.extra) scope.setContext('extra', ctx.extra)

    if (error instanceof Error) {
      Sentry.captureException(error)
    } else {
      Sentry.captureMessage(`${prefix}: ${message}`, 'error')
    }
  })
}

/**
 * Registra um breadcrumb antes de chamar serviço externo (Z-API, Claude,
 * OpenAI, Supabase). Aparece no painel do Sentry como pegada que antecede
 * uma exceção, facilitando reconstruir a sequência de eventos.
 */
export function addExternalCallBreadcrumb(params: {
  service: 'zapi' | 'anthropic' | 'openai' | 'supabase' | 'resend'
  operation: string
  data?: Record<string, unknown>
}): void {
  Sentry.addBreadcrumb({
    category: `external.${params.service}`,
    message: params.operation,
    level: 'info',
    data: params.data,
  })
}

/**
 * Envolve um job/worker de BullMQ com captura de exceptions + contexto.
 * O try/catch externo do worker ainda re-throw para o BullMQ marcar o job
 * como falhado e respeitar a config de retry; o Sentry só observa.
 */
export async function withJobMonitoring<T>(
  ctx: { queue: string; jobId: string; jobName?: string; tenantId?: string },
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('queue', ctx.queue)
      scope.setTag('job_id', ctx.jobId)
      if (ctx.jobName) scope.setTag('job_name', ctx.jobName)
      if (ctx.tenantId) scope.setTag('tenant_id', ctx.tenantId)
      Sentry.captureException(error)
    })
    throw error
  }
}
