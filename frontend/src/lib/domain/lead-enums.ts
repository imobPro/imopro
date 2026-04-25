import type {
  IntentType,
  LeadProfile,
  LeadStatus,
  Sentiment,
} from "@/lib/types/database";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export type EnumMeta<T extends string> = Record<T, { label: string; tone: Tone }>;

export const STATUS_META: EnumMeta<LeadStatus> = {
  novo: { label: "Novo", tone: "info" },
  em_conversa: { label: "Em conversa", tone: "info" },
  qualificado: { label: "Qualificado", tone: "success" },
  transferido: { label: "Transferido", tone: "warning" },
  em_negociacao: { label: "Em negociação", tone: "warning" },
  fechado: { label: "Fechado", tone: "success" },
};

export const PROFILE_META: EnumMeta<LeadProfile> = {
  comprador: { label: "Comprador", tone: "neutral" },
  inquilino: { label: "Inquilino", tone: "neutral" },
  vendedor: { label: "Vendedor", tone: "neutral" },
  captacao: { label: "Captação", tone: "neutral" },
  investidor: { label: "Investidor", tone: "neutral" },
  indicador: { label: "Indicador", tone: "neutral" },
};

export const INTENT_META: EnumMeta<IntentType> = {
  compra: { label: "Compra", tone: "info" },
  aluguel: { label: "Aluguel", tone: "info" },
  venda: { label: "Venda", tone: "info" },
  informacao: { label: "Informação", tone: "neutral" },
  visita: { label: "Visita", tone: "success" },
  desconhecido: { label: "Desconhecido", tone: "neutral" },
};

export const SENTIMENT_META: EnumMeta<Sentiment> = {
  positivo: { label: "Positivo", tone: "success" },
  neutro: { label: "Neutro", tone: "neutral" },
  negativo: { label: "Negativo", tone: "danger" },
};

export const STATUS_ORDER: LeadStatus[] = [
  "novo",
  "em_conversa",
  "qualificado",
  "transferido",
  "em_negociacao",
  "fechado",
];

export const SENTIMENT_ORDER: Sentiment[] = ["positivo", "neutro", "negativo"];

export const FILTER_INTENTS: IntentType[] = [
  "compra",
  "aluguel",
  "venda",
  "visita",
  "informacao",
];

const TONE_TO_BADGE: Record<Tone, "default" | "secondary" | "destructive" | "outline"> = {
  neutral: "secondary",
  info: "outline",
  success: "default",
  warning: "outline",
  danger: "destructive",
};

export function badgeVariantForTone(tone: Tone) {
  return TONE_TO_BADGE[tone];
}
