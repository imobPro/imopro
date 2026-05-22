// Modos de operação do tenant (espelha tenants.operation_mode — ver CLAUDE.md):
// - shared:     imobiliária com um número WhatsApp e vários corretores
// - individual: corretor autônomo, o tenant é o próprio corretor
export type OperationMode = 'shared' | 'individual'

// Lifecycle da conexão WhatsApp (espelha o CHECK de tenants.zapi_status).
export type ZapiConnectionStatus = 'not_provisioned' | 'awaiting_qr' | 'connected' | 'disconnected'

export interface SignupInput {
  operationMode: OperationMode
  fullName: string
  // Obrigatório no modo shared; no individual cai pro fullName.
  realtyName?: string
  email: string
  password: string
  // Telefone do corretor para alertas de handoff. Opcional no cadastro —
  // pode ser preenchido depois em /configuracoes (PATCH /api/settings/my-phone).
  phone?: string
  acceptedTerms: boolean
}

export interface SignupResult {
  userId: string
  tenantId: string
  agentId: string
  // O e-mail nasce não confirmado; o frontend dispara o e-mail de confirmação
  // (supabase.auth.resend) e o provisionamento Z-API fica bloqueado até confirmar.
  emailConfirmationRequired: true
}

export interface ProvisionResult {
  status: ZapiConnectionStatus
  // QR para escanear; null quando já conectado ou quando a instância ainda
  // está subindo (frontend faz polling em GET /api/onboarding/connection).
  qrCode: string | null
  // true quando a instância já estava conectada — nada foi recriado.
  alreadyConnected?: boolean
}

export interface ConnectionStatusResult {
  zapiStatus: ZapiConnectionStatus
  qrCode: string | null
}

// Payload do webhook de status da Z-API (callbacks "On Connected" / "On
// Disconnected" das instâncias provisionadas). Doc oficial (verificado em
// 2026-05-22 via context7 /websites/developer_z-api_io):
//   Connected:    { type: "ConnectedCallback",    connected: true,     instanceId, phone, momment }
//   Disconnected: { type: "DisconnectedCallback", disconnected: true,  instanceId, error, momment }
// Note: disconnect NÃO envia `connected: false` — o campo correto é `disconnected: true`.
export interface ZapiStatusWebhookPayload {
  instanceId: string
  type?: string
  connected?: boolean
  disconnected?: boolean
}
