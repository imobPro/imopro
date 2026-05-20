import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchBackend } from "@/lib/backend";
import type {
  SubscriptionResponse,
  SubscriptionStatus,
} from "@/lib/subscription";
import { UpgradeCta } from "./upgrade-cta";

export const metadata = { title: "Assinatura — ImobPro" };
export const dynamic = "force-dynamic";

type MePayload = { email: string | null };

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: "Trial em andamento",
  expired: "Trial encerrado",
  active: "Plano ativo",
  canceled: "Assinatura cancelada",
};

const STATUS_VARIANT: Record<
  SubscriptionStatus,
  "qualificado" | "visita" | "fechado" | "hot"
> = {
  trial: "visita",
  expired: "hot",
  active: "fechado",
  canceled: "hot",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AssinaturaPage() {
  const [subRes, meRes] = await Promise.all([
    fetchBackend<SubscriptionResponse>("/api/subscription"),
    fetchBackend<MePayload>("/api/me"),
  ]);

  if (!subRes.ok) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Não foi possível carregar sua assinatura. Recarregue a página.
        </div>
      </div>
    );
  }

  const sub = subRes.data.subscription;
  const email = meRes.ok ? meRes.data.email : null;
  const isTrial = sub.status === "trial";
  const isExpired = sub.status === "expired";
  const isCanceled = sub.status === "canceled";
  const isActive = sub.status === "active";
  const trialNotStarted = isTrial && !sub.trialStarted;
  const showUpgrade = isExpired || isCanceled;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-3xl">
      <header className="flex flex-col gap-2">
        <Link
          href="/configuracoes"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-fast"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para configurações
        </Link>
        <h1 className="font-display-tight text-3xl md:text-4xl text-foreground">
          Assinatura
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seu trial e ative sua assinatura quando estiver pronto.
        </p>
      </header>

      <Card variant="clay" accent={isExpired || isCanceled ? "pomegranate" : "matcha"}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="font-display-tight text-lg">
              Status atual
            </CardTitle>
            <Badge variant={STATUS_VARIANT[sub.status]}>
              {STATUS_LABEL[sub.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {trialNotStarted ? (
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium text-foreground">
                Seu trial ainda não começou.
              </p>
              <p className="mt-1 text-muted-foreground">
                Os 7 dias de teste começam quando você conectar o WhatsApp.
              </p>
              <Link
                href="/conectar-whatsapp"
                className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Conectar WhatsApp agora →
              </Link>
            </div>
          ) : null}

          {isTrial && sub.trialStarted ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric
                label="Dias restantes"
                value={String(sub.trialDaysRemaining)}
              />
              <Metric label="Termina em" value={formatDate(sub.trialEndsAt)} />
              <Metric
                label="Mensagens usadas"
                value={`${sub.trialMessageCount} / ${sub.trialMessageLimit}`}
              />
              <Metric
                label="Mensagens restantes"
                value={String(sub.trialMessagesRemaining)}
              />
            </dl>
          ) : null}

          {isExpired ? (
            <div className="rounded-xl border border-pomegranate-400/30 bg-pomegranate-400/10 p-4 text-sm">
              <p className="font-medium text-foreground">Seu trial encerrou.</p>
              <p className="mt-1 text-muted-foreground">
                Para continuar respondendo seus leads automaticamente, ative
                sua assinatura.
              </p>
            </div>
          ) : null}

          {isActive ? (
            <dl className="grid grid-cols-2 gap-4">
              <Metric label="Plano" value={sub.planId ?? "—"} />
              <Metric label="Ativo desde" value={formatDate(sub.subscribedAt)} />
            </dl>
          ) : null}

          {isCanceled ? (
            <div className="rounded-xl border border-pomegranate-400/30 bg-pomegranate-400/10 p-4 text-sm">
              <p className="font-medium text-foreground">
                Assinatura cancelada
                {sub.canceledAt ? ` em ${formatDate(sub.canceledAt)}` : ""}.
              </p>
              <p className="mt-1 text-muted-foreground">
                Você pode reativar a qualquer momento.
              </p>
            </div>
          ) : null}

          {showUpgrade ? <UpgradeCta email={email} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd className="font-display-tight text-2xl text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  );
}
