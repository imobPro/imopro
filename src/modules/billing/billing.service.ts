import { supabase } from '../../shared/database/supabase'
import { HttpError } from '../../shared/errors/http-error'
import type { Subscription, SubscriptionStatus, SubscriptionView } from './billing.types'

const SUBSCRIPTION_COLUMNS =
  'tenant_id, status, trial_started_at, trial_ends_at, trial_message_count, plan_id, subscribed_at, canceled_at'

const DAY_MS = 24 * 60 * 60 * 1000

interface SubscriptionRow {
  tenant_id: string
  status: SubscriptionStatus
  trial_started_at: string | null
  trial_ends_at: string | null
  trial_message_count: number
  plan_id: string | null
  subscribed_at: string | null
  canceled_at: string | null
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    tenantId: row.tenant_id,
    status: row.status,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    trialMessageCount: row.trial_message_count,
    planId: row.plan_id,
    subscribedAt: row.subscribed_at,
    canceledAt: row.canceled_at,
  }
}

export function getTrialMessageLimit(): number {
  const raw = process.env.TRIAL_MESSAGE_LIMIT
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50
}

export function getTrialDays(): number {
  const raw = process.env.TRIAL_DAYS
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7
}

/**
 * Lê a subscription do tenant. O trigger da migration 011 garante que toda
 * inserção em `tenants` cria uma subscription, então NULL aqui significa erro
 * de banco ou tenant inexistente — propagamos como erro para o caller decidir.
 */
export async function getSubscription(tenantId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_COLUMNS)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error(`[Billing] getSubscription falhou tenant=${tenantId}: ${error.message}`)
    return null
  }
  if (!data) return null
  return rowToSubscription(data)
}

/**
 * Trial ativo = status `trial` E abaixo do cap de mensagens E (ou o relógio
 * ainda não começou, ou começou e ainda está no prazo).
 *
 * `trialEndsAt === null` significa "trial pendente" — o cliente se cadastrou mas
 * ainda não conectou o WhatsApp, então nada foi consumido: tratamos como ativo.
 * Atingir o cap NÃO marca expired aqui — quem persiste é o caller após
 * incrementar (mantém a operação atômica simples).
 */
export function isTrialActive(sub: Subscription): boolean {
  if (sub.status !== 'trial') return false
  if (sub.trialMessageCount >= getTrialMessageLimit()) return false
  if (!sub.trialEndsAt) return true // relógio ainda não começou (WhatsApp não conectado)
  return Date.now() < new Date(sub.trialEndsAt).getTime()
}

/**
 * IA pode responder. Por contrato: trial ativo OU `active` (assinatura paga).
 * Status `expired` e `canceled` retornam false — mensagem do lead deve cair em
 * saveIncomingMessagesOnly no worker.
 */
export function isAccessAllowed(sub: Subscription): boolean {
  if (sub.status === 'active') return true
  if (sub.status === 'trial') return isTrialActive(sub)
  return false
}

/**
 * Incremento atômico via RPC. Retorna nova contagem; null quando subscription
 * não está em trial (RPC retorna NULL nesse caso). Caller usa o número retornado
 * para decidir se atingiu cap e precisa marcar expired.
 */
// Contrato da RPC (migration 011): retorna INT (nova contagem) ou NULL.
// Sem Database types tipados no client, tipamos aqui a fronteira do banco.
interface IncrementTrialCountResult {
  data: number | null
  error: { message: string } | null
}

export async function incrementTrialMessageCount(tenantId: string): Promise<number | null> {
  const { data, error } = (await supabase.rpc('increment_trial_message_count', {
    p_tenant_id: tenantId,
  })) as IncrementTrialCountResult

  if (error) {
    console.error(`[Billing] incrementTrialMessageCount falhou tenant=${tenantId}: ${error.message}`)
    return null
  }
  if (typeof data !== 'number') return null
  return data
}

// PONTE — a implementação mora em shared/database/tenant-status.ts.
// Este re-export existe só para não quebrar callers e testes atuais.
// Não adicione lógica aqui. Ao tocar num caller, migre o import
// para o shared e remova a ponte quando o último sair.
// Registrado em docs/divida-tecnica.md.
export { startTrialClock } from '../../shared/database/tenant-status'

// Exposto pelo service para o controller manter a regra "controller não toca
// banco" (dep-cruiser `controller-nao-toca-banco`). billing.controller usa esse
// re-export em vez de importar direto de shared/database.
export { getZapiStatus } from '../../shared/database/tenant-status'

/**
 * Marca trial como expirado. Idempotente — só atualiza se status atual é trial.
 * Chamado pelo worker quando o cap é atingido e pelo cron diário quando o prazo
 * vence.
 */
export async function expireTrial(tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('tenant_id', tenantId)
    .eq('status', 'trial')

  if (error) {
    console.error(`[Billing] expireTrial falhou tenant=${tenantId}: ${error.message}`)
  }
}

/**
 * Stub do gateway — registra plan_id e marca como active. Quando a integração
 * Stripe/Asaas entrar (Sprint Fase 3.4), este passo é o callback do webhook
 * de pagamento confirmado. Por ora, é chamado direto pelo POST /activate.
 */
export async function markActive(tenantId: string, planId: string): Promise<Subscription> {
  if (!planId || typeof planId !== 'string') {
    throw new HttpError(400, 'INVALID_PLAN', 'plan_id obrigatório')
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      plan_id: planId,
      subscribed_at: new Date().toISOString(),
      canceled_at: null,
    })
    .eq('tenant_id', tenantId)
    .select(SUBSCRIPTION_COLUMNS)
    .maybeSingle()

  if (error || !data) {
    console.error(`[Billing] markActive falhou tenant=${tenantId}: ${error?.message ?? 'no data'}`)
    throw new HttpError(500, 'UPDATE_FAILED', 'Falha ao ativar plano')
  }
  return rowToSubscription(data)
}

/**
 * Cron diário: marca como expired todos os trials cujo `trial_ends_at` já
 * passou. Retorna contagem para logging/observabilidade.
 */
export async function expireTrialsByTime(): Promise<number> {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .lt('trial_ends_at', nowIso)
    .eq('status', 'trial')
    .select('tenant_id')

  if (error) {
    console.error(`[Billing] expireTrialsByTime falhou: ${error.message}`)
    return 0
  }
  return data?.length ?? 0
}

/**
 * View enriquecida para a API. Calcula remaining a partir do limite atual e
 * `accessAllowed` aplicando isAccessAllowed — frontend não precisa repetir.
 * Quando o trial ainda não começou (`trialEndsAt === null`), `trialDaysRemaining`
 * reporta o período cheio (TRIAL_DAYS) e `trialStarted` fica false.
 */
export function toSubscriptionView(sub: Subscription): SubscriptionView {
  const limit = getTrialMessageLimit()
  const remainingMsgs = Math.max(0, limit - sub.trialMessageCount)
  const remainingDays = sub.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / DAY_MS))
    : getTrialDays()
  return {
    ...sub,
    trialMessageLimit: limit,
    trialMessagesRemaining: remainingMsgs,
    trialDaysRemaining: remainingDays,
    trialStarted: sub.trialStartedAt !== null,
    accessAllowed: isAccessAllowed(sub),
  }
}
