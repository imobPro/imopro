import type { SupabaseClient } from "@supabase/supabase-js";

export type CurrentAgent = {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
};

export async function getCurrentAgent(
  supabase: SupabaseClient,
  userId: string,
): Promise<CurrentAgent | null> {
  const { data, error } = await supabase
    .from("agents")
    .select("id, tenant_id, name, phone")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    phone: data.phone,
  };
}
