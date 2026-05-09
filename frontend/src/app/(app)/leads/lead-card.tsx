import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import { cn } from "@/lib/utils";
import {
  INTENT_META,
  SENTIMENT_META,
  badgeVariantForTone,
} from "@/lib/domain/lead-enums";
import { formatPhoneBR, formatRelative, initialsFrom } from "@/lib/domain/relative-time";
import type { LeadWithConversation, Sentiment } from "@/lib/types/database";

function pickSentiment(lead: LeadWithConversation): Sentiment | null {
  const conv = lead.conversations?.[0];
  return conv?.sentiment ?? null;
}

function isUnread(lead: LeadWithConversation): boolean {
  if (!lead.last_message_at) return false;
  if (!lead.last_viewed_at) return true;
  return lead.last_viewed_at < lead.last_message_at;
}

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
      <Card
        size="sm"
        className={cn(
          "flex-row items-center gap-3 px-3 py-3",
          "transition-all duration-fast ease-out-quart",
          "hover:-translate-y-px hover:shadow-sm hover:bg-muted/40",
        )}
      >
        <Avatar
          size="default"
          className={cn(
            "transition-shadow duration-base",
            isHot && "ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
          )}
        >
          <AvatarFallback className={cn(isHot && "bg-primary/15 text-primary")}>
            {initialsFrom(lead.name, lead.phone)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm truncate flex items-center gap-1.5">
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
          <p className="text-xs text-muted-foreground truncate">
            <span className="font-mono">{formatPhoneBR(lead.phone)}</span>
            {lead.region ? ` · ${lead.region}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatRelative(lead.last_message_at)}
            </span>
            <ScoreBadge score={lead.score} />
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {sentimentMeta && (
              <Badge variant={badgeVariantForTone(sentimentMeta.tone)}>
                {sentimentMeta.label}
              </Badge>
            )}
            {intentMeta && (
              <Badge variant={badgeVariantForTone(intentMeta.tone)}>
                {intentMeta.label}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
