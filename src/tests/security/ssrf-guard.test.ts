/**
 * Guarda de SSRF / XSS via URL de mídia — trava T6 do Quality Gate.
 *
 * mediaUrl chega do webhook Z-API sem validação de host. Se o backend fetcha
 * (Whisper) ou o frontend renderiza (<img>, <audio>, <a>) uma URL controlada
 * por um atacante, três coisas quebram:
 *   1. SSRF — fetch para http://169.254.169.254 (IMDS AWS), http://localhost:6379
 *      (Redis), http://backend.internal (services privados)
 *   2. Vaza credencial em log — URL Z-API tem token na query string
 *   3. XSS no painel — <a href="javascript:alert(1)"> passa direto no React
 *
 * Este arquivo trava as duas defesas do backend: isSafeExternalUrl (validação
 * sintática) e safeMediaFetch (wrapper com redirect: 'manual' e timeout). Se
 * alguém aliviar a checagem ou remover o wrapper, o CI quebra.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isSafeExternalUrl } from '../../shared/utils/safe-url'
import { safeMediaFetch, UnsafeUrlError } from '../../shared/utils/safe-media-fetch'

describe('isSafeExternalUrl — schemes', () => {
  it('aceita https válido', () => {
    expect(isSafeExternalUrl('https://storage.z-api.io/media/abc123').ok).toBe(true)
    expect(isSafeExternalUrl('https://cdn.example.com/x.mp3').ok).toBe(true)
  })

  it('rejeita http (sem TLS — Z-API sempre usa https)', () => {
    const result = isSafeExternalUrl('http://storage.z-api.io/media/xxx')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/scheme/)
  })

  it('rejeita file://', () => {
    expect(isSafeExternalUrl('file:///etc/passwd').ok).toBe(false)
  })

  it('rejeita javascript:', () => {
    // Vetor primário de XSS no frontend
    expect(isSafeExternalUrl('javascript:alert(1)').ok).toBe(false)
  })

  it('rejeita data:', () => {
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>').ok).toBe(false)
  })

  it('rejeita blob:', () => {
    expect(isSafeExternalUrl('blob:https://x/y').ok).toBe(false)
  })

  it('rejeita ftp:', () => {
    expect(isSafeExternalUrl('ftp://example.com/file').ok).toBe(false)
  })

  it('rejeita string vazia / não-string / URL malformada', () => {
    expect(isSafeExternalUrl('').ok).toBe(false)
    expect(isSafeExternalUrl(null).ok).toBe(false)
    expect(isSafeExternalUrl(undefined).ok).toBe(false)
    expect(isSafeExternalUrl(42).ok).toBe(false)
    expect(isSafeExternalUrl('nao-e-url').ok).toBe(false)
  })
})

describe('isSafeExternalUrl — IPs privados IPv4', () => {
  it('rejeita loopback 127.0.0.0/8', () => {
    expect(isSafeExternalUrl('https://127.0.0.1/x').ok).toBe(false)
    expect(isSafeExternalUrl('https://127.255.255.1/x').ok).toBe(false)
  })

  it('rejeita 10.0.0.0/8', () => {
    expect(isSafeExternalUrl('https://10.0.0.1/x').ok).toBe(false)
    expect(isSafeExternalUrl('https://10.255.255.1/x').ok).toBe(false)
  })

  it('rejeita 172.16.0.0/12', () => {
    expect(isSafeExternalUrl('https://172.16.0.1/x').ok).toBe(false)
    expect(isSafeExternalUrl('https://172.31.255.1/x').ok).toBe(false)
  })

  it('aceita 172.15.x.x e 172.32.x.x (fora do /12)', () => {
    expect(isSafeExternalUrl('https://172.15.0.1/x').ok).toBe(true)
    expect(isSafeExternalUrl('https://172.32.0.1/x').ok).toBe(true)
  })

  it('rejeita 192.168.0.0/16', () => {
    expect(isSafeExternalUrl('https://192.168.1.1/x').ok).toBe(false)
  })

  it('rejeita 169.254.0.0/16 (link-local + IMDS AWS)', () => {
    // 169.254.169.254 é o endpoint de metadata do EC2/GCP — vetor clássico
    // de SSRF para roubo de credencial IAM.
    expect(isSafeExternalUrl('https://169.254.169.254/latest/meta-data').ok).toBe(false)
  })

  it('rejeita 0.0.0.0/8', () => {
    expect(isSafeExternalUrl('https://0.0.0.0/x').ok).toBe(false)
  })
})

describe('isSafeExternalUrl — IPs privados IPv6', () => {
  it('rejeita loopback ::1', () => {
    expect(isSafeExternalUrl('https://[::1]/x').ok).toBe(false)
  })

  it('rejeita unique local fc00::/7', () => {
    expect(isSafeExternalUrl('https://[fc00::1]/x').ok).toBe(false)
    expect(isSafeExternalUrl('https://[fd00::1]/x').ok).toBe(false)
  })

  it('rejeita link-local fe80::/10', () => {
    expect(isSafeExternalUrl('https://[fe80::1]/x').ok).toBe(false)
    expect(isSafeExternalUrl('https://[febf::1]/x').ok).toBe(false)
  })

  it('rejeita ::ffff:127.0.0.1 (IPv4-mapped em v6)', () => {
    expect(isSafeExternalUrl('https://[::ffff:127.0.0.1]/x').ok).toBe(false)
  })
})

describe('isSafeExternalUrl — hostnames privados', () => {
  it('rejeita localhost', () => {
    expect(isSafeExternalUrl('https://localhost/x').ok).toBe(false)
    expect(isSafeExternalUrl('https://LOCALHOST/x').ok).toBe(false)
  })

  it('rejeita sufixo .internal', () => {
    expect(isSafeExternalUrl('https://backend.internal/x').ok).toBe(false)
    expect(isSafeExternalUrl('https://api.railway.internal/x').ok).toBe(false)
  })

  it('rejeita sufixo .local', () => {
    expect(isSafeExternalUrl('https://foo.local/x').ok).toBe(false)
  })

  it('rejeita sufixo .localhost', () => {
    expect(isSafeExternalUrl('https://foo.localhost/x').ok).toBe(false)
  })
})

describe('isSafeExternalUrl — MEDIA_HOST_ALLOWLIST', () => {
  const original = process.env.MEDIA_HOST_ALLOWLIST

  afterEach(() => {
    if (original === undefined) delete process.env.MEDIA_HOST_ALLOWLIST
    else process.env.MEDIA_HOST_ALLOWLIST = original
  })

  it('sem allowlist, aceita hosts externos legítimos', () => {
    delete process.env.MEDIA_HOST_ALLOWLIST
    expect(isSafeExternalUrl('https://cdn.example.com/x').ok).toBe(true)
  })

  it('com allowlist por sufixo, aceita apenas hosts que casam', () => {
    process.env.MEDIA_HOST_ALLOWLIST = '.z-api.io'
    expect(isSafeExternalUrl('https://storage.z-api.io/x').ok).toBe(true)
    expect(isSafeExternalUrl('https://cdn.example.com/x').ok).toBe(false)
  })

  it('com allowlist múltipla, aceita match por igualdade ou sufixo', () => {
    process.env.MEDIA_HOST_ALLOWLIST = '.z-api.io,cdn.example.com'
    expect(isSafeExternalUrl('https://storage.z-api.io/x').ok).toBe(true)
    expect(isSafeExternalUrl('https://cdn.example.com/x').ok).toBe(true)
    expect(isSafeExternalUrl('https://other.example.com/x').ok).toBe(false)
  })

  it('allowlist não sobrescreve as travas de scheme / IP privado', () => {
    process.env.MEDIA_HOST_ALLOWLIST = '.z-api.io,127.0.0.1'
    expect(isSafeExternalUrl('http://storage.z-api.io/x').ok).toBe(false)
    expect(isSafeExternalUrl('https://127.0.0.1/x').ok).toBe(false)
  })
})

describe('safeMediaFetch', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')

  beforeEach(() => {
    fetchSpy.mockReset()
    delete process.env.MEDIA_HOST_ALLOWLIST
  })

  it('rejeita URL insegura sem chamar fetch', async () => {
    await expect(safeMediaFetch('http://127.0.0.1:6379/x')).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejeita javascript: sem chamar fetch', async () => {
    await expect(safeMediaFetch('javascript:alert(1)')).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('para URL segura, chama fetch com redirect: manual', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('ok', { status: 200 }))
    await safeMediaFetch('https://cdn.example.com/x')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [, init] = fetchSpy.mock.calls[0]
    expect(init?.redirect).toBe('manual')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('com resposta 302 apontando para localhost, devolve a resposta sem seguir', async () => {
    // redirect: 'manual' garante que fetch retorna a 302 crua. Sem isso, o
    // browser/Node seguiria o Location automaticamente e o SSRF passaria.
    fetchSpy.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { Location: 'http://localhost:6379/x' } }),
    )
    const response = await safeMediaFetch('https://cdn.example.com/x')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('http://localhost:6379/x')
  })

  it('UnsafeUrlError carrega o motivo estruturado', async () => {
    try {
      await safeMediaFetch('http://backend.internal/x')
      throw new Error('deveria ter lançado')
    } catch (err) {
      expect(err).toBeInstanceOf(UnsafeUrlError)
      if (err instanceof UnsafeUrlError) {
        expect(err.reason).toMatch(/scheme|internal|suffix/)
      }
    }
  })
})
