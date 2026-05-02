import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportRow = {
  id: string;
  periodType: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  sentAt: string | null;
  error: string | null;
};

export async function listReports(
  supabase: SupabaseClient,
  agentId: string,
): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, period_type, period_start, period_end, generated_at, sent_at, error",
    )
    .eq("agent_id", agentId)
    .order("period_end", { ascending: false })
    .limit(60);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    periodType: row.period_type as "weekly" | "monthly",
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    generatedAt: row.generated_at as string,
    sentAt: (row.sent_at as string | null) ?? null,
    error: (row.error as string | null) ?? null,
  }));
}
