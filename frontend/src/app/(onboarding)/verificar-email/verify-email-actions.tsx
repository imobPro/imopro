"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendEmailAction, checkConfirmedAction } from "./actions";

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailActions() {
  const [cooldown, setCooldown] = useState(0);
  const [resendPending, startResend] = useTransition();
  const [checkPending, startCheck] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  function handleResend() {
    startResend(async () => {
      const result = await resendEmailAction();
      if (result.ok) {
        toast.success("E-mail reenviado. Verifique sua caixa de entrada.");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCheck() {
    startCheck(async () => {
      const result = await checkConfirmedAction();
      // Sucesso = redirect (a action joga); só caímos aqui se ainda não confirmou.
      if (!result.ok) toast.info(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        onClick={handleCheck}
        disabled={checkPending}
      >
        {checkPending ? "Verificando..." : "Já confirmei"}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleResend}
        disabled={resendPending || cooldown > 0}
      >
        {resendPending
          ? "Reenviando..."
          : cooldown > 0
            ? `Reenviar em ${cooldown}s`
            : "Reenviar e-mail"}
      </Button>
    </div>
  );
}
