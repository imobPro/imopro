"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "imobpro:notif-banner-dismissed";

type Status = NotificationPermission | "unsupported";

function readPermission(): Status {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

const noopSubscribe = () => () => {};

export function NotificationBanner() {
  const remoteStatus = useSyncExternalStore<Status>(
    noopSubscribe,
    readPermission,
    () => "default",
  );
  const remoteDismissed = useSyncExternalStore<boolean>(
    noopSubscribe,
    readDismissed,
    () => true,
  );

  const [statusOverride, setStatusOverride] = useState<Status | null>(null);
  const [dismissedOverride, setDismissedOverride] = useState<boolean | null>(null);

  const status = statusOverride ?? remoteStatus;
  const dismissed = dismissedOverride ?? remoteDismissed;

  if (status !== "default" || dismissed) return null;

  async function request() {
    const result = await Notification.requestPermission();
    setStatusOverride(result);
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissedOverride(true);
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
