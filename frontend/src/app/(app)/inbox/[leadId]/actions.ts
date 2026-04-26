"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LeadProfile, LeadStatus } from "@/lib/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ALLOWED_STATUSES: LeadStatus[] = [
  "novo",
  "em_conversa",
  "qualificado",
  "transferido",
  "em_negociacao",
  "fechado",
];

const ALLOWED_PROFILES: LeadProfile[] = [
  "comprador",
  "inquilino",
  "vendedor",
  "captacao",
  "investidor",
  "indicador",
];

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

export async function updateStatusAction(
  leadId: string,
  status: LeadStatus,
): Promise<ActionResult> {
  if (!ALLOWED_STATUSES.includes(status)) {
    return { ok: false, error: "Status inválido." };
  }
  const ctx = await requireUser();
  if (!ctx) return { ok: false, error: "Não autenticado." };

  const { error } = await ctx.supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/inbox/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}

export async function updateLeadProfileAction(
  leadId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx) return { ok: false, error: "Não autenticado." };

  const rawName = String(formData.get("name") ?? "").trim();
  const rawRegion = String(formData.get("region") ?? "").trim();
  const rawProfile = String(formData.get("profile") ?? "").trim();

  const profile =
    rawProfile && ALLOWED_PROFILES.includes(rawProfile as LeadProfile)
      ? (rawProfile as LeadProfile)
      : null;

  const { error } = await ctx.supabase
    .from("leads")
    .update({
      name: rawName || null,
      region: rawRegion || null,
      profile,
    })
    .eq("id", leadId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/inbox/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}

export async function markAsViewedAction(leadId: string): Promise<void> {
  const ctx = await requireUser();
  if (!ctx) return;
  await ctx.supabase
    .from("leads")
    .update({ last_viewed_at: new Date().toISOString() })
    .eq("id", leadId);
}
