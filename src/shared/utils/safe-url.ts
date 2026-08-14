/**
 * Validação sintática de URL externa — defesa T6 contra SSRF.
 *
 * Contexto: o webhook Z-API entrega URLs de mídia (audioUrl, imageUrl,
 * documentUrl, stickerUrl) que o backend fetcha (Whisper) e o frontend
 * renderiza (<img>, <audio>, <a>). Payload malicioso pode apontar para:
 *   - endpoints internos: http://127.0.0.1:6379, http://169.254.169.254 (IMDS)
 *   - hostnames privados: http://backend.internal, http://foo.local
 *   - schemes perigosos: javascript:, data:text/html, file:///etc/passwd
 *
 * Este helper roda checagens 100% sintáticas — sem DNS resolve (evita TOCTOU
 * e latência). Rebinding DNS ainda é possível em teoria, mas exigiria um host
 * externo válido resolvendo para IP interno; o timeout curto do fetch e a
 * flag redirect: 'manual' (em safe-media-fetch) fecham os vetores restantes.
 *
 * Aceita apenas https. A env MEDIA_HOST_ALLOWLIST (vírgula-separada) permite
 * apertar mais: cada entrada iniciada com "." casa por sufixo, outras por
 * igualdade exata. Ausente, aplica só a validação de scheme + hostname
 * privado (permissivo por default, mas Arthur pode fechar em prod).
 */

import { isIP } from 'node:net'

export type SafeUrlResult =
  | { ok: true }
  | { ok: false; reason: string }

const BLOCKED_TLD_SUFFIXES = ['.local', '.internal', '.localhost'] as const

/** Extrai hostname sem colchetes IPv6 e em lowercase. */
function normalizeHostname(hostname: string): string {
  const stripped = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname
  return stripped.toLowerCase()
}

/** Retorna true se o IPv4 cair em faixa privada / loopback / link-local. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    // string veio de isIP() === 4, mas defesa em profundidade: se algo estiver
    // mal parseado, trata como suspeito.
    return true
  }
  const [a, b] = parts as [number, number, number, number]
  if (a === 0) return true                                // 0.0.0.0/8
  if (a === 127) return true                              // loopback
  if (a === 10) return true                               // 10.0.0.0/8
  if (a === 192 && b === 168) return true                 // 192.168.0.0/16
  if (a === 169 && b === 254) return true                 // link-local + IMDS
  if (a === 172 && b >= 16 && b <= 31) return true        // 172.16.0.0/12
  return false
}

/** Retorna true se o IPv6 cair em loopback / unique local / link-local / unspecified. */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1') return true                        // loopback
  if (lower === '::') return true                         // unspecified

  // IPv4-mapped na forma dotted (::ffff:127.0.0.1) — recair na regra v4
  const v4mappedDotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(lower)
  if (v4mappedDotted && isPrivateIPv4(v4mappedDotted[1])) return true

  // IPv4-mapped na forma normalizada pelo WHATWG URL (::ffff:7f00:1). Extrai
  // os dois últimos hextetos e reconstrói o IPv4 pra recair na regra v4.
  const v4mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower)
  if (v4mappedHex) {
    const hi = Number.parseInt(v4mappedHex[1], 16)
    const lo = Number.parseInt(v4mappedHex[2], 16)
    if (Number.isFinite(hi) && Number.isFinite(lo)) {
      const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
      if (isPrivateIPv4(dotted)) return true
    }
  }

  // fc00::/7 — unique local addresses (primeiro byte 0xFC ou 0xFD)
  if (/^fc[0-9a-f]{2}:/.test(lower) || /^fd[0-9a-f]{2}:/.test(lower)) return true
  // fe80::/10 — link-local (fe80 até febf; primeiros 10 bits)
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true
  return false
}

/** Lê e parseia MEDIA_HOST_ALLOWLIST em cada chamada (env pode mudar em teste). */
function readAllowlist(): string[] {
  const raw = process.env.MEDIA_HOST_ALLOWLIST
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
}

function matchesAllowlist(hostname: string, allowlist: string[]): boolean {
  for (const entry of allowlist) {
    if (entry.startsWith('.')) {
      // Sufixo — precisa terminar com a entrada (ex: ".z-api.io" casa "storage.z-api.io")
      if (hostname.endsWith(entry)) return true
    } else {
      if (hostname === entry) return true
    }
  }
  return false
}

/**
 * Valida uma URL externa antes de fetch/render.
 *
 * Rejeita:
 *   - scheme diferente de https
 *   - hostname que é IP em faixa privada/loopback/link-local
 *   - hostname localhost e sufixos .local / .internal / .localhost
 *   - se MEDIA_HOST_ALLOWLIST definida: hostname que não bater com nenhuma entrada
 *
 * Não faz DNS resolve. Só checagem sintática.
 */
export function isSafeExternalUrl(input: unknown): SafeUrlResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { ok: false, reason: 'not_a_string' }
  }

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    return { ok: false, reason: 'malformed_url' }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: `blocked_scheme:${parsed.protocol.replace(':', '')}` }
  }

  const host = normalizeHostname(parsed.hostname)
  if (host.length === 0) {
    return { ok: false, reason: 'empty_host' }
  }

  if (host === 'localhost') {
    return { ok: false, reason: 'blocked_host:localhost' }
  }

  for (const suffix of BLOCKED_TLD_SUFFIXES) {
    if (host.endsWith(suffix)) {
      return { ok: false, reason: `blocked_suffix:${suffix}` }
    }
  }

  const ipVersion = isIP(host)
  if (ipVersion === 4 && isPrivateIPv4(host)) {
    return { ok: false, reason: 'private_ipv4' }
  }
  if (ipVersion === 6 && isPrivateIPv6(host)) {
    return { ok: false, reason: 'private_ipv6' }
  }

  const allowlist = readAllowlist()
  if (allowlist.length > 0 && !matchesAllowlist(host, allowlist)) {
    return { ok: false, reason: 'not_in_allowlist' }
  }

  return { ok: true }
}

/**
 * Extrai só o hostname (sem token / path) para log sanitizado.
 * Retorna 'invalid' se a URL não puder ser parseada.
 */
export function safeUrlHost(url: string): string {
  try {
    return normalizeHostname(new URL(url).hostname) || 'invalid'
  } catch {
    return 'invalid'
  }
}
