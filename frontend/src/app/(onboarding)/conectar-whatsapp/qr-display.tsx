"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, OctagonAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  provisionZapiAction,
  pollConnectionAction,
  type ZapiStatus,
} from "./actions";

const QR_LIFETIME_SECONDS = 45;
const POLL_INTERVAL_MS = 2_500;

type Props = {
  initialStatus: ZapiStatus;
  initialQrCode: string | null;
};

export function QrDisplay({ initialStatus, initialQrCode }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ZapiStatus>(initialStatus);
  const [qrCode, setQrCode] = useState<string | null>(initialQrCode);
  const [secondsLeft, setSecondsLeft] = useState(
    initialQrCode ? QR_LIFETIME_SECONDS : 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [provisioning, startProvisioning] = useTransition();
  const lastQrRef = useRef<string | null>(initialQrCode);

  const expired = secondsLeft <= 0 && status === "awaiting_qr";

  // Provisionamento inicial: se chegou aqui sem instância, dispara automaticamente.
  useEffect(() => {
    if (status !== "not_provisioned") return;
    startProvisioning(async () => {
      const result = await provisionZapiAction();
      if (result.ok) {
        setStatus(result.data.status);
        setQrCode(result.data.qrCode);
        lastQrRef.current = result.data.qrCode;
        if (result.data.qrCode) setSecondsLeft(QR_LIFETIME_SECONDS);
        if (result.data.alreadyConnected) router.push("/inbox");
      } else {
        setError(result.message);
      }
    });
    // status muda no callback; effect só roda enquanto for not_provisioned.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contador regressivo do QR.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  // Polling do status da conexão.
  useEffect(() => {
    if (status === "connected") return;
    let cancelled = false;

    const tick = async () => {
      const result = await pollConnectionAction();
      if (cancelled) return;
      if (!result.ok) return; // erros transitórios não derrubam o polling

      setStatus(result.data.zapiStatus);

      if (result.data.zapiStatus === "connected") {
        router.push("/inbox");
        return;
      }

      // QR novo? Reseta contador.
      if (result.data.qrCode && result.data.qrCode !== lastQrRef.current) {
        lastQrRef.current = result.data.qrCode;
        setQrCode(result.data.qrCode);
        setSecondsLeft(QR_LIFETIME_SECONDS);
      } else if (!result.data.qrCode && lastQrRef.current === null) {
        // Aguardando QR pela primeira vez.
        setQrCode(null);
      }
    };

    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [status, router]);

  function handleRegenerate() {
    setError(null);
    startProvisioning(async () => {
      const result = await provisionZapiAction();
      if (result.ok) {
        setStatus(result.data.status);
        setQrCode(result.data.qrCode);
        lastQrRef.current = result.data.qrCode;
        if (result.data.qrCode) setSecondsLeft(QR_LIFETIME_SECONDS);
        if (result.data.alreadyConnected) router.push("/inbox");
        else toast.success("QR code atualizado.");
      } else {
        setError(result.message);
      }
    });
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-2">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-pomegranate-400/20 text-pomegranate-400">
          <OctagonAlert className="size-7" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Não foi possível criar sua instância do WhatsApp.</p>
          <p className="text-sm text-muted-foreground">
            Tente de novo em alguns instantes.
          </p>
        </div>
        <Button
          type="button"
          variant="swatch"
          size="clay"
          onClick={handleRegenerate}
          disabled={provisioning}
        >
          {provisioning ? "Tentando..." : "Tentar novamente"}
        </Button>
      </div>
    );
  }

  const showSkeleton = !qrCode || provisioning;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-xl border border-border bg-card shadow-clay-card">
        {showSkeleton ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Gerando QR code...</p>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qrCode!}
            alt="QR code do WhatsApp"
            className="h-full w-full object-contain"
          />
        )}

        {expired ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground">QR expirado</p>
          </div>
        ) : null}
      </div>

      <div className="flex w-full items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            status === "awaiting_qr" && secondsLeft > 0
              ? "bg-lemon-400/30 text-lemon-700 dark:bg-lemon-400/20 dark:text-lemon-400"
              : status === "connected"
                ? "bg-matcha-300/40 text-matcha-800 dark:bg-matcha-300/20 dark:text-matcha-300"
                : "bg-muted text-muted-foreground",
          )}
        >
          {status === "awaiting_qr" && secondsLeft > 0
            ? `Expira em ${secondsLeft}s`
            : status === "connected"
              ? "Conectado"
              : "Aguardando WhatsApp..."}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleRegenerate}
          disabled={provisioning}
        >
          <RefreshCw className="size-3.5" />
          {expired ? "Gerar novo" : "Atualizar"}
        </Button>
      </div>

      <ol className="w-full flex flex-col gap-2.5 text-sm">
        {[
          "Abra o WhatsApp no seu celular.",
          "Toque em Mais opções e em Aparelhos conectados.",
          "Aponte a câmera para o QR code acima.",
        ].map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span
              aria-hidden
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-matcha-300/40 text-xs font-semibold text-matcha-800 dark:bg-matcha-300/15 dark:text-matcha-300"
            >
              {i + 1}
            </span>
            <span className="text-muted-foreground pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
