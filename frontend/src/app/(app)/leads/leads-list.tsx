"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ListFilter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChips, type FilterOption } from "./filter-chips";
import { LeadCard } from "./lead-card";
import {
  FILTER_INTENTS,
  INTENT_META,
  SENTIMENT_META,
  SENTIMENT_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/domain/lead-enums";
import type {
  IntentType,
  LeadStatus,
  LeadWithConversation,
  Sentiment,
} from "@/lib/types/database";

const HIT_LIMIT_HINT = 100;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function LeadsList({
  initialLeads,
}: {
  initialLeads: LeadWithConversation[];
}) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Set<LeadStatus>>(new Set());
  const [sentiments, setSentiments] = useState<Set<Sentiment>>(new Set());
  const [intents, setIntents] = useState<Set<IntentType>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return initialLeads.filter((lead) => {
      if (statuses.size > 0 && !statuses.has(lead.status)) return false;

      if (sentiments.size > 0) {
        const s = lead.conversations?.[0]?.sentiment ?? null;
        if (!s || !sentiments.has(s)) return false;
      }

      if (intents.size > 0) {
        if (!lead.intent || !intents.has(lead.intent)) return false;
      }

      if (q) {
        const inName = lead.name && normalize(lead.name).includes(q);
        const inPhone = lead.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        const inRegion = lead.region && normalize(lead.region).includes(q);
        if (!inName && !inPhone && !inRegion) return false;
      }

      return true;
    });
  }, [deferredQuery, initialLeads, statuses, sentiments, intents]);

  const statusOptions: FilterOption<LeadStatus>[] = STATUS_ORDER.map((s) => ({
    value: s,
    label: STATUS_META[s].label,
  }));

  const sentimentOptions: FilterOption<Sentiment>[] = SENTIMENT_ORDER.map((s) => ({
    value: s,
    label: SENTIMENT_META[s].label,
  }));

  const intentOptions: FilterOption<IntentType>[] = FILTER_INTENTS.map((i) => ({
    value: i,
    label: INTENT_META[i].label,
  }));

  const groups = [
    {
      key: "status",
      label: "Status",
      options: statusOptions,
      selected: statuses,
      onToggle: (v: LeadStatus) => setStatuses(toggleSet(statuses, v)),
    },
    {
      key: "sentiment",
      label: "Sentimento",
      options: sentimentOptions,
      selected: sentiments,
      onToggle: (v: Sentiment) => setSentiments(toggleSet(sentiments, v)),
    },
    {
      key: "intent",
      label: "Interesse",
      options: intentOptions,
      selected: intents,
      onToggle: (v: IntentType) => setIntents(toggleSet(intents, v)),
    },
  ];

  const clearAll = () => {
    setQuery("");
    setStatuses(new Set());
    setSentiments(new Set());
    setIntents(new Set());
  };

  const activeFilterCount = statuses.size + sentiments.size + intents.size;
  const hasFilter = !!query || activeFilterCount > 0;
  const isEmpty = initialLeads.length === 0;
  const noMatch = !isEmpty && filtered.length === 0;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, telefone ou bairro"
              className="pl-8 h-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="leads-filters-panel"
            className="h-9 shrink-0"
          >
            <ListFilter />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
        {filtersOpen && (
          <div id="leads-filters-panel">
            <FilterChips groups={groups} onClearAll={clearAll} />
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filtered.length} de {initialLeads.length}{" "}
            {initialLeads.length === 1 ? "lead" : "leads"}
          </span>
          {initialLeads.length >= HIT_LIMIT_HINT && (
            <span>Exibindo os {HIT_LIMIT_HINT} mais recentes</span>
          )}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          title="Nenhum lead ainda"
          body="Os leads aparecem aqui assim que chegam mensagens no WhatsApp."
        />
      ) : noMatch ? (
        <EmptyState
          title="Nenhum lead encontrado"
          body="Ajuste a busca ou os filtros para ver mais resultados."
          action={
            hasFilter ? (
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-primary hover:underline underline-offset-2"
              >
                Limpar filtros
              </button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((lead) => (
            <li key={lead.id}>
              <LeadCard lead={lead} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 px-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm">{body}</p>
      {action}
    </div>
  );
}
