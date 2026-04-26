import type { SupabaseClient } from "@supabase/supabase-js";

export type Metrics = {
  newLeads: { today: number; week: number; month: number };
  closing: { qualifiedMonth: number; closedMonth: number };
  stalled: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

async function countSafe(
  build: () => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const { count, error } = await build();
    if (error || count === null) return 0;
    return count;
  } catch {
    return 0;
  }
}

export async function getMetrics(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<Metrics> {
  const today = startOfTodayISO();
  const week = daysAgoISO(7);
  const month = daysAgoISO(30);
  const stalledThreshold = daysAgoISO(7);

  const base = () =>
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

  const [
    newToday,
    newWeek,
    newMonth,
    qualifiedMonth,
    closedMonth,
    stalled,
  ] = await Promise.all([
    countSafe(() => base().gte("created_at", today)),
    countSafe(() => base().gte("created_at", week)),
    countSafe(() => base().gte("created_at", month)),
    countSafe(() =>
      base().eq("status", "qualificado").gte("created_at", month),
    ),
    countSafe(() => base().eq("status", "fechado").gte("created_at", month)),
    countSafe(() =>
      base().lt("last_message_at", stalledThreshold).neq("status", "fechado"),
    ),
  ]);

  return {
    newLeads: { today: newToday, week: newWeek, month: newMonth },
    closing: { qualifiedMonth, closedMonth },
    stalled,
  };
}
