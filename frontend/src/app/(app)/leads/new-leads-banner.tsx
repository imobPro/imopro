"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { countLeadsSince } from "@/lib/queries/leads";

type Props = {
  tenantId: string;
  loadedAt: string;
};

export function NewLeadsBanner({ tenantId, loadedAt }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const { data: count = 0 } = useQuery({
    queryKey: ["leads-count-since", tenantId, loadedAt],
    queryFn: async () => {
      try {
        const supabase = createClient();
        return await countLeadsSince(supabase, tenantId, loadedAt);
      } catch {
        return 0;
      }
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  if (count <= 0) return null;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-lemon-700/30 bg-lemon-400/20 px-4 py-2.5 text-sm animate-in fade-in slide-in-from-top-1 duration-base ease-out-quart dark:bg-lemon-400/10">
      <div className="flex items-center gap-2 text-foreground min-w-0">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lemon-500 text-foreground">
          <ArrowDown className="size-3.5" />
        </span>
        <span className="truncate font-medium">
          {count === 1
            ? "1 novo lead desde que você abriu a tela"
            : `${count} novos leads desde que você abriu a tela`}
        </span>
      </div>
      <Button
        type="button"
        variant="clay-secondary"
        size="xs"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        Atualizar
      </Button>
    </div>
  );
}
