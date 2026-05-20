import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/queries/agents";
import { getLeadsForTenant } from "@/lib/queries/leads";
import { InboxLayoutShell } from "./inbox-layout-shell";
import { ConversationsList } from "./conversations-list";

export const dynamic = "force-dynamic";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agent = await getCurrentAgent(supabase, user.id);
  if (!agent) redirect("/login");

  const leads = await getLeadsForTenant(supabase, agent.tenantId);

  return (
    <InboxLayoutShell list={<ConversationsList leads={leads} />}>
      {children}
    </InboxLayoutShell>
  );
}
