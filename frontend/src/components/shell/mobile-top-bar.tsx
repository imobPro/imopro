"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, getNavTitleForPath } from "./nav-items";
import { HomeMark } from "@/components/brand/home-mark";

type Props = {
  agentName: string;
  /** Sobrescreve o título dinâmico (ex.: nome do lead em /inbox/[leadId]). */
  title?: string;
};

function findParentRoute(pathname: string): string | null {
  const parent = NAV_ITEMS.find((i) => pathname.startsWith(`${i.href}/`));
  return parent?.href ?? null;
}

export function MobileTopBar({ agentName, title }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const parentRoute = findParentRoute(pathname);
  const isSubRoute = parentRoute !== null;
  const resolvedTitle = title ?? getNavTitleForPath(pathname) ?? "ImobPro";

  return (
    <header
      className={cn(
        "md:hidden sticky top-0 z-20 flex items-center bg-card border-b border-border h-14 px-2 gap-1",
      )}
    >
      {isSubRoute ? (
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center size-11 rounded-full text-foreground transition-colors duration-fast active:bg-foreground/8"
        >
          <ArrowLeft className="size-5" />
        </button>
      ) : (
        <Link
          href="/inbox"
          aria-label="ImobPro"
          className="flex items-center gap-2 pl-2"
        >
          <HomeMark containerClassName="size-8 rounded-lg" />
        </Link>
      )}

      <div className="flex-1 min-w-0 px-1">
        <p className="font-display text-lg font-medium leading-tight truncate text-foreground">
          {resolvedTitle}
        </p>
        {!isSubRoute && (
          <p className="text-[11px] text-muted-foreground leading-tight truncate">
            {agentName}
          </p>
        )}
      </div>
    </header>
  );
}
