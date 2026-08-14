/**
 * Sanitiza URL de mídia (imagem, áudio, documento) antes de renderizar no
 * painel — defesa contra XSS via javascript:/data: e vazamento para hosts
 * internos.
 *
 * Contexto: mensagens do WhatsApp entram com media_url vindo do payload
 * Z-API. Se um atacante consegue injetar URL maliciosa (bug no backend, MITM,
 * etc), React NÃO bloqueia javascript:alert(1) em <a href> — só emite warning.
 * O corretor clica no anexo e executa JS no contexto autenticado do painel.
 *
 * A validação-espelho vive em src/shared/utils/safe-url.ts no backend. Aqui
 * reimplementada em TS puro porque o backend usa node:net, que não roda no
 * browser. Regras iguais: só https, sem hostname privado / loopback /
 * link-local / .local / .internal / .localhost. Sem chamada de rede.
 *
 * NEXT_PUBLIC_MEDIA_HOST_ALLOWLIST (opcional, vírgula-separada) aperta a
 * validação: quando definida, hostname precisa bater com uma entrada por
 * igualdade ou por sufixo (entradas iniciadas com "."). Ausente = permissivo.
 */

const BLOCKED_TLD_SUFFIXES = [".local", ".internal", ".localhost"] as const;

function normalizeHostname(hostname: string): string {
  const stripped =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  return stripped.toLowerCase();
}

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isPrivateIPv4(ip: string): boolean {
  const match = IPV4_REGEX.exec(ip);
  if (!match) return false;
  const parts = match.slice(1, 5).map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/**
 * Retorna true se o hostname tem forma sintática de IPv4 (mesmo que não caia
 * em faixa privada). Usado só para distinguir IP de nome de domínio.
 */
function looksLikeIPv4(host: string): boolean {
  return IPV4_REGEX.test(host);
}

function looksLikeIPv6(host: string): boolean {
  // Aceita formas com "::" e hextetos. Não valida integralmente — só decide
  // se vale rodar a checagem de faixa privada v6.
  return host.includes(":");
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower === "::") return true;

  // IPv4-mapped dotted (::ffff:127.0.0.1)
  const v4mappedDotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(lower);
  if (v4mappedDotted && isPrivateIPv4(v4mappedDotted[1])) return true;

  // WHATWG URL normaliza ::ffff:127.0.0.1 para ::ffff:7f00:1 — expandir.
  const v4mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (v4mappedHex) {
    const hi = Number.parseInt(v4mappedHex[1], 16);
    const lo = Number.parseInt(v4mappedHex[2], 16);
    if (Number.isFinite(hi) && Number.isFinite(lo)) {
      const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      if (isPrivateIPv4(dotted)) return true;
    }
  }

  if (/^fc[0-9a-f]{2}:/.test(lower) || /^fd[0-9a-f]{2}:/.test(lower)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  return false;
}

function readAllowlist(): string[] {
  const raw = process.env.NEXT_PUBLIC_MEDIA_HOST_ALLOWLIST;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function matchesAllowlist(hostname: string, allowlist: string[]): boolean {
  for (const entry of allowlist) {
    if (entry.startsWith(".")) {
      if (hostname.endsWith(entry)) return true;
    } else if (hostname === entry) {
      return true;
    }
  }
  return false;
}

/**
 * Valida uma URL de mídia. Retorna a URL original quando segura, `null`
 * quando não (scheme não-https, hostname privado, fora da allowlist etc).
 *
 * Aceita `null | undefined` para simplificar call sites (`sanitizeMediaUrl(msg.media_url)`).
 */
export function sanitizeMediaUrl(input: string | null | undefined): string | null {
  if (typeof input !== "string" || input.length === 0) return null;

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const host = normalizeHostname(parsed.hostname);
  if (host.length === 0) return null;
  if (host === "localhost") return null;
  for (const suffix of BLOCKED_TLD_SUFFIXES) {
    if (host.endsWith(suffix)) return null;
  }

  if (looksLikeIPv4(host) && isPrivateIPv4(host)) return null;
  if (looksLikeIPv6(host) && isPrivateIPv6(host)) return null;

  const allowlist = readAllowlist();
  if (allowlist.length > 0 && !matchesAllowlist(host, allowlist)) return null;

  return input;
}
