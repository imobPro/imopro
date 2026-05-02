export interface TenantSettings {
  tenantId: string
  agentName: string
  realtyName: string
  welcomeMessage: string | null
  businessHoursStart: number
  businessHoursEnd: number
  outOfHoursMessage: string | null
  agentActive: boolean
}

export type TenantSettingsPatch = Partial<Omit<TenantSettings, 'tenantId'>>

export type VisibilitySection =
  | 'identity'
  | 'brand'
  | 'welcome'
  | 'hours'
  | 'out_of_hours_msg'
  | 'active_toggle'
  | 'my_phone'

export const VISIBILITY_SECTIONS: readonly VisibilitySection[] = [
  'identity',
  'brand',
  'welcome',
  'hours',
  'out_of_hours_msg',
  'active_toggle',
  'my_phone',
]

export type AgentVisibility = Partial<Record<VisibilitySection, boolean>>
