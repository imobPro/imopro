"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/domain/lead-enums";
import type { LeadStatus, LeadWithConversation } from "@/lib/types/database";
import { LeadCardMini } from "./lead-card-mini";

const PER_STATUS_LIMIT = 20;

// Cada status do funil ganha uma cor swatch — visual de "Clay swatches"
const STATUS_DOT: Record<LeadStatus, string> = {
  novo: "bg-slushie-500",
  em_conversa: "bg-slushie-800",
  qualificado: "bg-ube-300",
  transferido: "bg-lemon-500",
  em_negociacao: "bg-lemon-700",
  fechado: "bg-matcha-600",
};

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
        "flex flex-col rounded-2xl border border-border bg-card md:w-72 md:shrink-0",
        "transition-all duration-base ease-out-quart",
        hasLeads && "shadow-clay-card",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 px-4 py-3 md:cursor-default md:pointer-events-none border-b border-border/60"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold">
          <span
            aria-hidden
            className={cn("size-2.5 rounded-sm", STATUS_DOT[status])}
          />
          {meta.label}
          <span className="inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium tabular-nums">
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
          "flex-col gap-2 p-2 md:flex md:max-h-[calc(100dvh-14rem)] md:overflow-y-auto",
          open ? "flex" : "hidden",
        )}
      >
        {leads.length === 0 ? (
          <p className="text-sm italic text-muted-foreground text-center py-8 px-2">
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
