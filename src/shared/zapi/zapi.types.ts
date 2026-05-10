// Credenciais por instância — gravadas em tenants.zapi_instance_id/token após
// o provisionamento. Usadas em todos os endpoints exceto createInstance.
export interface ZapiInstanceCredentials {
  instanceId: string
  instanceToken: string
}

// Body de criação. Apenas `name` é obrigatório; URLs de webhook são opcionais
// e definidas no provisionamento (apontam para nosso backend).
export interface ZapiCreateInstanceParams {
  name: string
  receivedCallbackUrl?: string
  connectedCallbackUrl?: string
  disconnectedCallbackUrl?: string
  messageStatusCallbackUrl?: string
}

export interface ZapiCreateInstanceResult {
  id: string
  token: string
  due: number
}

export interface ZapiInstanceStatus {
  connected: boolean
  smartphoneConnected: boolean
  error?: string
}

export interface ZapiQrCode {
  value: string
}

export interface ZapiSimpleAck {
  value: boolean
}
