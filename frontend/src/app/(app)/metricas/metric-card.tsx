import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export type MetricRow = {
  label: string;
  value: number;
};

type Props = {
  title: string;
  description?: string;
  rows?: MetricRow[];
  highlight?: { value: number; label: string; tone?: "default" | "warning" };
  index?: number;
};

export function MetricCard({ title, description, rows, highlight, index = 0 }: Props) {
  const delay = Math.min(index, 6) * 60;

  return (
    <Card
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "gap-3 p-5",
        "animate-in fade-in slide-in-from-bottom-2 ease-out-quart fill-mode-both",
        "duration-[var(--duration-base)]",
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {highlight && (
        <div className="flex items-baseline gap-2 pt-1">
          <span
            className={cn(
              "font-display tabular-nums leading-none",
              "text-5xl md:text-6xl",
              highlight.tone === "warning" && highlight.value > 0
                ? "text-destructive"
                : "text-foreground",
            )}
          >
            {highlight.value}
          </span>
          <span className="text-xs text-muted-foreground">
            {highlight.label}
          </span>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-display text-2xl tabular-nums leading-none text-foreground">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
