import { supabase } from '../../shared/database/supabase'
import { HttpError } from '../../shared/errors/http-error'
import {
  VISIBILITY_SECTIONS,
  type AgentVisibility,
  type TenantSettings,
  type TenantSettingsPatch,
  type VisibilitySection,
} from './tenant-settings.types'

const DEFAULTS: Omit<TenantSettings, 'tenantId'> = {
  agentName: 'Assistente',
  realtyName: 'Imobiliária',
  welcomeMessage: null,
  businessHoursStart: 8,
  businessHoursEnd: 18,
  outOfHoursMessage: null,
  agentActive: true,
}

const MAX_NAME_LEN = 80
const MAX_MESSAGE_LEN = 500
const E164_REGEX = /^\d{10,15}$/

function rowToSettings(tenantId: string, row: Record<string, unknown> | null): TenantSettings {
  if (!row) {
    return { tenantId, ...DEFAULTS }
  }
  return {
    tenantId,
    agentName: (row.agent_name as string | null) ?? DEFAULTS.agentName,
    realtyName: (row.realty_name as string | null) ?? DEFAULTS.realtyName,
    welcomeMessage: (row.welcome_message as string | null) ?? null,
    businessHoursStart: (row.business_hours_start as number | null) ?? DEFAULTS.businessHoursStart,
    businessHoursEnd: (row.business_hours_end as number | null) ?? DEFAULTS.businessHoursEnd,
    outOfHoursMessage: (row.out_of_hours_message as string | null) ?? null,
    agentActive: (row.agent_active as boolean | null) ?? DEFAULTS.agentActive,
  }
}

/**
 * Lê a configuração do tenant. Defaults são devolvidos quando a coluna ainda não
 * existe (migration 009 não aplicada) ou a linha está incompleta — isso mantém
 * o atendimento funcionando durante a janela entre commit e SQL aplicado.
 */
export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  const { data, error } = await supabase
    .from('tenants')
    .select(
      'agent_name, realty_name, welcome_message, business_hours_start, business_hours_end, out_of_hours_message, agent_active'
    )
    .eq('id', tenantId)
    .maybeSingle()

  if (error) {
    console.error(`[TenantSettings] getTenantSettings falhou tenant=${tenantId}: ${error.message}`)
    return { tenantId, ...DEFAULTS }
  }

  return rowToSettings(tenantId, data)
}

function normalizeText(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'INVALID_FIELD', `${label} deve ser texto`)
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new HttpError(400, 'INVALID_FIELD', `${label} não pode ficar vazio`)
  }
  if (trimmed.length > max) {
    throw new HttpError(400, 'INVALID_FIELD', `${label} excede ${max} caracteres`)
  }
  return trimmed
}

function normalizeOptionalText(value: unknown, max: number, label: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new HttpError(400, 'INVALID_FIELD', `${label} deve ser texto ou null`)
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > max) {
    throw new HttpError(400, 'INVALID_FIELD', `${label} excede ${max} caracteres`)
  }
  return trimmed
}

function normalizeHour(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new HttpError(400, 'INVALID_FIELD', `${label} deve ser um inteiro`)
  }
  if (value < min || value > max) {
    throw new HttpError(400, 'INVALID_FIELD', `${label} fora do intervalo ${min}-${max}`)
  }
  return value
}

interface SettingsUpdateRow {
  agent_name?: string
  realty_name?: string
  welcome_message?: string | null
  business_hours_start?: number
  business_hours_end?: number
  out_of_hours_message?: string | null
  agent_active?: boolean
}

/**
 * Atualiza um subconjunto das configurações do tenant. Valida ranges e tamanhos
 * antes de bater no banco — qualquer chave inválida derruba a operação inteira
 * com 400 (não há atualização parcial em caso de erro).
 */
export async function updateTenantSettings(
  tenantId: string,
  patch: TenantSettingsPatch
): Promise<TenantSettings> {
  const update: SettingsUpdateRow = {}

  if (patch.agentName !== undefined) {
    update.agent_name = normalizeText(patch.agentName, MAX_NAME_LEN, 'Nome do agente')
  }
  if (patch.realtyName !== undefined) {
    update.realty_name = normalizeText(patch.realtyName, MAX_NAME_LEN, 'Nome da imobiliária')
  }
  if (patch.welcomeMessage !== undefined) {
    update.welcome_message = normalizeOptionalText(
      patch.welcomeMessage,
      MAX_MESSAGE_LEN,
      'Mensagem de boas-vindas'
    )
  }
  if (patch.outOfHoursMessage !== undefined) {
    update.out_of_hours_message = normalizeOptionalText(
      patch.outOfHoursMessage,
      MAX_MESSAGE_LEN,
      'Mensagem fora do horário'
    )
  }
  if (patch.businessHoursStart !== undefined) {
    update.business_hours_start = normalizeHour(patch.businessHoursStart, 'Hora de abertura', 0, 23)
  }
  if (patch.businessHoursEnd !== undefined) {
    update.business_hours_end = normalizeHour(patch.businessHoursEnd, 'Hora de fechamento', 1, 24)
  }
  if (patch.agentActive !== undefined) {
    if (typeof patch.agentActive !== 'boolean') {
      throw new HttpError(400, 'INVALID_FIELD', 'Toggle do agente deve ser booleano')
    }
    update.agent_active = patch.agentActive
  }

  if (Object.keys(update).length === 0) {
    return getTenantSettings(tenantId)
  }

  // Validação cruzada: end > start considerando o estado pós-update
  const current = await getTenantSettings(tenantId)
  const finalStart = update.business_hours_start ?? current.businessHoursStart
  const finalEnd = update.business_hours_end ?? current.businessHoursEnd
  if (finalEnd <= finalStart) {
    throw new HttpError(
      400,
      'INVALID_FIELD',
      'Hora de fechamento deve ser maior que a hora de abertura'
    )
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(update)
    .eq('id', tenantId)
    .select(
      'agent_name, realty_name, welcome_message, business_hours_start, business_hours_end, out_of_hours_message, agent_active'
    )
    .maybeSingle()

  if (error) {
    console.error(`[TenantSettings] updateTenantSettings falhou tenant=${tenantId}: ${error.message}`)
    throw new HttpError(500, 'UPDATE_FAILED', 'Falha ao salvar configurações')
  }

  return rowToSettings(tenantId, data)
}

function isVisibilitySection(value: string): value is VisibilitySection {
  return (VISIBILITY_SECTIONS as readonly string[]).includes(value)
}

function sanitizeVisibility(input: unknown): AgentVisibility {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const out: AgentVisibility = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (isVisibilitySection(k) && typeof v === 'boolean') {
      out[k] = v
    }
  }
  return out
}

export async function getAgentVisibility(agentId: string): Promise<AgentVisibility> {
  const { data, error } = await supabase
    .from('agents')
    .select('settings_visibility')
    .eq('id', agentId)
    .maybeSingle()

  if (error) {
    console.error(`[TenantSettings] getAgentVisibility falhou agent=${agentId}: ${error.message}`)
    return {}
  }
  return sanitizeVisibility(data?.settings_visibility)
}

/**
 * Faz merge da preferência atual com o patch. Chaves desconhecidas e tipos
 * inválidos são ignorados silenciosamente — preferência de UI não justifica 400.
 */
export async function updateAgentVisibility(
  agentId: string,
  patch: AgentVisibility
): Promise<AgentVisibility> {
  const current = await getAgentVisibility(agentId)
  const sanitized = sanitizeVisibility(patch)
  const merged: AgentVisibility = { ...current, ...sanitized }

  const { error } = await supabase
    .from('agents')
    .update({ settings_visibility: merged })
    .eq('id', agentId)

  if (error) {
    console.error(`[TenantSettings] updateAgentVisibility falhou agent=${agentId}: ${error.message}`)
    throw new HttpError(500, 'UPDATE_FAILED', 'Falha ao salvar preferência de visualização')
  }

  return merged
}

export async function getAgentPhone(agentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('phone')
    .eq('id', agentId)
    .maybeSingle()

  if (error) {
    console.error(`[TenantSettings] getAgentPhone falhou agent=${agentId}: ${error.message}`)
    return null
  }
  return (data?.phone as string | null) ?? null
}

/**
 * Atualiza o telefone do agent logado. Aceita "+55..." ou só dígitos; persiste
 * apenas dígitos (formato E.164 sem o "+", padrão Z-API).
 */
export async function updateAgentPhone(agentId: string, phone: string): Promise<string> {
  if (typeof phone !== 'string') {
    throw new HttpError(400, 'INVALID_FIELD', 'Telefone deve ser texto')
  }
  const digits = phone.replace(/\D/g, '')
  if (!E164_REGEX.test(digits)) {
    throw new HttpError(400, 'INVALID_PHONE', 'Telefone deve ter entre 10 e 15 dígitos')
  }

  const { error } = await supabase.from('agents').update({ phone: digits }).eq('id', agentId)
  if (error) {
    console.error(`[TenantSettings] updateAgentPhone falhou agent=${agentId}: ${error.message}`)
    throw new HttpError(500, 'UPDATE_FAILED', 'Falha ao salvar telefone')
  }
  return digits
}
