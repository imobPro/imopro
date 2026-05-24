"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  formatRelative,
  initialsFrom,
  formatPhoneBR,
} from "@/lib/domain/relative-time";
import { STATUS_META } from "@/lib/domain/lead-enums";
import type { LeadStatus, LeadWithConversation } from "@/lib/types/database";

const AVATAR_SWATCHES = [
  "bg-slushie-500 text-foreground",
  "bg-lemon-400 text-foreground",
  "bg-ube-300 text-ube-800",
  "bg-pomegranate-400 text-white",
  "bg-matcha-300 text-matcha-800",
] as const;

function avatarSwatchFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % AVATAR_SWATCHES.length;
  return AVATAR_SWATCHES[idx];
}

type Filter = "all" | "unread" | "hot";

function isUnread(lead: LeadWithConversation): boolean {
  if (!lead.last_message_at) return false;
  if (!lead.last_viewed_at) return true;
  return new Date(lead.last_message_at) > new Date(lead.last_viewed_at);
}

function statusBadgeVariant(status: LeadStatus) {
  switch (status) {
    case "qualificado":
    case "fechado":
      return "fechado" as const;
    case "em_negociacao":
    case "transferido":
      return "visita" as const;
    case "em_conversa":
      return "qualificado" as const;
    case "novo":
    default:
      return "info" as const;
  }
}

type Props = {
  leads: LeadWithConversation[];
};

export function ConversationsList({ leads }: Props) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filter === "unread" && !isUnread(lead)) return false;
      if (filter === "hot" && (lead.score ?? 0) < 4) return false;
      if (!q) return true;
      const haystack = `${lead.name ?? ""} ${lead.phone} ${lead.region ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, query, filter]);

  return (
    <>
      <div className="px-4 pt-4 pb-3 flex flex-col gap-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">
            Conversas
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filtered.length}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          {/* suppressHydrationWarning: gerenciadores de senha (Kaspersky, LastPass) injetam
              caret-color/style no <input> entre SSR e hidratação. Não é bug nosso. */}
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nome, telefone..."
            className="h-10 pl-9 rounded-lg"
            aria-label="Buscar conversa"
            suppressHydrationWarning
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {(["all", "unread", "hot"] as Filter[]).map((f) => {
            const label =
              f === "all" ? "Todos" : f === "unread" ? "Não lidos" : "Quentes";
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 h-7 rounded-md text-xs font-medium transition-all duration-fast ease-out-quart",
                  active
                    ? "bg-card text-foreground shadow-clay-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhuma conversa encontrada.
          </li>
        ) : (
          filtered.map((lead) => {
            const href = `/inbox/${lead.id}`;
            const active = pathname === href;
            const unread = isUnread(lead);
            const statusMeta = STATUS_META[lead.status];
            const hot = (lead.score ?? 0) >= 4;
            return (
              <li key={lead.id}>
                <Link
                  href={href}
                  className={cn(
                    "relative flex items-start gap-3 px-4 py-3 border-b border-border/60",
                    "transition-colors duration-fast ease-out-quart",
                    active
                      ? "bg-matcha-300/20 dark:bg-matcha-300/10"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                      avatarSwatchFor(lead.id),
                    )}
                  >
                    {initialsFrom(lead.name, lead.phone)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm truncate",
                          unread ? "font-semibold text-foreground" : "font-medium text-foreground",
                        )}
                      >
                        {lead.name?.trim() || formatPhoneBR(lead.phone)}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 text-[11px] tabular-nums",
                          unread ? "text-primary font-medium" : "text-muted-foreground",
                        )}
                      >
                        {formatRelative(lead.last_message_at)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-xs truncate mt-0.5",
                        unread ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {lead.region ?? formatPhoneBR(lead.phone)}
                    </p>
                    {(hot || lead.status !== "novo") && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {hot && (
                          <Badge variant="hot" className="h-4 text-[10px] px-1.5">
                            Quente
                          </Badge>
                        )}
                        {lead.status !== "novo" && (
                          <Badge
                            variant={statusBadgeVariant(lead.status)}
                            className="h-4 text-[10px] px-1.5"
                          >
                            {statusMeta.label}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {unread && (
                    <span
                      aria-hidden
                      className="self-center size-2 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </>
  );
}
