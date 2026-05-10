import type {
  ZapiCreateInstanceParams,
  ZapiCreateInstanceResult,
  ZapiInstanceCredentials,
  ZapiInstanceStatus,
  ZapiQrCode,
  ZapiSimpleAck,
} from './zapi.types'

export class ZapiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
    public readonly responseBody?: string,
  ) {
    super(message)
    this.name = 'ZapiError'
  }
}

function getBaseUrl(): string {
  return process.env.ZAPI_BASE_URL ?? 'https://api.z-api.io'
}

function getAccountToken(): string {
  const token = process.env.ZAPI_ACCOUNT_TOKEN
  if (!token) {
    throw new ZapiError(
      'ZAPI_ACCOUNT_TOKEN não configurado',
      0,
      'config',
    )
  }
  return token
}

function instanceUrl(creds: ZapiInstanceCredentials, path: string): string {
  return `${getBaseUrl()}/instances/${creds.instanceId}/token/${creds.instanceToken}/${path}`
}

async function parseOrThrow<T>(
  response: Response,
  endpoint: string,
): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new ZapiError(
      `Z-API ${endpoint} falhou [${response.status}]`,
      response.status,
      endpoint,
      body,
    )
  }
  return (await response.json()) as T
}

export async function createInstance(
  params: ZapiCreateInstanceParams,
): Promise<ZapiCreateInstanceResult> {
  const response = await fetch(`${getBaseUrl()}/instances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccountToken()}`,
    },
    body: JSON.stringify(params),
  })

  const result = await parseOrThrow<ZapiCreateInstanceResult>(response, '/instances')

  if (!result.id || !result.token) {
    throw new ZapiError(
      'Z-API /instances retornou sem id/token',
      response.status,
      '/instances',
      JSON.stringify(result),
    )
  }
  return result
}

export async function getInstanceStatus(
  creds: ZapiInstanceCredentials,
): Promise<ZapiInstanceStatus> {
  const response = await fetch(instanceUrl(creds, 'status'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return parseOrThrow<ZapiInstanceStatus>(response, '/status')
}

export async function getQrCodeImage(
  creds: ZapiInstanceCredentials,
): Promise<ZapiQrCode> {
  const response = await fetch(instanceUrl(creds, 'qr-code/image'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return parseOrThrow<ZapiQrCode>(response, '/qr-code/image')
}

export async function disconnectInstance(
  creds: ZapiInstanceCredentials,
): Promise<ZapiSimpleAck> {
  const response = await fetch(instanceUrl(creds, 'disconnect'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return parseOrThrow<ZapiSimpleAck>(response, '/disconnect')
}
