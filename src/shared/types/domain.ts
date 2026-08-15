// Tipos de domínio compartilhados entre múltiplos módulos.
// Antes moravam em modules/whatsapp/whatsapp.types e modules/ai-engine/ai-engine.types,
// mas o import cross-module violava a fronteira. A fonte de verdade agora é aqui.

// Perfis de lead — 6 tipos de negócio (Sprint 3 CRM + Sprint 1 webhook).
export type LeadProfile =
  | 'comprador'
  | 'inquilino'
  | 'vendedor'
  | 'captacao'    // proprietário quer que a imobiliária administre o imóvel
  | 'investidor'  // compra para alugar ou revender
  | 'indicador'   // indica outra pessoa, sem interesse direto

// Intenção detectada pela IA em cada mensagem (Sprint 2 ai-engine).
export type IntentType =
  | 'compra'
  | 'aluguel'
  | 'venda'
  | 'informacao'
  | 'visita'
  | 'desconhecido'

// Mensagem pendente na fila de debounce — produzida pelo whatsapp.service ao
// receber webhook e consumida pelo ai-engine para gerar resposta.
// Mora em shared/types porque atravessa a fronteira dos dois módulos.
export interface PendingMessage {
  text: string | null
  mediaUrl: string | null
  mimeType: string | null
  type: 'text' | 'audio' | 'image' | 'document' | 'sticker' | 'location'
  timestamp: number
}
