// AuthAgent mudou de casa para src/shared/types/agent.ts. Re-export para
// preservar imports existentes (agents/index.ts) — não colocar nada novo aqui.
import type { AuthAgent } from '../../shared/types/agent'
export type { AuthAgent }

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
