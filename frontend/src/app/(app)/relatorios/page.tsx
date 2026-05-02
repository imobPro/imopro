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
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Resumos mensais e semanais dos atendimentos. Os PDFs também são
          enviados por e-mail automaticamente.
        </p>
      </header>

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border bg-card">
          {reports.map((r) => (
            <ReportItem key={r.id} report={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportItem({ report }: { report: ReportRow }) {
  const periodLabel = formatPeriod(report);
  const sentLabel = report.sentAt
    ? `Enviado em ${formatDate(report.sentAt)}`
    : report.error
      ? "Falha no envio"
      : "Aguardando envio";

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {report.periodType === "monthly"
              ? "Relatório mensal"
              : "Relatório semanal"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {periodLabel} · {sentLabel}
          </p>
        </div>
      </div>

      <Link
        href={`/api/reports/${report.id}/download`}
        className="inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
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
    <div className="rounded-md border border-dashed bg-card p-8 text-center">
      <FileText className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">Nenhum relatório ainda</p>
      <p className="mt-1 text-xs text-muted-foreground">
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
