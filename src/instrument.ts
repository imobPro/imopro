// Inicialização do Sentry — deve ser o PRIMEIRO import de src/index.ts.
// Documentação: https://docs.sentry.io/platforms/javascript/guides/node/
//
// Sem `tracesSampleRate`: tracing desabilitado (Sprint 9.4 — só errors,
// economiza cota do free tier de 5k/mês). Quando passar de 1 piloto e
// quiser performance, definir tracesSampleRate baixo (0.1) e medir.

import 'dotenv/config'
import * as Sentry from '@sentry/node'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    // sendDefaultPii=false: não anexa IP do request nem headers de auth.
    // Mantém LGPD-friendly. Para debugar incidente específico, anexar contexto
    // manual via Sentry.setContext().
    sendDefaultPii: false,
    // Stacktrace em captureMessage (não só em exceptions). Útil para os pontos
    // da lição 018 — saber qual catch silencioso disparou.
    attachStacktrace: true,
  })
  console.log(`[Sentry] Inicializado (environment=${process.env.NODE_ENV ?? 'development'}).`)
} else {
  console.log('[Sentry] SENTRY_DSN ausente — relatórios de erro desabilitados.')
}
