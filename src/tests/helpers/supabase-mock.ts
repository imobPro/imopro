import { vi } from 'vitest'

export type QueryResult = { data?: unknown; error?: unknown; count?: number | null }

export type CaptureFn = (payload: unknown) => void

type FromMock = ReturnType<typeof vi.fn>

/**
 * Stub encadeável compatível com o query builder do supabase-js. Resolve com
 * `result` ao chamar `maybeSingle/single` ou ao ser awaited diretamente
 * (PostgREST com `head:true` deixa a chain awaitable).
 *
 * `captureUpdate` permite inspecionar o payload do `.update()` no teste.
 */
export function chain(result: QueryResult, captureUpdate?: CaptureFn) {
  const self: Record<string, unknown> = {}
  const passthrough = () => self
  Object.assign(self, {
    select: passthrough,
    eq: passthrough,
    gte: passthrough,
    lt: passthrough,
    not: passthrough,
    is: passthrough,
    order: passthrough,
    limit: passthrough,
    update: (payload: unknown) => {
      captureUpdate?.(payload)
      return self
    },
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (onFulfilled: (v: QueryResult) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  })
  return self
}

/**
 * Configura `supabase.from` (ou outro Mock) para devolver respostas em
 * sequência: a n-ésima chamada consome `responses[n]` e dispara
 * `captures[n]` (se definido) quando o teste fizer `.update(payload)`.
 *
 * Use `undefined` em posições da fila de captures que não precisam inspecionar
 * o payload.
 */
export function queueFromResponses(
  fromMock: FromMock,
  responses: QueryResult[],
  captures?: Array<CaptureFn | undefined>
) {
  const responseQueue = [...responses]
  const captureQueue = [...(captures ?? [])]
  fromMock.mockImplementation(() => {
    const next = responseQueue.shift() ?? { data: null, error: null }
    const cap = captureQueue.shift()
    return chain(next, cap)
  })
}

/**
 * Variante que registra UMA resposta para a próxima chamada de `from()`. Útil
 * quando o teste tem várias asserções intercaladas e cada uma só dispara uma
 * query.
 */
export function mockFromOnce(fromMock: FromMock, result: QueryResult) {
  fromMock.mockImplementationOnce(() => chain(result))
}
