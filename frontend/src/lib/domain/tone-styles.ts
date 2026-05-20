import type { Tone } from "./lead-enums";

export const TONE_DOT_CLASS: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  info: "bg-slushie-500",
  success: "bg-matcha-600",
  warning: "bg-lemon-500",
  danger: "bg-pomegranate-400",
};

export const TONE_BADGE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-slushie-500/15 text-slushie-800 border-slushie-500/25 dark:bg-slushie-500/20 dark:text-slushie-500",
  success: "bg-matcha-300/40 text-matcha-800 border-matcha-600/25 dark:bg-matcha-300/15 dark:text-matcha-300",
  warning: "bg-lemon-400/30 text-lemon-700 border-lemon-700/25 dark:bg-lemon-400/20 dark:text-lemon-400",
  danger: "bg-pomegranate-400/20 text-pomegranate-400 border-pomegranate-400/30",
};
