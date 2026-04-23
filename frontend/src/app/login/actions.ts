"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | undefined;

export async function signInAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Em produção mostra mensagem genérica; em dev ajuda a diagnosticar
    // credenciais vs. rede vs. config de Auth.
    console.error("[signInAction] Supabase auth error:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    const detail =
      process.env.NODE_ENV === "production"
        ? "E-mail ou senha inválidos."
        : `[${error.code ?? error.status}] ${error.message}`;
    return { error: detail };
  }

  redirect("/inbox");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
