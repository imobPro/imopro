import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/queries/agents";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { BottomTabs } from "@/components/shell/bottom-tabs";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { NotificationBanner } from "@/components/shell/notification-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware já redireciona anônimos — este check é defensivo.
  if (!user) redirect("/login");

  const agent = await getCurrentAgent(supabase, user.id);

  // Usuário autenticado mas sem registro em agents (não vinculado a um tenant).
  // Sem isso não dá pra aplicar tenant_id nas queries — trata como erro visível.
  if (!agent) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-semibold">Conta sem imobiliária vinculada</h1>
          <p className="text-sm text-muted-foreground">
            Seu usuário está autenticado mas ainda não está associado a uma
            imobiliária ativa. Peça ao administrador para vincular seu e-mail a
            um registro de corretor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <SidebarNav agentName={agent.name} />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar agentName={agent.name} />
        <NotificationBanner />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
        <BottomTabs />
      </div>
    </div>
  );
}
