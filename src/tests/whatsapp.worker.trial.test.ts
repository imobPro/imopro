import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../modules/billing', () => ({
  getSubscription: vi.fn(),
  isAccessAllowed: vi.fn(),
  incrementTrialMessageCount: vi.fn(),
  expireTrial: vi.fn(),
  getTrialMessageLimit: vi.fn(() => 50),
}))

import { recordAiResponseForBilling } from '../modules/whatsapp/whatsapp.worker'
import {
  incrementTrialMessageCount,
  expireTrial,
  getTrialMessageLimit,
} from '../modules/billing'
import type { Subscription } from '../modules/billing'

const incrementMock = incrementTrialMessageCount as ReturnType<typeof vi.fn>
const expireMock = expireTrial as ReturnType<typeof vi.fn>
const limitMock = getTrialMessageLimit as ReturnType<typeof vi.fn>

beforeEach(() => {
  incrementMock.mockReset()
  expireMock.mockReset()
  limitMock.mockReset()
  limitMock.mockReturnValue(50)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const trialSub: Subscription = {
  tenantId: 'tenant-1',
  status: 'trial',
  trialStartedAt: '2026-05-10T00:00:00Z',
  trialEndsAt: '2026-05-17T00:00:00Z',
  trialMessageCount: 10,
  planId: null,
  subscribedAt: null,
  canceledAt: null,
}

describe('recordAiResponseForBilling', () => {
  it('incrementa quando subscription está em trial', async () => {
    incrementMock.mockResolvedValueOnce(11)

    await recordAiResponseForBilling(trialSub, 'tenant-1')

    expect(incrementMock).toHaveBeenCalledWith('tenant-1')
    expect(expireMock).not.toHaveBeenCalled()
  })

  it('incrementa E marca expired quando atinge o cap', async () => {
    incrementMock.mockResolvedValueOnce(50)

    await recordAiResponseForBilling(trialSub, 'tenant-1')

    expect(incrementMock).toHaveBeenCalledWith('tenant-1')
    expect(expireMock).toHaveBeenCalledWith('tenant-1')
  })

  it('marca expired quando passa do cap (count > limit)', async () => {
    incrementMock.mockResolvedValueOnce(51)

    await recordAiResponseForBilling(trialSub, 'tenant-1')

    expect(expireMock).toHaveBeenCalledWith('tenant-1')
  })

  it('respeita limite custom do env', async () => {
    limitMock.mockReturnValue(100)
    incrementMock.mockResolvedValueOnce(60)

    await recordAiResponseForBilling(trialSub, 'tenant-1')

    expect(incrementMock).toHaveBeenCalled()
    expect(expireMock).not.toHaveBeenCalled()
  })

  it('NO-OP quando subscription tem status active', async () => {
    await recordAiResponseForBilling({ ...trialSub, status: 'active' }, 'tenant-1')

    expect(incrementMock).not.toHaveBeenCalled()
    expect(expireMock).not.toHaveBeenCalled()
  })

  it('NO-OP quando subscription tem status expired', async () => {
    await recordAiResponseForBilling({ ...trialSub, status: 'expired' }, 'tenant-1')

    expect(incrementMock).not.toHaveBeenCalled()
    expect(expireMock).not.toHaveBeenCalled()
  })

  it('NO-OP quando subscription é null (defensivo)', async () => {
    await recordAiResponseForBilling(null, 'tenant-1')

    expect(incrementMock).not.toHaveBeenCalled()
    expect(expireMock).not.toHaveBeenCalled()
  })

  it('NO-OP quando RPC retorna null (subscription mudou de status entre fetches)', async () => {
    incrementMock.mockResolvedValueOnce(null)

    await recordAiResponseForBilling(trialSub, 'tenant-1')

    expect(incrementMock).toHaveBeenCalled()
    expect(expireMock).not.toHaveBeenCalled()
  })
})
