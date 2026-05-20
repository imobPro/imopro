import { cn } from "@/lib/utils";

// Paleta progressiva — frio (pomegranate) → quente (matcha). Score alto = lead pronto pra fechar.
const SCORE_CLASS: Record<number, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-pomegranate-400/15 text-pomegranate-400 dark:bg-pomegranate-400/20",
  3: "bg-lemon-400/30 text-lemon-700 dark:bg-lemon-400/20 dark:text-lemon-400",
  4: "bg-matcha-300/40 text-matcha-800 dark:bg-matcha-300/25 dark:text-matcha-300",
  5: "bg-matcha-600 text-primary-foreground shadow-clay-card",
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
