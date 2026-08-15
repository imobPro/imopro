import { describe, it, expect } from 'vitest'
import { maskPhone, maskEmail, maskId } from '../shared/utils/pii'

describe('maskPhone', () => {
  it('mascara telefone brasileiro completo', () => {
    expect(maskPhone('5521988887777')).toBe('55219****7777')
  })

  it('ignora formatação e trabalha só com dígitos', () => {
    expect(maskPhone('+55 21 98888-7777')).toBe('55219****7777')
    expect(maskPhone('(21) 98888-7777')).toBe('21988****7777')
  })

  it('null e undefined viram marker legível', () => {
    expect(maskPhone(null)).toBe('(null)')
    expect(maskPhone(undefined)).toBe('(null)')
  })

  it('string vazia (ou só símbolos) vira (empty)', () => {
    expect(maskPhone('')).toBe('(empty)')
    expect(maskPhone('()')).toBe('(empty)')
  })

  it('curto demais mascara tudo pra não vazar nem os dígitos que sobrariam', () => {
    expect(maskPhone('123')).toBe('***')
    expect(maskPhone('1234567')).toBe('***')
  })

  it('exatamente 8 dígitos ainda tem head de 4 (5 - 1 para não sobrepor com tail)', () => {
    expect(maskPhone('12345678')).toBe('1234****5678')
  })

  it('nunca deixa o telefone original recuperável só a partir da máscara', () => {
    const original = '5521988887777'
    const masked = maskPhone(original)
    expect(masked).not.toBe(original)
    // Máscara não pode conter todos os dígitos originais
    const originalDigits = original
    const maskedDigits = masked.replace(/\D/g, '')
    expect(maskedDigits.length).toBeLessThan(originalDigits.length)
  })
})

describe('maskEmail', () => {
  it('mascara e-mail comum preservando 1ª/última letra + domínio', () => {
    expect(maskEmail('arthur@example.com')).toBe('a***r@example.com')
  })

  it('local part de 1 char vira apenas *', () => {
    expect(maskEmail('a@b.com')).toBe('*@b.com')
  })

  it('local part de 2 chars mostra primeira e última', () => {
    expect(maskEmail('ab@c.com')).toBe('a*b@c.com')
  })

  it('trim antes de processar', () => {
    expect(maskEmail('  arthur@example.com  ')).toBe('a***r@example.com')
  })

  it('null e vazio', () => {
    expect(maskEmail(null)).toBe('(null)')
    expect(maskEmail(undefined)).toBe('(null)')
    expect(maskEmail('')).toBe('(empty)')
    expect(maskEmail('   ')).toBe('(empty)')
  })

  it('sem @ ou @ na borda vira invalid', () => {
    expect(maskEmail('sem-arroba')).toBe('(invalid-email)')
    expect(maskEmail('@abc.com')).toBe('(invalid-email)')
    expect(maskEmail('abc@')).toBe('(invalid-email)')
  })

  it('domínio inteiro é preservado — útil para distinguir gmail vs corporativo em debug', () => {
    expect(maskEmail('joao@empresa-do-cliente.com.br')).toBe('j***o@empresa-do-cliente.com.br')
  })
})

describe('maskId', () => {
  it('mascara UUID preservando os 8 primeiros chars', () => {
    expect(maskId('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-****')
  })

  it('duas chamadas com o mesmo UUID produzem o mesmo prefixo — permite correlação', () => {
    const a = maskId('550e8400-e29b-41d4-a716-446655440000')
    const b = maskId('550e8400-e29b-41d4-a716-446655440000')
    expect(a).toBe(b)
  })

  it('UUIDs diferentes com o mesmo prefixo dão máscaras iguais — trade-off aceito', () => {
    // Colisão de prefixo entre 8 hex chars é ~1 em 4,3 bilhões — irrelevante na
    // prática para um único tenant, e o benefício de menor cardinalidade em log
    // pesa mais que essa possibilidade teórica.
    expect(maskId('550e8400-aaaa-bbbb-cccc-dddddddddddd'))
      .toBe(maskId('550e8400-1111-2222-3333-444444444444'))
  })

  it('null e undefined viram marker legível', () => {
    expect(maskId(null)).toBe('(null)')
    expect(maskId(undefined)).toBe('(null)')
  })

  it('string vazia vira (empty)', () => {
    expect(maskId('')).toBe('(empty)')
  })

  it('id curto demais mascara tudo pra não vazar o valor inteiro', () => {
    expect(maskId('curto')).toBe('***')
    expect(maskId('agent-1')).toBe('***')
    expect(maskId('12345678901')).toBe('***') // 11 chars — ainda abaixo do limite
  })

  it('id com exatamente 12 chars já cabe no formato prefixo+****', () => {
    expect(maskId('abcdefghijkl')).toBe('abcdefgh-****')
  })

  it('nunca deixa o id original recuperável só a partir da máscara', () => {
    const original = '550e8400-e29b-41d4-a716-446655440000'
    const masked = maskId(original)
    expect(masked).not.toBe(original)
    expect(masked.length).toBeLessThan(original.length)
  })
})
