"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/domain/lead-enums";
import { TONE_DOT_CLASS } from "@/lib/domain/tone-styles";
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
  const hasLeads = leads.length > 0;

  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border bg-card md:w-72 md:shrink-0",
        "transition-shadow duration-base",
        hasLeads && "shadow-xs",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 px-3 py-2.5 md:cursor-default md:pointer-events-none"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full transition-colors duration-base",
              TONE_DOT_CLASS[meta.tone],
            )}
          />
          {meta.label}
          <span className="inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded-full bg-muted text-muted-foreground text-[11px] tabular-nums">
            {leads.length}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-base ease-out-quart md:hidden",
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
          <p className="font-display italic text-sm text-muted-foreground text-center py-6 px-2">
            Nenhum lead aqui
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
