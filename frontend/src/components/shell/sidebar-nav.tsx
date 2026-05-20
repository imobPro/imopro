"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "./nav-items";
import { signOutAction } from "@/app/login/actions";
import { ThemeToggle } from "./theme-toggle";
import { HomeMark } from "@/components/brand/home-mark";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarNav({ agentName }: { agentName: string }) {
  const pathname = usePathname();
  const initials = getInitials(agentName) || "—";

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 border-r bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <HomeMark containerClassName="size-9 rounded-xl shadow-clay-card" />
          <p className="font-display text-xl font-semibold leading-none text-foreground">
            ImobPro
          </p>
        </div>
      </div>

      {/* Sections */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group/nav-item relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                    "border border-transparent transition-all duration-fast ease-out-quart",
                    active
                      ? "bg-primary text-primary-foreground font-medium shadow-clay-card"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:border-dashed hover:border-sidebar-border",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-fast ease-out-quart",
                      active ? "opacity-100" : "opacity-80",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — user card */}
      <div className="px-3 py-3 border-t border-sidebar-border flex flex-col gap-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors duration-fast">
          <span
            aria-hidden
            className="inline-flex size-9 items-center justify-center rounded-lg bg-slushie-500 text-foreground text-sm font-semibold"
          >
            {initials}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{agentName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              Corretor
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1">
          <form action={signOutAction} className="flex-1">
            <button
              type="submit"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                "transition-colors duration-fast",
              )}
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
