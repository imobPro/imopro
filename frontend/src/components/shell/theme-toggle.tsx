"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ThemeToggle({ className }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleClick = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema claro/escuro"
      className={cn(
        "relative inline-flex items-center justify-center size-8 rounded-md",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "transition-colors duration-fast",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute size-4 transition-all duration-base ease-out-quart",
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-50 opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute size-4 transition-all duration-base ease-out-quart",
          isDark
            ? "rotate-90 scale-50 opacity-0"
            : "rotate-0 scale-100 opacity-100",
        )}
      />
    </button>
  );
}
