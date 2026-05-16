"use server";

import { fetchBackend } from "@/lib/backend";

export type SignupPayload = {
  operationMode: "shared" | "individual";
  fullName: string;
  realtyName?: string;
  email: string;
  password: string;
  phone?: string;
  acceptedTerms: true;
};

export type SignupResult =
  | { ok: true; userId: string; tenantId: string; agentId: string }
  | { ok: false; code: string; message: string };

type SignupSuccess = {
  userId: string;
  tenantId: string;
  agentId: string;
  emailConfirmationRequired: boolean;
};

export async function signupAction(
  payload: SignupPayload,
): Promise<SignupResult> {
  const result = await fetchBackend<SignupSuccess>("/api/onboarding/signup", {
    method: "POST",
    body: payload,
    requireAuth: false,
  });

  if (result.ok) {
    return {
      ok: true,
      userId: result.data.userId,
      tenantId: result.data.tenantId,
      agentId: result.data.agentId,
    };
  }

  return {
    ok: false,
    code: result.error.code,
    message: result.error.message,
  };
}
