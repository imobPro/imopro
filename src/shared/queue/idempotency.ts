import { redisConnection } from './redis'

const DEFAULT_TTL_SECONDS = 24 * 60 * 60 // 24h — janela folgada para retries de stalled

// ---------------------------------------------------------------------------
// Idempotência por (jobId, label) no Redis
// ---------------------------------------------------------------------------
// BullMQ pode reentregar um job que já estava em execução quando o lock expira
// (stalled). Para reativar `attempts > 1` com segurança em jobs que têm side
// effects externos (envio ao lead, incremento de score), cada side effect é
// envolvido em runOnce: a 1ª execução marca a flag no Redis com SET NX EX e
// roda a função; reentregas pulam silenciosamente. Em caso de erro durante a
// função, a flag é liberada para que o próximo retry possa tentar de fato.

export function buildOnceKey(jobId: string, label: string): string {
  return `once:${jobId}:${label}`
}

export async function markOnce(
  jobId: string,
  label: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  const result = await redisConnection.set(
    buildOnceKey(jobId, label),
    '1',
    'EX',
    ttlSeconds,
    'NX',
  )
  return result === 'OK'
}

export async function clearOnce(jobId: string, label: string): Promise<void> {
  await redisConnection.del(buildOnceKey(jobId, label))
}

export async function runOnce<T>(
  jobId: string,
  label: string,
  fn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<{ ran: true; value: T } | { ran: false }> {
  const claimed = await markOnce(jobId, label, ttlSeconds)
  if (!claimed) {
    console.log(`[Idempotency] pulado (já executado) | jobId=${jobId} label=${label}`)
    return { ran: false }
  }

  try {
    const value = await fn()
    return { ran: true, value }
  } catch (err) {
    // Libera a flag para que a próxima tentativa do BullMQ possa de fato executar.
    // Sem isso, retries acabariam no skip silencioso e a falha seria permanente.
    await clearOnce(jobId, label).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[Idempotency] falha ao liberar flag | jobId=${jobId} label=${label} ${msg}`)
    })
    throw err
  }
}
