"use client";

import { cn } from "@/lib/utils";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
};

type FilterGroup<T extends string> = {
  key: string;
  label: string;
  options: FilterOption<T>[];
  selected: Set<T>;
  onToggle: (value: T) => void;
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  groups: FilterGroup<any>[];
  onClearAll?: () => void;
};

export function FilterChips({ groups, onClearAll }: Props) {
  const hasAnySelected = groups.some((g) => g.selected.size > 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-clay-card">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1.5 shrink-0">
            {group.label}
          </span>
          {group.options.map((opt) => {
            const active = group.selected.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => group.onToggle(opt.value)}
                data-active={active || undefined}
                className={cn(
                  "inline-flex h-7 items-center justify-center rounded-full border px-3 text-xs font-medium",
                  "transition-all duration-fast ease-out-quart",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-clay-card"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ))}
      {hasAnySelected && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="self-start text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors duration-fast"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
