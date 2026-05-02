import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantSettings = {
  tenantId: string;
  agentName: string;
  realtyName: string;
  welcomeMessage: string | null;
  businessHoursStart: number;
  businessHoursEnd: number;
  outOfHoursMessage: string | null;
  agentActive: boolean;
};

export type VisibilitySection =
  | "identity"
  | "brand"
  | "welcome"
  | "hours"
  | "out_of_hours_msg"
  | "active_toggle"
  | "my_phone";

export const VISIBILITY_SECTIONS: readonly VisibilitySection[] = [
  "identity",
  "brand",
  "welcome",
  "hours",
  "out_of_hours_msg",
  "active_toggle",
  "my_phone",
];

export type AgentVisibility = Partial<Record<VisibilitySection, boolean>>;

export type SettingsResponse = {
  tenant: TenantSettings;
  visibility: AgentVisibility;
  myPhone: string | null;
};

export async function getSettings(
  supabase: SupabaseClient,
): Promise<SettingsResponse | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";
  const res = await fetch(`${backendUrl}/api/settings`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`[settings] backend retornou ${res.status}`);
    return null;
  }

  return (await res.json()) as SettingsResponse;
}

export function isVisible(
  visibility: AgentVisibility,
  key: VisibilitySection,
): boolean {
  // Ausência da chave = visível. Apenas false explícito esconde.
  return visibility[key] !== false;
}
