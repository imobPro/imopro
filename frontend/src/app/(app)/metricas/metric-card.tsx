import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export type MetricRow = {
  label: string;
  value: number;
};

type Accent = "matcha" | "slushie" | "lemon" | "ube" | "pomegranate";

type Props = {
  title: string;
  description?: string;
  rows?: MetricRow[];
  highlight?: { value: number; label: string; tone?: "default" | "warning" };
  index?: number;
  accent?: Accent;
};

const DEFAULT_ACCENTS: Accent[] = [
  "slushie",
  "matcha",
  "lemon",
  "ube",
  "pomegranate",
];

export function MetricCard({
  title,
  description,
  rows,
  highlight,
  index = 0,
  accent,
}: Props) {
  const delay = Math.min(index, 6) * 60;
  const isWarningHot = highlight?.tone === "warning" && highlight.value > 0;
  const resolvedAccent: Accent =
    accent ?? (isWarningHot ? "pomegranate" : DEFAULT_ACCENTS[index % DEFAULT_ACCENTS.length]);

  return (
    <Card
      variant="clay"
      accent={resolvedAccent}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "gap-3 p-5 pt-6",
        "animate-in fade-in slide-in-from-bottom-2 ease-out-quart fill-mode-both",
        "duration-[var(--duration-base)]",
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground/80">{description}</p>
        )}
      </div>

      {highlight && (
        <div className="flex items-baseline gap-2 pt-1">
          <span
            className={cn(
              "font-display-tight tabular-nums",
              "text-5xl md:text-6xl",
              isWarningHot ? "text-pomegranate-400" : "text-foreground",
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
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-display-tight text-2xl tabular-nums text-foreground">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
