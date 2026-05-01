import 'express'

declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      userId: string
      email: string | null
      tenantId: string
      agentId: string
    }
  }
}
