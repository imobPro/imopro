import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

export function LeadCard({ lead }: { lead: LeadWithConversation }) {
  const sentiment = pickSentiment(lead);
  const intentMeta =
    lead.intent && lead.intent !== "desconhecido" ? INTENT_META[lead.intent] : null;
  const sentimentMeta = sentiment ? SENTIMENT_META[sentiment] : null;

  return (
    <Link
      href={`/inbox/${lead.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card
        size="sm"
        className={cn(
          "flex-row items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40",
        )}
      >
        <Avatar size="default">
          <AvatarFallback>{initialsFrom(lead.name, lead.phone)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {lead.name?.trim() || "Sem nome"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {formatPhoneBR(lead.phone)}
            {lead.region ? ` · ${lead.region}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatRelative(lead.last_message_at)}
          </span>
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
