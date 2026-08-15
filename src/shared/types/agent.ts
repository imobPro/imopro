// Agent no contexto de autenticação — usado pelo requireAuth middleware.
// Mora em shared/ porque a camada compartilhada não pode depender de módulo.
export interface AuthAgent {
  id: string
  tenantId: string
  active: boolean
}
