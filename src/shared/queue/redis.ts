import Redis from 'ioredis'

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL não definida no ambiente')
}

// Singleton — reutiliza a mesma conexão em todo o processo
export const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // obrigatório para BullMQ
  enableReadyCheck: false,
})

redisConnection.on('error', (err: Error) => {
  console.error('[Redis] Erro de conexão:', err.message)
})

redisConnection.on('connect', () => {
  console.log('[Redis] Conectado')
})
