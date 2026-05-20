"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signInAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          E-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@imobiliaria.com.br"
          className="h-11 rounded-lg shadow-clay-card"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-lg shadow-clay-card"
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-pomegranate-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="swatch" size="clay" disabled={pending} className="mt-2">
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
