import { cn } from "@/lib/utils";

const SCORE_CLASS: Record<number, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-muted text-foreground/70",
  3: "bg-primary/15 text-primary border border-primary/25",
  4: "bg-primary/40 text-primary-foreground",
  5: "bg-primary text-primary-foreground shadow-sm",
};

export function ScoreBadge({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  const value = Math.max(1, Math.min(5, score ?? 1));
  return (
    <span
      aria-label={`Score ${value} de 5`}
      className={cn(
        "inline-flex items-center justify-center size-6 rounded-full text-[11px] font-medium tabular-nums",
        "transition-colors duration-base ease-out-quart",
        SCORE_CLASS[value],
        className,
      )}
    >
      {value}
    </span>
  );
}
