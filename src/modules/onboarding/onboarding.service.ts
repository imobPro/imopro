import { supabase } from '../../shared/database/supabase'
import { HttpError } from '../../shared/errors/http-error'
import { createInstance, getQrCodeImage, ZapiError } from '../../shared/zapi/client'
import type { ZapiCreateInstanceResult, ZapiInstanceCredentials } from '../../shared/zapi/zapi.types'
import { startTrialClock } from '../billing'
import type {
  ConnectionStatusResult,
  ProvisionResult,
  SignupInput,
  SignupResult,
  ZapiConnectionStatus,
  ZapiStatusWebhookPayload,
} from './onboarding.types'

// -----------------------------------------------------------------------------
// Cadastro self-service
// -----------------------------------------------------------------------------
//
// Cria, em sequência: usuário no Supabase Auth (não confirmado) → tenant (o
// trigger da migration 011 cria a subscription 'trial' sem datas) → agent (a
// própria pessoa, vira o destino de handoff). Não é uma transação real entre o
// GoTrue e o Postgres, então cada passo que falha desfaz os anteriores
// (compensating delete) para não deixar usuário órfão.

export async function signup(input: SignupInput): Promise<SignupResult> {
  if (!input.acceptedTerms) {
    throw new HttpError(
      400,
      'TERMS_NOT_ACCEPTED',
      'É necessário aceitar os Termos de Uso e a Política de Privacidade',
    )
  }

  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const realtyName =
    input.operationMode === 'shared' ? (input.realtyName?.trim() ?? '') : fullName

  if (input.operationMode === 'shared' && realtyName.length === 0) {
    throw new HttpError(400, 'INVALID_FIELD', 'Nome da imobiliária é obrigatório')
  }

  // 1. Usuário no Auth — email_confirm:true para o cliente conseguir logar imediato
  // e ver o painel sem barreira (PLAN.md / decisão 2026-05-11). A defesa anti-bot
  // fica no rate limit do endpoint e no aceite LGPD obrigatório.
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? 'sem dados'
    if (/already|registered|exist/i.test(msg)) {
      throw new HttpError(
        409,
        'EMAIL_IN_USE',
        'Este e-mail já tem uma conta. Faça login ou recupere a senha.',
      )
    }
    console.error(`[Onboarding] createUser falhou email=${email}: ${msg}`)
    throw new HttpError(500, 'SIGNUP_FAILED', 'Não foi possível criar a conta')
  }
  const userId = created.user.id

  // 2. Tenant — o trigger AFTER INSERT cria a subscription 'trial' (sem datas)
  const { data: tenantRow, error: tenantErr } = await supabase
    .from('tenants')
    .insert({
      name: input.operationMode === 'shared' ? realtyName : fullName,
      operation_mode: input.operationMode,
      realty_name: realtyName,
      agent_name: fullName,
      lgpd_accepted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (tenantErr || !tenantRow) {
    console.error(`[Onboarding] insert tenant falhou email=${email}: ${tenantErr?.message ?? 'sem dados'}`)
    await rollbackUser(userId)
    throw new HttpError(500, 'SIGNUP_FAILED', 'Não foi possível criar a conta')
  }
  const tenantId = tenantRow.id as string

  // 3. Agent — a própria pessoa que assina; phone opcional
  const phone = input.phone?.trim()
  const { data: agentRow, error: agentErr } = await supabase
    .from('agents')
    .insert({
      tenant_id: tenantId,
      name: fullName,
      phone: phone && phone.length > 0 ? phone : null,
      user_id: userId,
      active: true,
    })
    .select('id')
    .single()

  if (agentErr || !agentRow) {
    console.error(`[Onboarding] insert agent falhou tenant=${tenantId}: ${agentErr?.message ?? 'sem dados'}`)
    await rollbackTenant(tenantId)
    await rollbackUser(userId)
    throw new HttpError(500, 'SIGNUP_FAILED', 'Não foi possível criar a conta')
  }

  return {
    userId,
    tenantId,
    agentId: agentRow.id as string,
    emailConfirmationRequired: true,
  }
}

async function rollbackUser(userId: string): Promise<void> {
  try {
    await supabase.auth.admin.deleteUser(userId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Onboarding] rollback deleteUser ${userId} falhou: ${msg}`)
  }
}

async function rollbackTenant(tenantId: string): Promise<void> {
  // ON DELETE CASCADE remove a subscription criada pelo trigger
  const { error } = await supabase.from('tenants').delete().eq('id', tenantId)
  if (error) console.error(`[Onboarding] rollback delete tenant ${tenantId} falhou: ${error.message}`)
}

// -----------------------------------------------------------------------------
// Provisionamento da instância Z-API
// -----------------------------------------------------------------------------

interface TenantZapiRow {
  zapi_status: ZapiConnectionStatus | null
  zapi_instance_id: string | null
  zapi_instance_token: string | null
}

function getBackendPublicUrl(): string {
  const url = process.env.BACKEND_PUBLIC_URL
  if (!url) {
    throw new HttpError(
      500,
      'SERVER_MISCONFIGURED',
      'BACKEND_PUBLIC_URL não configurado — Z-API precisa de uma URL pública para os callbacks',
    )
  }
  return url.replace(/\/+$/, '')
}

async function loadTenantZapi(tenantId: string): Promise<TenantZapiRow> {
  const { data, error } = await supabase
    .from('tenants')
    .select('zapi_status, zapi_instance_id, zapi_instance_token')
    .eq('id', tenantId)
    .maybeSingle()

  if (error) {
    console.error(`[Onboarding] loadTenantZapi falhou tenant=${tenantId}: ${error.message}`)
    throw new HttpError(500, 'TENANT_LOOKUP_FAILED', 'Falha ao consultar o tenant')
  }
  if (!data) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Tenant não encontrado')
  return data as TenantZapiRow
}

async function ensureEmailConfirmed(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error) {
    console.error(`[Onboarding] getUserById falhou user=${userId}: ${error.message}`)
    throw new HttpError(500, 'AUTH_LOOKUP_FAILED', 'Falha ao verificar o usuário')
  }
  if (!data?.user?.email_confirmed_at) {
    throw new HttpError(403, 'EMAIL_NOT_CONFIRMED', 'Confirme seu e-mail antes de conectar o WhatsApp')
  }
}

// QR expira em segundos e a instância recém-criada pode ainda estar subindo —
// falha aqui não é erro do cliente: devolvemos null e o frontend faz polling.
async function safeGetQrValue(creds: ZapiInstanceCredentials): Promise<string | null> {
  try {
    const qr = await getQrCodeImage(creds)
    return qr.value || null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[Onboarding] getQrCodeImage indisponível instance=${creds.instanceId}: ${msg}`)
    return null
  }
}

async function setZapiStatus(tenantId: string, status: ZapiConnectionStatus): Promise<void> {
  const { error } = await supabase.from('tenants').update({ zapi_status: status }).eq('id', tenantId)
  if (error) console.error(`[Onboarding] setZapiStatus(${status}) falhou tenant=${tenantId}: ${error.message}`)
}

export async function provisionZapi(tenantId: string, userId: string): Promise<ProvisionResult> {
  await ensureEmailConfirmed(userId)

  const tenant = await loadTenantZapi(tenantId)

  if (tenant.zapi_status === 'connected') {
    return { status: 'connected', qrCode: null, alreadyConnected: true }
  }

  // Já existe instância (awaiting_qr ou disconnected): reaproveita, não recria.
  if (tenant.zapi_instance_id && tenant.zapi_instance_token) {
    const creds: ZapiInstanceCredentials = {
      instanceId: tenant.zapi_instance_id,
      instanceToken: tenant.zapi_instance_token,
    }
    if (tenant.zapi_status !== 'awaiting_qr') await setZapiStatus(tenantId, 'awaiting_qr')
    const qrCode = await safeGetQrValue(creds)
    return { status: 'awaiting_qr', qrCode }
  }

  // Sem instância: cria via Partner API.
  const base = getBackendPublicUrl()
  let created: ZapiCreateInstanceResult
  try {
    created = await createInstance({
      name: `imobpro-${tenantId}`,
      receivedCallbackUrl: `${base}/webhook/whatsapp`,
      connectedCallbackUrl: `${base}/webhook/zapi-status`,
      disconnectedCallbackUrl: `${base}/webhook/zapi-status`,
    })
  } catch (err) {
    if (err instanceof ZapiError) {
      console.error(
        `[Onboarding] createInstance falhou tenant=${tenantId} status=${err.status} endpoint=${err.endpoint}: ${err.message} ${err.responseBody ?? ''}`,
      )
      throw new HttpError(
        502,
        'ZAPI_PROVISIONING_FAILED',
        'Não foi possível preparar a conexão do WhatsApp agora. Tente novamente em alguns minutos.',
      )
    }
    throw err
  }

  const { error: upErr } = await supabase
    .from('tenants')
    .update({
      zapi_instance_id: created.id,
      zapi_instance_token: created.token,
      zapi_status: 'awaiting_qr',
    })
    .eq('id', tenantId)

  if (upErr) {
    // Instância criada na Z-API mas não persistida — fica órfã. Registra alto
    // para limpeza manual; não há "delete instance" no SDK.
    console.error(
      `[Onboarding] FALHA AO PERSISTIR instância Z-API tenant=${tenantId} instanceId=${created.id} — limpar manualmente. ${upErr.message}`,
    )
    throw new HttpError(500, 'PROVISIONING_PERSIST_FAILED', 'Falha ao salvar a conexão. Tente novamente.')
  }

  const qrCode = await safeGetQrValue({ instanceId: created.id, instanceToken: created.token })
  return { status: 'awaiting_qr', qrCode }
}

export async function getConnectionStatus(tenantId: string): Promise<ConnectionStatusResult> {
  const tenant = await loadTenantZapi(tenantId)
  const zapiStatus: ZapiConnectionStatus = tenant.zapi_status ?? 'not_provisioned'

  if (zapiStatus === 'awaiting_qr' && tenant.zapi_instance_id && tenant.zapi_instance_token) {
    const qrCode = await safeGetQrValue({
      instanceId: tenant.zapi_instance_id,
      instanceToken: tenant.zapi_instance_token,
    })
    return { zapiStatus, qrCode }
  }
  return { zapiStatus, qrCode: null }
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
    console.error(`[Onboarding] getZapiStatus falhou tenant=${tenantId}: ${error.message}`)
    return 'not_provisioned'
  }
  return ((data?.zapi_status as ZapiConnectionStatus | null) ?? 'not_provisioned')
}

// -----------------------------------------------------------------------------
// Webhook de status da Z-API (POST /webhook/zapi-status)
// -----------------------------------------------------------------------------
//
// A Z-API chama esta URL nas callbacks de conexão/desconexão das instâncias
// provisionadas. Localiza o tenant por zapi_instance_id. Na conexão, marca
// 'connected' e dispara o relógio do trial (billing.startTrialClock — é aqui
// que os 7 dias começam). Na desconexão, marca 'disconnected' (o banner de
// reconectar é do Sprint 9.3). Eventos ambíguos são ignorados.

function classifyEvent(payload: ZapiStatusWebhookPayload): 'connected' | 'disconnected' | null {
  if (payload.type === 'ConnectedCallback' || payload.connected === true) return 'connected'
  if (payload.type === 'DisconnectedCallback' || payload.disconnected === true) return 'disconnected'
  return null
}

export async function handleZapiStatusEvent(payload: ZapiStatusWebhookPayload): Promise<void> {
  const instanceId = payload.instanceId
  if (!instanceId) return

  const event = classifyEvent(payload)
  if (!event) {
    console.warn(`[Webhook] zapi-status: evento ambíguo para instance=${instanceId} — ignorado`)
    return
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, zapi_connected_at')
    .eq('zapi_instance_id', instanceId)
    .maybeSingle()

  if (error) {
    console.error(`[Webhook] zapi-status: lookup falhou instance=${instanceId}: ${error.message}`)
    return
  }
  if (!tenant) {
    console.warn(`[Webhook] zapi-status: instance=${instanceId} sem tenant correspondente — ignorado`)
    return
  }
  const tenantId = tenant.id as string

  if (event === 'connected') {
    const { error: upErr } = await supabase
      .from('tenants')
      .update({
        zapi_status: 'connected',
        zapi_connected_at: (tenant.zapi_connected_at as string | null) ?? new Date().toISOString(),
      })
      .eq('id', tenantId)
    if (upErr) console.error(`[Webhook] zapi-status: update connected falhou tenant=${tenantId}: ${upErr.message}`)

    // Idempotente (guarda trial_started_at IS NULL): reconexão não reinicia.
    await startTrialClock(tenantId)
    console.log(`[Webhook] zapi-status: tenant=${tenantId} conectado`)
    return
  }

  const { error: upErr } = await supabase
    .from('tenants')
    .update({ zapi_status: 'disconnected' })
    .eq('id', tenantId)
  if (upErr) console.error(`[Webhook] zapi-status: update disconnected falhou tenant=${tenantId}: ${upErr.message}`)
  console.log(`[Webhook] zapi-status: tenant=${tenantId} desconectado`)
}
