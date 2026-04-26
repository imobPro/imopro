import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_ORDER } from "@/lib/domain/lead-enums";
import type { LeadStatus, LeadWithConversation } from "@/lib/types/database";
import { LEAD_COLUMNS } from "./leads";

export type FunnelData = Record<LeadStatus, LeadWithConversation[]>;

const DEFAULT_PER_STATUS = 20;

async function fetchStatus(
  supabase: SupabaseClient,
  tenantId: string,
  status: LeadStatus,
  limit: number,
): Promise<LeadWithConversation[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("tenant_id", tenantId)
    .eq("status", status)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as LeadWithConversation[];
}

export async function getLeadsGroupedByStatus(
  supabase: SupabaseClient,
  tenantId: string,
  perStatus: number = DEFAULT_PER_STATUS,
): Promise<FunnelData> {
  const results = await Promise.all(
    STATUS_ORDER.map((status) =>
      fetchStatus(supabase, tenantId, status, perStatus),
    ),
  );

  const data = {} as FunnelData;
  STATUS_ORDER.forEach((status, idx) => {
    data[status] = results[idx];
  });
  return data;
}
