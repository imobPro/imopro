import type { Tone } from "./lead-enums";

export const TONE_DOT_CLASS: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  info: "bg-chart-2",
  success: "bg-primary",
  warning: "bg-chart-3",
  danger: "bg-destructive",
};

export const TONE_BADGE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  success: "bg-primary/15 text-primary border-primary/25",
  warning: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
};
