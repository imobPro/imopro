import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/queries/agents";
import { getSettings } from "@/lib/queries/settings";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações — ImobPro" };
export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agent = await getCurrentAgent(supabase, user.id);
  if (!agent) redirect("/login");

  const settings = await getSettings(supabase);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-3xl">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl md:text-4xl text-foreground">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Defina como o agente atende seus leads. Mudanças passam a valer na
          próxima mensagem que o lead enviar.
        </p>
      </header>

      <Link href="/configuracoes/assinatura" className="block group">
        <Card className="transition-colors group-hover:bg-muted/30">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <CreditCard className="size-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Assinatura</p>
              <p className="text-xs text-muted-foreground">
                Acompanhe seu trial e ative seu plano.
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </CardContent>
        </Card>
      </Link>

      {settings ? (
        <SettingsForm
          tenant={settings.tenant}
          visibility={settings.visibility}
          myPhone={settings.myPhone ?? agent.phone ?? ""}
        />
      ) : (
        <div className="rounded-md border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          Não foi possível carregar as configurações. Recarregue a página.
        </div>
      )}
    </div>
  );
}
