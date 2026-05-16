"use server";

import { redirect } from "next/navigation";
import { fetchBackend } from "@/lib/backend";

export type ZapiStatus =
  | "not_provisioned"
  | "awaiting_qr"
  | "connected"
  | "disconnected";

export type ConnectionState = {
  zapiStatus: ZapiStatus;
  qrCode: string | null;
};

export type ProvisionState = {
  status: ZapiStatus;
  qrCode: string | null;
  alreadyConnected?: boolean;
};

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export async function provisionZapiAction(): Promise<ActionResult<ProvisionState>> {
  const result = await fetchBackend<ProvisionState>(
    "/api/onboarding/provision-zapi",
    { method: "POST" },
  );

  if (result.ok) return { ok: true, data: result.data };

  // E-mail não confirmado: o gate global ainda não pegou — manda pra tela certa.
  if (result.error.code === "EMAIL_NOT_CONFIRMED") {
    redirect("/verificar-email");
  }

  return {
    ok: false,
    code: result.error.code,
    message: result.error.message,
  };
}

export async function pollConnectionAction(): Promise<ActionResult<ConnectionState>> {
  const result = await fetchBackend<ConnectionState>(
    "/api/onboarding/connection",
  );

  if (result.ok) return { ok: true, data: result.data };

  return {
    ok: false,
    code: result.error.code,
    message: result.error.message,
  };
}
