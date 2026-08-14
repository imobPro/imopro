/**
 * Wrapper de fetch para URLs externas de mídia — trava T6 SSRF.
 *
 * Diferenças de fetch cru:
 *   1. Chama isSafeExternalUrl antes de disparar a request (scheme https,
 *      hostname não-privado, dentro da allowlist quando definida).
 *   2. redirect: 'manual' — resposta 3xx vem crua, sem seguir. Sem isso,
 *      atacante escreve um endpoint HTTPS público válido que redireciona
 *      para http://localhost:6379 e passa por dentro da validação sintática.
 *   3. AbortController com timeout duro (default 15s). fetch nativo do Node
 *      não expira sozinho — request pendente vira memory leak.
 *   4. Nunca loga a URL crua (query string carrega token de download Z-API).
 *      Apenas hostname sanitizado + reason.
 */

import { isSafeExternalUrl, safeUrlHost } from './safe-url'

const DEFAULT_TIMEOUT_MS = 15_000

export class UnsafeUrlError extends Error {
  readonly reason: string
  constructor(reason: string) {
    super(`URL externa rejeitada (${reason})`)
    this.name = 'UnsafeUrlError'
    this.reason = reason
  }
}

export interface SafeMediaFetchOptions {
  /** Timeout em ms (default 15000). */
  timeoutMs?: number
  /** Cabeçalhos adicionais para a request. */
  headers?: Record<string, string>
  /** Método HTTP (default GET). */
  method?: string
}

/**
 * Faz fetch numa URL externa após validação. Nunca segue redirects (bloqueia
 * SSRF via redirect chain). Timeout duro via AbortController.
 *
 * Lança UnsafeUrlError se a URL falhar validação — o caller decide o fallback.
 * Erros de rede / timeout mantêm o comportamento nativo do fetch (AbortError,
 * TypeError etc).
 */
export async function safeMediaFetch(
  url: string,
  options: SafeMediaFetchOptions = {},
): Promise<Response> {
  const check = isSafeExternalUrl(url)
  if (!check.ok) {
    // Log com host sanitizado — nunca a URL crua (evita vazar token na query).
    console.warn(
      `[SafeFetch] URL rejeitada | host=${safeUrlHost(url)} reason=${check.reason}`,
    )
    throw new UnsafeUrlError(check.reason)
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      redirect: 'manual',
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timer)
  }
}
