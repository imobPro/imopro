"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/domain/lead-enums";
import type { LeadStatus, LeadWithConversation } from "@/lib/types/database";
import { LeadCardMini } from "./lead-card-mini";

const PER_STATUS_LIMIT = 20;

type Props = {
  status: LeadStatus;
  leads: LeadWithConversation[];
};

export function FunnelColumn({ status, leads }: Props) {
  const meta = STATUS_META[status];
  const [open, setOpen] = useState(true);

  return (
    <section className="flex flex-col rounded-xl border bg-card md:w-72 md:shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 px-3 py-2 md:cursor-default md:pointer-events-none"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {meta.label}
          <Badge variant="secondary" className="tabular-nums">
            {leads.length}
          </Badge>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform md:hidden",
            !open && "-rotate-90",
          )}
        />
      </button>

      <div
        className={cn(
          "flex-col gap-2 p-2 md:flex md:max-h-[calc(100dvh-12rem)] md:overflow-y-auto",
          open ? "flex" : "hidden",
        )}
      >
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 px-2">
            Nenhum lead nesse status.
          </p>
        ) : (
          <>
            {leads.map((lead) => (
              <LeadCardMini key={lead.id} lead={lead} />
            ))}
            {leads.length >= PER_STATUS_LIMIT && (
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                Mostrando os {PER_STATUS_LIMIT} mais recentes
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
