export type LeadStatus =
  | "novo"
  | "em_conversa"
  | "qualificado"
  | "transferido"
  | "em_negociacao"
  | "fechado";

export type LeadProfile =
  | "comprador"
  | "inquilino"
  | "vendedor"
  | "captacao"
  | "investidor"
  | "indicador";

export type IntentType =
  | "compra"
  | "aluguel"
  | "venda"
  | "informacao"
  | "visita"
  | "desconhecido";

export type Sentiment = "positivo" | "neutro" | "negativo";

export type Lead = {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  phone: string;
  name: string | null;
  region: string | null;
  status: LeadStatus;
  score: number;
  profile: LeadProfile | null;
  intent: IntentType | null;
  last_message_at: string | null;
  created_at: string;
};

export type LeadWithConversation = Lead & {
  conversations: { sentiment: Sentiment | null }[];
};
