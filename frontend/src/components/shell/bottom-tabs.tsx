"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "./nav-items";

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <ul
        className="grid h-16"
        style={{
          gridTemplateColumns: `repeat(${MOBILE_NAV.length}, minmax(0, 1fr))`,
        }}
      >
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const label = item.shortLabel ?? item.label.split(" ")[0];
          return (
            <li key={item.href} className="relative flex items-center justify-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 w-full h-full",
                  "text-[11px] font-medium transition-colors duration-fast ease-out-quart",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* Pill Material 3 — fundo arredondado atrás do ícone quando ativo */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1.5 h-7 w-14 rounded-full transition-all duration-base ease-out-quart",
                    active ? "bg-primary/12 scale-100 opacity-100" : "scale-50 opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "relative z-10 size-5 transition-transform duration-fast ease-out-quart",
                    active && "scale-110",
                  )}
                />
                <span className="relative z-10 leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
