import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn() },
}))

// resolveTenantByInstance lê tenants apenas — o mock do redis/queue não importa,
// mas precisamos stubar pra evitar erro de side-effect na importação.
vi.mock('../shared/queue/redis', () => ({
  redisConnection: { set: vi.fn(), del: vi.fn() },
}))

vi.mock('../shared/queue/queues', () => ({
  whatsappQueue: { add: vi.fn() },
  WHATSAPP_QUEUE_NAME: 'whatsapp-messages',
}))

import { supabase } from '../shared/database/supabase'
import { resolveTenantByInstance } from '../modules/whatsapp/whatsapp.service'
import { queueFromResponses } from './helpers/supabase-mock'

const fromMock = supabase.from as ReturnType<typeof vi.fn>

beforeEach(() => {
  fromMock.mockReset()
})

function silenceConsoleError() {
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('resolveTenantByInstance', () => {
  it('retorna o id do tenant quando a Z-API instanceId está cadastrada', async () => {
    queueFromResponses(fromMock, [{ data: { id: 'tenant-uuid-1' }, error: null }])

    const tenantId = await resolveTenantByInstance('zapi-instance-abc123')

    expect(tenantId).toBe('tenant-uuid-1')
    expect(fromMock).toHaveBeenCalledWith('tenants')
  })

  it('retorna null quando nenhum tenant tem aquele instanceId (auth falha)', async () => {
    queueFromResponses(fromMock, [{ data: null, error: null }])

    const tenantId = await resolveTenantByInstance('zapi-instance-desconhecida')

    expect(tenantId).toBeNull()
  })

  it('retorna null em erro de banco (não vaza identidade para a Z-API)', async () => {
    silenceConsoleError()
    queueFromResponses(fromMock, [
      { data: null, error: { message: 'connection refused' } },
    ])

    const tenantId = await resolveTenantByInstance('zapi-instance-xyz')

    expect(tenantId).toBeNull()
  })
})
