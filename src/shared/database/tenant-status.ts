import { supabase } from './supabase'
import type { ZapiConnectionStatus } from '../types/tenant'

// -----------------------------------------------------------------------------
// Operações finas de status de tenant — compartilhadas entre billing e onboarding.
//
// Ambas as funções recebem tenantId por parâmetro. CONTRATO T1: esse tenantId
// SEMPRE vem da sessão autenticada (req.auth.tenantId) ou de lookup interno
// (webhook Z-API resolve o tenant via SELECT por zapi_instance_id). NUNCA vem
// de req.body/query/params. Se um novo caller quiser passar valor de request,
// PARE — está violando T1, é mais urgente que qualquer refactor.
//
// Por que aqui e não em billing ou onboarding: as duas funções são SELECT/UPDATE
// finos em tenants e subscriptions, sem regra de negócio rica. Ficar em módulos
// de domínio criava ciclo billing ↔ onboarding.
// -----------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

function getTrialDays(): number {
  const raw = process.env.TRIAL_DAYS
  const parsed = raw ? Number(raw) : 7
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7
}

// Lê apenas o status atual da Z-API. Usado pelo worker (silencia IA quando
// desconectado) e pelo controller de billing (frontend mostra banner danger).
// Default permissivo: erro de banco/ausência → 'not_provisioned' (não bloqueia
// atendimento por falha de leitura).
export async function getZapiStatus(tenantId: string): Promise<ZapiConnectionStatus> {
  const { data, error } = await supabase
    .from('tenants')
    .select('zapi_status')
    .eq('id', tenantId)
    .maybeSingle()
  if (error) {
    console.error(`[TenantStatus] getZapiStatus falhou tenant=${tenantId}: ${error.message}`)
    return 'not_provisioned'
  }
  return ((data?.zapi_status as ZapiConnectionStatus | null) ?? 'not_provisioned')
}

/**
 * Inicia o relógio do trial: grava `trial_started_at = now()` e
 * `trial_ends_at = now() + TRIAL_DAYS`. Chamado pelo webhook /webhook/zapi-status
 * quando a instância Z-API conecta pela primeira vez.
 *
 * Idempotente via guarda `trial_started_at IS NULL`: reconectar depois de uma
 * queda não reinicia o relógio, e um trial já `expired`/`active` (status != trial)
 * também não é tocado.
 */
export async function startTrialClock(tenantId: string): Promise<void> {
  const now = new Date()
  const endsAt = new Date(now.getTime() + getTrialDays() * DAY_MS)

  const { error } = await supabase
    .from('subscriptions')
    .update({ trial_started_at: now.toISOString(), trial_ends_at: endsAt.toISOString() })
    .eq('tenant_id', tenantId)
    .eq('status', 'trial')
    .is('trial_started_at', null)

  if (error) {
    console.error(`[TenantStatus] startTrialClock falhou tenant=${tenantId}: ${error.message}`)
  }
}
