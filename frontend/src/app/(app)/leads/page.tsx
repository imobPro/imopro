import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/queries/agents";
import { getLeadsForTenant } from "@/lib/queries/leads";
import { LeadsList } from "./leads-list";
import { NewLeadsBanner } from "./new-leads-banner";

export const metadata = { title: "Leads — ImobPro" };

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agent = await getCurrentAgent(supabase, user.id);
  if (!agent) redirect("/login");

  const loadedAt = new Date().toISOString();
  const leads = await getLeadsForTenant(supabase, agent.tenantId);

  return (
    <>
      <NewLeadsBanner tenantId={agent.tenantId} loadedAt={loadedAt} />
      <LeadsList initialLeads={leads} />
    </>
  );
}
