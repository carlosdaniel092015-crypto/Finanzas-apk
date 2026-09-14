import { describe, expect, it } from 'vitest'
import { formatMesAnio, formatMeses, formatMoney } from './format'

describe('formatMoney', () => {
  it('usa RD$ para pesos dominicanos', () => {
    expect(formatMoney(1234.5, 'DOP')).toContain('1,234.5')
    expect(formatMoney(1234.5, 'DOP')).toContain('RD$')
  })

  it('usa $ para dolares', () => {
    expect(formatMoney(1234, 'USD')).toBe('$1,234')
  })

  it('no explota con NaN ni Infinity', () => {
    expect(formatMoney(NaN)).toContain('0')
    expect(formatMoney(Infinity)).toContain('0')
  })
})

describe('formatMeses', () => {
  it('singular y plural', () => {
    expect(formatMeses(1)).toBe('1 mes')
    expect(formatMeses(11)).toBe('11 meses')
  })

  it('convierte a años', () => {
    expect(formatMeses(12)).toBe('1 año')
    expect(formatMeses(24)).toBe('2 años')
    expect(formatMeses(38)).toBe('3 años y 2 meses')
  })

  it('null se dice con palabras, no con un guion suelto', () => {
    expect(formatMeses(null)).toBe('más de 50 años')
  })

  it('cero significa que ya no hay deuda', () => {
    expect(formatMeses(0)).toBe('ya estás libre')
  })
})

describe('formatMesAnio', () => {
  it('abrevia el mes y lo capitaliza', () => {
    expect(formatMesAnio('2028-03-01')).toBe('Mar 2028')
    expect(formatMesAnio('2026-11-15')).toBe('Nov 2026')
  })

  it('tolera null', () => {
    expect(formatMesAnio(null)).toBe('—')
  })
})
