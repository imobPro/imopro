"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "imobpro:notif-banner-dismissed";

export function NotificationBanner() {
  const [status, setStatus] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [dismissed, setDismissed] = useState(true); // começa oculto até hidratar

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission);
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (status !== "default" || dismissed) return null;

  async function request() {
    const result = await Notification.requestPermission();
    setStatus(result);
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Permissão de notificação"
      className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2 text-sm"
    >
      <Bell className="size-4 shrink-0 text-muted-foreground" />
      <p className="flex-1 text-muted-foreground">
        Ative as notificações para saber quando chegar um lead novo ou um alerta
        crítico.
      </p>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={request}>
          Ativar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={dismiss}
          aria-label="Dispensar"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
