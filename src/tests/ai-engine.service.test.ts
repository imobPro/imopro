import { describe, it, expect } from 'vitest'
import { detectIntent } from '../modules/ai-engine/ai-engine.service'

describe('detectIntent', () => {
  it('detecta compra', () => {
    expect(detectIntent('quero comprar um apartamento')).toBe('compra')
    expect(detectIntent('preciso de financiamento')).toBe('compra')
  })

  it('detecta aluguel', () => {
    expect(detectIntent('quero alugar uma casa')).toBe('aluguel')
    expect(detectIntent('preciso de um aluguel')).toBe('aluguel')
  })

  it('detecta venda', () => {
    expect(detectIntent('quero vender meu imóvel')).toBe('venda')
    expect(detectIntent('preciso vender minha casa')).toBe('venda')
  })

  it('detecta visita', () => {
    expect(detectIntent('quero marcar uma visita')).toBe('visita')
    expect(detectIntent('posso visitar o imóvel?')).toBe('visita')
  })

  it('detecta informacao', () => {
    expect(detectIntent('tenho uma dúvida sobre o imóvel')).toBe('informacao')
    expect(detectIntent('me conta mais sobre o apartamento')).toBe('informacao')
  })

  it('retorna desconhecido quando não identifica', () => {
    expect(detectIntent('boa tarde')).toBe('desconhecido')
    expect(detectIntent('ok')).toBe('desconhecido')
  })
})
