"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AgentVisibility } from "@/lib/queries/settings";

type ActionResult = { ok: true } | { ok: false; error: string };

async function getAuthHeaders(): Promise<{ Authorization: string } | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

async function patchBackend(
  path: string,
  body: unknown,
): Promise<ActionResult> {
  const headers = await getAuthHeaders();
  if (!headers) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";
  const res = await fetch(`${backendUrl}${path}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    type ErrorBody = { error?: { message?: string } };
    const text = (await res.json().catch(() => null)) as ErrorBody | null;
    const message = text?.error?.message ?? `Falha (${res.status})`;
    return { ok: false, error: message };
  }

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function updateTenantSettingsAction(payload: {
  agentName?: string;
  realtyName?: string;
  welcomeMessage?: string | null;
  businessHoursStart?: number;
  businessHoursEnd?: number;
  outOfHoursMessage?: string | null;
  agentActive?: boolean;
}): Promise<ActionResult> {
  return patchBackend("/api/settings/tenant", payload);
}

export async function updateVisibilityAction(
  visibility: AgentVisibility,
): Promise<ActionResult> {
  return patchBackend("/api/settings/visibility", visibility);
}

export async function updateMyPhoneAction(phone: string): Promise<ActionResult> {
  return patchBackend("/api/settings/my-phone", { phone });
}
