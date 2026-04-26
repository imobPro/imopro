import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/queries/agents";
import { getLeadsGroupedByStatus } from "@/lib/queries/funnel";
import { FunnelBoard } from "./funnel-board";

export const metadata = { title: "Funil — ImobPro" };
export const dynamic = "force-dynamic";

export default async function FunnelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agent = await getCurrentAgent(supabase, user.id);
  if (!agent) redirect("/login");

  const data = await getLeadsGroupedByStatus(supabase, agent.tenantId);

  return (
    <div className="flex flex-col">
      <header className="px-4 pt-4 md:px-6 md:pt-6">
        <h1 className="text-xl font-semibold">Funil de conversão</h1>
        <p className="text-sm text-muted-foreground">
          Cada coluna mostra os leads no respectivo status. Toque num card para
          abrir a conversa.
        </p>
      </header>
      <FunnelBoard data={data} />
    </div>
  );
}
