import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/queries/agents";
import { getMetrics } from "@/lib/queries/metrics";
import { MetricCard } from "./metric-card";

export const metadata = { title: "Métricas — ImobPro" };
export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agent = await getCurrentAgent(supabase, user.id);
  if (!agent) redirect("/login");

  const metrics = await getMetrics(supabase, agent.tenantId);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Métricas</h1>
        <p className="text-sm text-muted-foreground">
          Visão rápida do que está chegando, do que está fechando e do que precisa
          de atenção.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <MetricCard
          title="Leads novos"
          description="Por período de chegada"
          rows={[
            { label: "Hoje", value: metrics.newLeads.today },
            { label: "Últimos 7 dias", value: metrics.newLeads.week },
            { label: "Últimos 30 dias", value: metrics.newLeads.month },
          ]}
        />
        <MetricCard
          title="Em fechamento"
          description="Leads do mês por status atual"
          rows={[
            { label: "Qualificados", value: metrics.closing.qualifiedMonth },
            { label: "Fechados", value: metrics.closing.closedMonth },
          ]}
        />
        <MetricCard
          title="Leads parados"
          description="Sem mensagem há mais de 7 dias e ainda não fechados"
          highlight={{
            value: metrics.stalled,
            label: metrics.stalled === 1 ? "lead esfriando" : "leads esfriando",
            tone: "warning",
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Os recortes &quot;qualificados&quot; e &quot;fechados&quot; usam a data de criação do lead como
        referência — o histórico de mudanças de status virá em uma evolução futura.
      </p>
    </div>
  );
}
