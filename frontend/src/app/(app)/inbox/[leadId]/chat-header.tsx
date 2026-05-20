import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatPhoneBR,
  initialsFrom,
} from "@/lib/domain/relative-time";
import type { LeadWithConversation } from "@/lib/types/database";
import { StatusSelector } from "./status-selector";
import { LeadEditDialog } from "./lead-edit-dialog";

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function ChatHeader({ lead }: { lead: LeadWithConversation }) {
  const waHref = `https://wa.me/${digitsOnly(lead.phone)}`;
  const isHotLead = (lead.score ?? 0) >= 4;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <Avatar
          size="default"
          className={cn(
            "transition-shadow duration-base",
            isHotLead && "ring-2 ring-primary/40 ring-offset-2 ring-offset-card",
          )}
        >
          <AvatarFallback
            className={cn(
              "rounded-xl font-semibold",
              isHotLead
                ? "bg-pomegranate-400/25 text-pomegranate-400"
                : "bg-ube-300/40 text-ube-800 dark:bg-ube-300/15 dark:text-ube-300",
            )}
          >
            {initialsFrom(lead.name, lead.phone)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">
            {lead.name?.trim() || "Sem nome"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            <span className="font-mono">{formatPhoneBR(lead.phone)}</span>
            {lead.region ? <span> · {lead.region}</span> : ""}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <StatusSelector leadId={lead.id} status={lead.status} />
          <LeadEditDialog lead={lead} />
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={waHref} target="_blank" rel="noreferrer">
                <ExternalLink />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            }
          />
        </div>
      </div>
    </header>
  );
}
