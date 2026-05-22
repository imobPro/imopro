import { createClient } from "@/lib/supabase/server";

const DEFAULT_BACKEND_URL = "http://localhost:3000";

export type BackendError = {
  status: number;
  code: string;
  message: string;
};

export type BackendResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: BackendError };

export type BackendRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  cache?: RequestCache;
  requireAuth?: boolean;
};

export async function fetchBackend<T>(
  path: string,
  opts: BackendRequestOptions = {},
): Promise<BackendResult<T>> {
  const { method = "GET", body, cache = "no-store", requireAuth = true } = opts;

  const headers: Record<string, string> = {};

  if (requireAuth) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return {
        ok: false,
        error: {
          status: 401,
          code: "NO_SESSION",
          message: "Sessão expirada. Faça login novamente.",
        },
      };
    }
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const backendUrl = process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL;
  let res: Response;
  try {
    res = await fetch(`${backendUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache,
    });
  } catch (err) {
    // Backend offline / DNS / TLS: não derruba o Server Component.
    // Cada caller já trata !result.ok (banner some, página mostra estado vazio).
    return {
      ok: false,
      error: {
        status: 0,
        code: "NETWORK_ERROR",
        message:
          err instanceof Error
            ? `Falha ao contatar o backend: ${err.message}`
            : "Falha ao contatar o backend.",
      },
    };
  }

  if (!res.ok) {
    type ErrorBody = { error?: { code?: string; message?: string } };
    const parsed = (await res.json().catch(() => null)) as ErrorBody | null;
    return {
      ok: false,
      error: {
        status: res.status,
        code: parsed?.error?.code ?? "UNKNOWN",
        message: parsed?.error?.message ?? `Falha (${res.status})`,
      },
    };
  }

  // 204 No Content: backend pode retornar vazio. Trata como objeto vazio.
  if (res.status === 204) {
    return { ok: true, data: {} as T };
  }

  const data = (await res.json()) as T;
  return { ok: true, data };
}
