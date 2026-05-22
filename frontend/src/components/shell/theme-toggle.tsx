"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ThemeToggle({ className }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes resolve o tema no cliente (localStorage/system). No SSR
  // `resolvedTheme` é undefined — renderizar os ícones com a classe final só
  // depois do mount evita hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

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
      suppressHydrationWarning
    >
      <Sun
        suppressHydrationWarning
        className={cn(
          "absolute size-4 transition-all duration-base ease-out-quart",
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-50 opacity-0",
        )}
      />
      <Moon
        suppressHydrationWarning
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
