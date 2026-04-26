import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="flex items-center gap-3 px-3 py-2 md:px-6 md:py-3">
        <Link
          href="/leads"
          className="md:hidden inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Voltar para Leads"
        >
          <ArrowLeft className="size-4" />
        </Link>

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
