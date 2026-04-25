import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadWithConversation } from "@/lib/types/database";

const DEFAULT_LIMIT = 100;

export async function getLeadsForTenant(
  supabase: SupabaseClient,
  tenantId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<LeadWithConversation[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, tenant_id, agent_id, phone, name, region, status, score, profile, intent, last_message_at, created_at, conversations(sentiment)",
    )
    .eq("tenant_id", tenantId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as LeadWithConversation[];
}

export async function countLeadsSince(
  supabase: SupabaseClient,
  tenantId: string,
  sinceISO: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gt("last_message_at", sinceISO);

  if (error || count === null) return 0;
  return count;
}
