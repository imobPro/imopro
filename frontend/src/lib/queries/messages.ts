import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types/database";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getMessagesForLead(
  supabase: SupabaseClient,
  leadId: string,
  sinceDays?: number,
): Promise<ChatMessage[]> {
  let query = supabase
    .from("messages")
    .select("id, role, content, type, media_url, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (typeof sinceDays === "number" && sinceDays > 0) {
    const sinceISO = new Date(Date.now() - sinceDays * DAY_MS).toISOString();
    query = query.gte("created_at", sinceISO);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as ChatMessage[];
}
