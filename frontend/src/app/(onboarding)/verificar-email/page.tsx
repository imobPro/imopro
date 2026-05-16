import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";
import { VerifyEmailActions } from "./verify-email-actions";

export const metadata = {
  title: "Confirme seu e-mail — ImobPro",
};

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***@${domain}`;
}

export default async function VerificarEmailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Se já confirmou enquanto estava nesta página (ex.: voltou do link no e-mail),
  // sai direto pro próximo passo do onboarding.
  if (user.email_confirmed_at) redirect("/conectar-whatsapp");

  const masked = user.email ? maskEmail(user.email) : "seu e-mail";

  return (
    <div className="flex flex-col gap-6 text-center">
      <header className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Mail className="size-6" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl leading-tight text-foreground">
          Confirme seu e-mail
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Enviamos um link de confirmação para{" "}
          <span className="font-medium text-foreground">{masked}</span>. Abra a
          mensagem e clique para ativar sua conta.
        </p>
      </header>

      <Card>
        <CardContent>
          <VerifyEmailActions />
        </CardContent>
      </Card>

      <form action={signOutAction}>
        <button
          type="submit"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sair desta conta
        </button>
      </form>
    </div>
  );
}
