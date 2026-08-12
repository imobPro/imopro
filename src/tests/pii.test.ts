import { describe, it, expect } from 'vitest'
import { maskPhone, maskEmail } from '../shared/utils/pii'

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
