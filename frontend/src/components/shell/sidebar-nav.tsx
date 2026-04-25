"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { signOutAction } from "@/app/login/actions";
import { ThemeToggle } from "./theme-toggle";

export function SidebarNav({ agentName }: { agentName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-r bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-5 border-b">
        <p className="text-lg font-semibold">ImobPro</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {agentName}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/50 text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 px-3 py-4 border-t">
        <form action={signOutAction} className="flex-1">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </form>
        <ThemeToggle />
      </div>
    </aside>
  );
}
