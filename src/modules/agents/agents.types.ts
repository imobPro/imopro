export interface AuthAgent {
  id: string
  tenantId: string
  active: boolean
}

export interface HandoffTarget {
  phone: string
  agentId: string
}
