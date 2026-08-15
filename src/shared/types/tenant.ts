// Estados da conexão Z-API do tenant. Compartilhado entre onboarding (dono
// original), billing (frontend banner) e shared/database (leitura da coluna).
export type ZapiConnectionStatus = 'not_provisioned' | 'awaiting_qr' | 'connected' | 'disconnected'
