import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatPhoneBR, formatRelative } from "@/lib/domain/relative-time";
import type { LeadWithConversation } from "@/lib/types/database";

export function LeadCardMini({ lead }: { lead: LeadWithConversation }) {
  return (
    <Link
      href={`/inbox/${lead.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card
        size="sm"
        className="gap-1 px-3 py-2 transition-colors hover:bg-muted/40"
      >
        <p className="text-sm font-medium truncate">
          {lead.name?.trim() || "Sem nome"}
        </p>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{formatPhoneBR(lead.phone)}</span>
          <span className="tabular-nums shrink-0">
            {formatRelative(lead.last_message_at)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
