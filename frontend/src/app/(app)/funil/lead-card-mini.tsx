import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import { cn } from "@/lib/utils";
import { formatPhoneBR, formatRelative } from "@/lib/domain/relative-time";
import type { LeadWithConversation } from "@/lib/types/database";

export function LeadCardMini({ lead }: { lead: LeadWithConversation }) {
  return (
    <Link
      href={`/inbox/${lead.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl group"
    >
      <Card
        size="sm"
        className={cn(
          "gap-1.5 px-3 py-2.5",
          "transition-all duration-fast ease-out-quart",
          "hover:-translate-y-px hover:shadow-sm hover:bg-muted/30",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">
            {lead.name?.trim() || "Sem nome"}
          </p>
          <ScoreBadge score={lead.score} className="size-5 text-[10px]" />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate font-mono">{formatPhoneBR(lead.phone)}</span>
          <span className="tabular-nums shrink-0">
            {formatRelative(lead.last_message_at)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
