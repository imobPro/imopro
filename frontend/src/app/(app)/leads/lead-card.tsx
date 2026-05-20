import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/ui/score-badge";
import { cn } from "@/lib/utils";
import {
  INTENT_META,
  SENTIMENT_META,
} from "@/lib/domain/lead-enums";
import { formatPhoneBR, formatRelative, initialsFrom } from "@/lib/domain/relative-time";
import type {
  IntentType,
  LeadWithConversation,
  Sentiment,
} from "@/lib/types/database";

function pickSentiment(lead: LeadWithConversation): Sentiment | null {
  const conv = lead.conversations?.[0];
  return conv?.sentiment ?? null;
}

function isUnread(lead: LeadWithConversation): boolean {
  if (!lead.last_message_at) return false;
  if (!lead.last_viewed_at) return true;
  return lead.last_viewed_at < lead.last_message_at;
}

const SENTIMENT_BADGE: Record<Sentiment, "fechado" | "info" | "hot"> = {
  positivo: "fechado",
  neutro: "info",
  negativo: "hot",
};

const INTENT_BADGE: Record<IntentType, "qualificado" | "visita" | "info"> = {
  compra: "qualificado",
  aluguel: "qualificado",
  venda: "qualificado",
  visita: "visita",
  informacao: "info",
  desconhecido: "info",
};

export function LeadCard({ lead }: { lead: LeadWithConversation }) {
  const sentiment = pickSentiment(lead);
  const intentMeta =
    lead.intent && lead.intent !== "desconhecido" ? INTENT_META[lead.intent] : null;
  const sentimentMeta = sentiment ? SENTIMENT_META[sentiment] : null;
  const isHot = (lead.score ?? 0) >= 4;
  const unread = isUnread(lead);

  return (
    <Link
      href={`/inbox/${lead.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl group"
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card",
          "transition-all duration-fast ease-out-quart",
          "hover:-translate-y-0.5 hover:shadow-clay-soft",
        )}
      >
        <Avatar
          size="default"
          className={cn(
            "transition-shadow duration-base",
            isHot && "ring-2 ring-pomegranate-400/40 ring-offset-2 ring-offset-card",
          )}
        >
          <AvatarFallback
            className={cn(
              "rounded-xl font-semibold",
              isHot
                ? "bg-pomegranate-400/20 text-pomegranate-400"
                : "bg-ube-300/40 text-ube-800 dark:bg-ube-300/15 dark:text-ube-300",
            )}
          >
            {initialsFrom(lead.name, lead.phone)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm flex items-center gap-1.5">
            {unread && (
              <span
                aria-label="Não lido"
                className="size-1.5 rounded-full bg-primary shrink-0"
              />
            )}
            <span className={cn("truncate", unread ? "font-semibold" : "font-medium")}>
              {lead.name?.trim() || "Sem nome"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            <span className="font-mono">{formatPhoneBR(lead.phone)}</span>
            {lead.region ? ` · ${lead.region}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatRelative(lead.last_message_at)}
            </span>
            <ScoreBadge score={lead.score} />
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {sentimentMeta && sentiment && (
              <Badge variant={SENTIMENT_BADGE[sentiment]}>
                {sentimentMeta.label}
              </Badge>
            )}
            {intentMeta && lead.intent && (
              <Badge variant={INTENT_BADGE[lead.intent]}>
                {intentMeta.label}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
