import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/queries/agents";
import { getLeadById } from "@/lib/queries/leads";
import { getMessagesForLead } from "@/lib/queries/messages";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { markAsViewedAction } from "./actions";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 7;

type PageProps = {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ expanded?: string }>;
};

export default async function LeadConversationPage({
  params,
  searchParams,
}: PageProps) {
  const { leadId } = await params;
  const { expanded } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agent = await getCurrentAgent(supabase, user.id);
  if (!agent) redirect("/login");

  const lead = await getLeadById(supabase, leadId, agent.tenantId);
  if (!lead) notFound();

  const isExpanded = expanded === "1";
  const messages = await getMessagesForLead(
    supabase,
    leadId,
    isExpanded ? undefined : DEFAULT_DAYS,
  );

  await markAsViewedAction(leadId);

  return (
    <div className="flex flex-col h-[calc(100dvh-3rem)] md:h-dvh">
      <ChatHeader lead={lead} />
      <ChatMessages messages={messages} expanded={isExpanded} />
    </div>
  );
}
