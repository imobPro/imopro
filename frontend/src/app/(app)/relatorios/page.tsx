import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/queries/agents";
import { listReports, type ReportRow } from "@/lib/queries/reports";

export const metadata = { title: "Relatórios — ImobPro" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agent = await getCurrentAgent(supabase, user.id);
  if (!agent) redirect("/login");

  const reports = await listReports(supabase, agent.id);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl md:text-4xl text-foreground">
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumos mensais e semanais dos atendimentos. Os PDFs também são
          enviados por e-mail automaticamente.
        </p>
      </header>

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card overflow-hidden">
          {reports.map((r, i) => (
            <ReportItem key={r.id} report={r} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportItem({ report, index }: { report: ReportRow; index: number }) {
  const periodLabel = formatPeriod(report);
  const sentLabel = report.sentAt
    ? `Enviado em ${formatDate(report.sentAt)}`
    : report.error
      ? "Falha no envio"
      : "Aguardando envio";
  const delay = Math.min(index, 8) * 40;

  return (
    <li
      style={{ animationDelay: `${delay}ms` }}
      className="flex items-center justify-between gap-3 px-4 py-3.5 group transition-colors hover:bg-muted/40 animate-in fade-in fill-mode-both duration-base ease-out-quart"
    >
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg text-foreground leading-tight">
            {report.periodType === "monthly"
              ? "Relatório mensal"
              : "Relatório semanal"}
          </p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">
            {periodLabel} · {sentLabel}
          </p>
        </div>
      </div>

      <Link
        href={`/api/reports/${report.id}/download`}
        className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all duration-fast ease-out-quart hover:brightness-95 active:scale-95"
        prefetch={false}
      >
        <Download className="size-3.5" />
        Baixar PDF
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed bg-card py-16 px-6 text-center">
      <FileText className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-4 font-display text-3xl text-foreground">
        Nenhum relatório ainda
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
        Os relatórios mensais saem todo dia 1 e os semanais toda segunda.
      </p>
    </div>
  );
}

function formatPeriod(report: ReportRow): string {
  const start = formatDate(report.periodStart);
  const end = formatDate(report.periodEnd);
  return `${start} a ${end}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
