"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  list: React.ReactNode;
  children: React.ReactNode;
};

export function InboxLayoutShell({ list, children }: Props) {
  const pathname = usePathname();
  // Em /inbox: mostra só a lista no mobile e (lista + empty state) no desktop.
  // Em /inbox/[leadId]: mostra só o chat no mobile e (lista + chat) no desktop.
  const isDetail = pathname !== "/inbox";

  return (
    <div className="flex h-[calc(100dvh-3.5rem-5rem)] md:h-dvh">
      <aside
        className={cn(
          "w-full md:w-[340px] md:shrink-0 border-r border-border bg-card",
          isDetail && "hidden md:flex md:flex-col",
          !isDetail && "flex flex-col",
        )}
        aria-label="Lista de conversas"
      >
        {list}
      </aside>

      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col bg-background",
          !isDetail && "hidden md:flex",
        )}
      >
        {children}
      </div>
    </div>
  );
}
