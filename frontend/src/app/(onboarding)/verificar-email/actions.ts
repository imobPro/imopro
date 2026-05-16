"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: true } | { ok: false; error: string };

export async function resendEmailAction(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Sessão inválida. Faça login novamente." };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.toLowerCase().includes("rate")
          ? "Aguarde alguns segundos antes de reenviar."
          : "Não foi possível reenviar o e-mail. Tente novamente.",
    };
  }

  return { ok: true };
}

export async function checkConfirmedAction(): Promise<ActionState> {
  const supabase = await createClient();

  // refreshSession pega a versão mais recente do JWT no Supabase Auth.
  // Sem isso, getUser() devolve o cookie em cache (sem email_confirmed_at).
  await supabase.auth.refreshSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.email_confirmed_at) {
    redirect("/conectar-whatsapp");
  }

  return { ok: false, error: "Ainda não detectamos a confirmação. Verifique seu inbox." };
}
