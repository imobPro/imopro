"use client";

import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1 shrink-0">
            {group.label}
          </span>
          {group.options.map((opt) => {
            const active = group.selected.has(opt.value);
            return (
              <Button
                key={opt.value}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => group.onToggle(opt.value)}
                data-active={active || undefined}
                className={cn(
                  "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary",
                )}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      ))}
      {hasAnySelected && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="self-start text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
