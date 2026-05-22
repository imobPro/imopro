import Link from "next/link";
import { fetchBackend } from "@/lib/backend";
import {
  toBannerVariant,
  type BannerVariant,
  type SubscriptionResponse,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

const variantClasses: Record<Exclude<BannerVariant, "hidden">, string> = {
  neutral: "border-b border-border bg-muted/60 text-muted-foreground",
  warning:
    "border-b border-lemon-700/30 bg-lemon-400/20 text-foreground dark:bg-lemon-400/10",
  danger:
    "border-b border-pomegranate-400/30 bg-pomegranate-400/10 text-foreground",
};

const ctaClasses: Record<Exclude<BannerVariant, "hidden">, string> = {
  neutral: "text-foreground hover:underline",
  warning: "text-foreground hover:underline",
  danger: "text-pomegranate-400 hover:underline",
};

export async function TrialBanner() {
  const result = await fetchBackend<SubscriptionResponse>("/api/subscription");

  // Se a chamada falhar (rede, backend down), não bloqueia o painel — apenas
  // esconde o banner. Erros de auth já redirecionam via middleware/layout.
  if (!result.ok) return null;

  const copy = toBannerVariant(result.data.subscription, result.data.zapiStatus);
  if (copy.variant === "hidden") return null;

  return (
    <div
      role="region"
      aria-label="Status da assinatura"
      className={cn(
        "flex items-center gap-3 px-4 py-2 text-sm",
        variantClasses[copy.variant],
      )}
    >
      <p className="flex-1">{copy.message}</p>
      <Link
        href={copy.ctaHref}
        className={cn("text-sm font-medium", ctaClasses[copy.variant])}
      >
        {copy.ctaLabel}
      </Link>
    </div>
  );
}
