export interface AuthAgent {
  id: string
  tenantId: string
  active: boolean
}

export interface HandoffTarget {
  phone: string
  agentId: string
}

export interface AgentForReports {
  agentId: string
  agentName: string
  email: string
  tenantId: string
  tenantName: string
}
