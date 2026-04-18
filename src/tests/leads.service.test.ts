import { describe, it, expect } from 'vitest'
import { calcScoreDelta } from '../modules/leads/leads.service'

// ---------------------------------------------------------------------------
// calcScoreDelta
// ---------------------------------------------------------------------------

describe('calcScoreDelta', () => {
  it('retorna 2 para visita', () => {
    expect(calcScoreDelta('visita')).toBe(2)
  })

  it('retorna 1 para compra', () => {
    expect(calcScoreDelta('compra')).toBe(1)
  })

  it('retorna 1 para aluguel', () => {
    expect(calcScoreDelta('aluguel')).toBe(1)
  })

  it('retorna 1 para venda', () => {
    expect(calcScoreDelta('venda')).toBe(1)
  })

  it('retorna 0 para informacao', () => {
    expect(calcScoreDelta('informacao')).toBe(0)
  })

  it('retorna 0 para desconhecido', () => {
    expect(calcScoreDelta('desconhecido')).toBe(0)
  })
})
