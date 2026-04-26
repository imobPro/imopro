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
};

export function MetricCard({ title, description, rows, highlight }: Props) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground/80">{description}</p>
        )}
      </div>

      {highlight && (
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-3xl font-semibold tabular-nums",
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
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-baseline justify-between text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium tabular-nums">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
