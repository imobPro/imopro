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
        <h1 className="font-display-tight text-3xl md:text-4xl text-foreground">
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
        <ul className="flex flex-col gap-2">
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
      className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-border bg-card shadow-clay-card transition-all duration-fast ease-out-quart hover:-translate-y-0.5 hover:shadow-clay-soft animate-in fade-in fill-mode-both duration-base ease-out-quart"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-matcha-300/40 text-matcha-800 dark:bg-matcha-300/15 dark:text-matcha-300"
        >
          <FileText className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-foreground leading-tight">
            {report.periodType === "monthly"
              ? "Relatório mensal"
              : "Relatório semanal"}
          </p>
          <p className="truncate text-xs text-muted-foreground tabular-nums mt-0.5">
            {periodLabel} · {sentLabel}
          </p>
        </div>
      </div>

      <Link
        href={`/api/reports/${report.id}/download`}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-clay-card transition-all duration-fast ease-out-quart hover:-rotate-2 hover:-translate-y-0.5 hover:shadow-clay-hard active:rotate-0 active:translate-y-0 active:shadow-none"
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
    <div className="rounded-2xl border border-dashed border-border bg-card py-16 px-6 text-center">
      <span
        aria-hidden
        className="inline-flex size-14 items-center justify-center rounded-2xl bg-matcha-300/40 text-matcha-800 dark:bg-matcha-300/15 dark:text-matcha-300"
      >
        <FileText className="size-7" />
      </span>
      <h2 className="mt-4 font-display-tight text-2xl text-foreground">
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
