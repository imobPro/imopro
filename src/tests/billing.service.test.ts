import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../shared/database/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}))

import { supabase } from '../shared/database/supabase'
import {
  getSubscription,
  isTrialActive,
  isAccessAllowed,
  getTrialMessageLimit,
  getTrialDays,
  incrementTrialMessageCount,
  startTrialClock,
  expireTrial,
  expireTrialsByTime,
  markActive,
  toSubscriptionView,
} from '../modules/billing/billing.service'
import { HttpError } from '../shared/errors/http-error'
import { queueFromResponses } from './helpers/supabase-mock'
import type { Subscription } from '../modules/billing/billing.types'

const fromMock = supabase.from as ReturnType<typeof vi.fn>
const rpcMock = supabase.rpc as ReturnType<typeof vi.fn>

const ORIGINAL_TRIAL_LIMIT = process.env.TRIAL_MESSAGE_LIMIT
const ORIGINAL_TRIAL_DAYS = process.env.TRIAL_DAYS

beforeEach(() => {
  fromMock.mockReset()
  rpcMock.mockReset()
  process.env.TRIAL_MESSAGE_LIMIT = '50'
  process.env.TRIAL_DAYS = '7'
})

afterEach(() => {
  if (ORIGINAL_TRIAL_LIMIT === undefined) delete process.env.TRIAL_MESSAGE_LIMIT
  else process.env.TRIAL_MESSAGE_LIMIT = ORIGINAL_TRIAL_LIMIT
  if (ORIGINAL_TRIAL_DAYS === undefined) delete process.env.TRIAL_DAYS
  else process.env.TRIAL_DAYS = ORIGINAL_TRIAL_DAYS
})

const trialSub: Subscription = {
  tenantId: 'tenant-1',
  status: 'trial',
  trialStartedAt: '2026-05-10T00:00:00Z',
  trialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  trialMessageCount: 10,
  planId: null,
  subscribedAt: null,
  canceledAt: null,
}

// ---------------------------------------------------------------------------
// getTrialMessageLimit — env override + default
// ---------------------------------------------------------------------------

describe('getTrialMessageLimit', () => {
  it('lê do env quando válido', () => {
    process.env.TRIAL_MESSAGE_LIMIT = '120'
    expect(getTrialMessageLimit()).toBe(120)
  })

  it('cai no default 50 quando env ausente', () => {
    delete process.env.TRIAL_MESSAGE_LIMIT
    expect(getTrialMessageLimit()).toBe(50)
  })

  it('cai no default quando env inválido', () => {
    process.env.TRIAL_MESSAGE_LIMIT = 'abc'
    expect(getTrialMessageLimit()).toBe(50)
    process.env.TRIAL_MESSAGE_LIMIT = '0'
    expect(getTrialMessageLimit()).toBe(50)
    process.env.TRIAL_MESSAGE_LIMIT = '-5'
    expect(getTrialMessageLimit()).toBe(50)
  })
})

describe('getTrialDays', () => {
  it('lê do env quando válido', () => {
    process.env.TRIAL_DAYS = '14'
    expect(getTrialDays()).toBe(14)
  })

  it('cai no default 7 quando env ausente ou inválido', () => {
    delete process.env.TRIAL_DAYS
    expect(getTrialDays()).toBe(7)
    process.env.TRIAL_DAYS = 'abc'
    expect(getTrialDays()).toBe(7)
    process.env.TRIAL_DAYS = '0'
    expect(getTrialDays()).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// isTrialActive
// ---------------------------------------------------------------------------

describe('isTrialActive', () => {
  it('true quando status=trial, dentro do prazo, abaixo do cap', () => {
    expect(isTrialActive(trialSub)).toBe(true)
  })

  it('false quando trial_ends_at já passou', () => {
    const expired = { ...trialSub, trialEndsAt: '2025-01-01T00:00:00Z' }
    expect(isTrialActive(expired)).toBe(false)
  })

  it('false quando trial_message_count atingiu cap', () => {
    const capReached = { ...trialSub, trialMessageCount: 50 }
    expect(isTrialActive(capReached)).toBe(false)
  })

  it('false quando trial_message_count passou do cap', () => {
    const overCap = { ...trialSub, trialMessageCount: 60 }
    expect(isTrialActive(overCap)).toBe(false)
  })

  it('false quando status não é trial', () => {
    expect(isTrialActive({ ...trialSub, status: 'active' })).toBe(false)
    expect(isTrialActive({ ...trialSub, status: 'expired' })).toBe(false)
    expect(isTrialActive({ ...trialSub, status: 'canceled' })).toBe(false)
  })

  it('true quando o relógio ainda não começou (datas null) e abaixo do cap', () => {
    expect(isTrialActive({ ...trialSub, trialStartedAt: null, trialEndsAt: null })).toBe(true)
  })

  it('false quando o relógio não começou mas o cap de mensagens já foi atingido', () => {
    expect(
      isTrialActive({ ...trialSub, trialStartedAt: null, trialEndsAt: null, trialMessageCount: 50 }),
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isAccessAllowed
// ---------------------------------------------------------------------------

describe('isAccessAllowed', () => {
  it('libera para active', () => {
    expect(isAccessAllowed({ ...trialSub, status: 'active' })).toBe(true)
  })

  it('libera para trial ativo', () => {
    expect(isAccessAllowed(trialSub)).toBe(true)
  })

  it('bloqueia para expired', () => {
    expect(isAccessAllowed({ ...trialSub, status: 'expired' })).toBe(false)
  })

  it('bloqueia para canceled', () => {
    expect(isAccessAllowed({ ...trialSub, status: 'canceled' })).toBe(false)
  })

  it('bloqueia trial vencido por prazo', () => {
    const old = { ...trialSub, trialEndsAt: '2025-01-01T00:00:00Z' }
    expect(isAccessAllowed(old)).toBe(false)
  })

  it('bloqueia trial vencido por count', () => {
    expect(isAccessAllowed({ ...trialSub, trialMessageCount: 50 })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getSubscription
// ---------------------------------------------------------------------------

describe('getSubscription', () => {
  it('mapeia row do banco para Subscription', async () => {
    queueFromResponses(fromMock, [
      {
        data: {
          tenant_id: 'tenant-1',
          status: 'trial',
          trial_started_at: '2026-05-10T00:00:00Z',
          trial_ends_at: '2026-05-17T00:00:00Z',
          trial_message_count: 7,
          plan_id: null,
          subscribed_at: null,
          canceled_at: null,
        },
        error: null,
      },
    ])

    const sub = await getSubscription('tenant-1')

    expect(sub).toEqual({
      tenantId: 'tenant-1',
      status: 'trial',
      trialStartedAt: '2026-05-10T00:00:00Z',
      trialEndsAt: '2026-05-17T00:00:00Z',
      trialMessageCount: 7,
      planId: null,
      subscribedAt: null,
      canceledAt: null,
    })
  })

  it('retorna null quando linha ausente', async () => {
    queueFromResponses(fromMock, [{ data: null, error: null }])
    expect(await getSubscription('tenant-x')).toBeNull()
  })

  it('retorna null e loga em caso de erro', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    queueFromResponses(fromMock, [{ data: null, error: { message: 'boom' } }])
    expect(await getSubscription('tenant-x')).toBeNull()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// incrementTrialMessageCount
// ---------------------------------------------------------------------------

describe('incrementTrialMessageCount', () => {
  it('chama RPC com tenant_id e retorna nova contagem', async () => {
    rpcMock.mockResolvedValueOnce({ data: 11, error: null })

    const count = await incrementTrialMessageCount('tenant-1')

    expect(count).toBe(11)
    expect(rpcMock).toHaveBeenCalledWith('increment_trial_message_count', {
      p_tenant_id: 'tenant-1',
    })
  })

  it('retorna null quando RPC devolve NULL (não está em trial)', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })
    expect(await incrementTrialMessageCount('tenant-1')).toBeNull()
  })

  it('retorna null em caso de erro RPC', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'rpc fail' } })
    expect(await incrementTrialMessageCount('tenant-1')).toBeNull()
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// startTrialClock
// ---------------------------------------------------------------------------

describe('startTrialClock', () => {
  it('grava trial_started_at = now e trial_ends_at = now + TRIAL_DAYS', async () => {
    process.env.TRIAL_DAYS = '7'
    let payload: Record<string, string> | undefined
    queueFromResponses(fromMock, [{ data: null, error: null }], [(p) => (payload = p as Record<string, string>)])

    await startTrialClock('tenant-1')

    expect(typeof payload?.trial_started_at).toBe('string')
    expect(typeof payload?.trial_ends_at).toBe('string')
    const started = new Date(payload!.trial_started_at).getTime()
    const ends = new Date(payload!.trial_ends_at).getTime()
    expect(ends - started).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('respeita TRIAL_DAYS customizado', async () => {
    process.env.TRIAL_DAYS = '14'
    let payload: Record<string, string> | undefined
    queueFromResponses(fromMock, [{ data: null, error: null }], [(p) => (payload = p as Record<string, string>)])

    await startTrialClock('tenant-1')

    const started = new Date(payload!.trial_started_at).getTime()
    const ends = new Date(payload!.trial_ends_at).getTime()
    expect(ends - started).toBe(14 * 24 * 60 * 60 * 1000)
  })

  it('não lança quando supabase erra (apenas loga)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    queueFromResponses(fromMock, [{ data: null, error: { message: 'db down' } }])
    await expect(startTrialClock('tenant-1')).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// expireTrial e expireTrialsByTime
// ---------------------------------------------------------------------------

describe('expireTrial', () => {
  it('atualiza status para expired filtrando por trial', async () => {
    let captured: unknown
    queueFromResponses(
      fromMock,
      [{ data: null, error: null }],
      [(payload) => (captured = payload)],
    )

    await expireTrial('tenant-1')

    expect(captured).toEqual({ status: 'expired' })
  })

  it('não lança quando supabase erra (apenas loga)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    queueFromResponses(fromMock, [{ data: null, error: { message: 'db down' } }])
    await expect(expireTrial('tenant-1')).resolves.toBeUndefined()
    spy.mockRestore()
  })
})

describe('expireTrialsByTime', () => {
  it('retorna número de subscriptions atualizadas', async () => {
    queueFromResponses(fromMock, [
      { data: [{ tenant_id: 'a' }, { tenant_id: 'b' }], error: null },
    ])
    expect(await expireTrialsByTime()).toBe(2)
  })

  it('retorna 0 em caso de erro', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    queueFromResponses(fromMock, [{ data: null, error: { message: 'down' } }])
    expect(await expireTrialsByTime()).toBe(0)
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// markActive
// ---------------------------------------------------------------------------

describe('markActive', () => {
  it('atualiza status, plan_id e subscribed_at', async () => {
    let captured: Record<string, unknown> | undefined
    queueFromResponses(
      fromMock,
      [
        {
          data: {
            tenant_id: 'tenant-1',
            status: 'active',
            trial_started_at: '2026-05-10T00:00:00Z',
            trial_ends_at: '2026-05-17T00:00:00Z',
            trial_message_count: 10,
            plan_id: 'pro',
            subscribed_at: '2026-05-12T00:00:00Z',
            canceled_at: null,
          },
          error: null,
        },
      ],
      [(payload) => (captured = payload as Record<string, unknown>)],
    )

    const result = await markActive('tenant-1', 'pro')

    expect(captured?.status).toBe('active')
    expect(captured?.plan_id).toBe('pro')
    expect(typeof captured?.subscribed_at).toBe('string')
    expect(captured?.canceled_at).toBeNull()
    expect(result.status).toBe('active')
    expect(result.planId).toBe('pro')
  })

  it('rejeita planId vazio', async () => {
    await expect(markActive('tenant-1', '')).rejects.toBeInstanceOf(HttpError)
  })

  it('lança quando supabase erra', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    queueFromResponses(fromMock, [{ data: null, error: { message: 'fail' } }])
    await expect(markActive('tenant-1', 'pro')).rejects.toBeInstanceOf(HttpError)
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// toSubscriptionView
// ---------------------------------------------------------------------------

describe('toSubscriptionView', () => {
  it('calcula trialMessagesRemaining a partir do limite atual', () => {
    const view = toSubscriptionView({ ...trialSub, trialMessageCount: 7 })
    expect(view.trialMessageLimit).toBe(50)
    expect(view.trialMessagesRemaining).toBe(43)
  })

  it('clampa trialMessagesRemaining em 0 quando count > limit', () => {
    const view = toSubscriptionView({ ...trialSub, trialMessageCount: 200 })
    expect(view.trialMessagesRemaining).toBe(0)
  })

  it('expressa accessAllowed = false para trial vencido', () => {
    const view = toSubscriptionView({
      ...trialSub,
      trialEndsAt: '2025-01-01T00:00:00Z',
    })
    expect(view.accessAllowed).toBe(false)
    expect(view.trialDaysRemaining).toBe(0)
  })

  it('expressa accessAllowed = true para active', () => {
    const view = toSubscriptionView({ ...trialSub, status: 'active' })
    expect(view.accessAllowed).toBe(true)
  })

  it('quando o trial ainda não começou: trialStarted false e trialDaysRemaining = TRIAL_DAYS', () => {
    process.env.TRIAL_DAYS = '7'
    const view = toSubscriptionView({ ...trialSub, trialStartedAt: null, trialEndsAt: null })
    expect(view.trialStarted).toBe(false)
    expect(view.trialDaysRemaining).toBe(7)
    expect(view.accessAllowed).toBe(true)
  })

  it('quando o trial já começou: trialStarted true', () => {
    expect(toSubscriptionView(trialSub).trialStarted).toBe(true)
  })
})
