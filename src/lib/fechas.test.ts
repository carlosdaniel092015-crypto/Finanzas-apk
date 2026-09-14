import { describe, expect, it } from 'vitest'
import { diasHasta, mesesDesde, proximoPago, textoVencimiento } from './fechas'

const el = (s: string) => new Date(`${s}T12:00:00`)

describe('proximoPago', () => {
  it('si el día aún no pasó, es este mes', () => {
    expect(proximoPago(20, el('2026-09-14'))).toEqual(new Date(2026, 8, 20))
  })

  it('si ya pasó, salta al mes siguiente', () => {
    expect(proximoPago(5, el('2026-09-14'))).toEqual(new Date(2026, 9, 5))
  })

  it('el día de hoy cuenta como hoy, no como el mes que viene', () => {
    expect(proximoPago(14, el('2026-09-14'))).toEqual(new Date(2026, 8, 14))
  })

  it('un día 31 en un mes de 30 cae el último día real', () => {
    expect(proximoPago(31, el('2026-09-01'))).toEqual(new Date(2026, 8, 30))
    expect(proximoPago(31, el('2027-02-01'))).toEqual(new Date(2027, 1, 28))
  })

  it('cruza el año correctamente', () => {
    expect(proximoPago(5, el('2026-12-20'))).toEqual(new Date(2027, 0, 5))
  })

  it('sin día configurado devuelve null', () => {
    expect(proximoPago(undefined)).toBeNull()
    expect(proximoPago(0)).toBeNull()
    expect(proximoPago(32)).toBeNull()
  })
})

describe('diasHasta', () => {
  it('cuenta días completos en ambas direcciones', () => {
    expect(diasHasta(el('2026-09-20'), el('2026-09-14'))).toBe(6)
    expect(diasHasta(el('2026-09-14'), el('2026-09-14'))).toBe(0)
    expect(diasHasta(el('2026-09-10'), el('2026-09-14'))).toBe(-4)
  })
})

describe('textoVencimiento', () => {
  it('usa palabras, no números sueltos', () => {
    expect(textoVencimiento(0)).toBe('vence hoy')
    expect(textoVencimiento(1)).toBe('vence mañana')
    expect(textoVencimiento(5)).toBe('vence en 5 días')
    expect(textoVencimiento(-1)).toBe('venció ayer')
    expect(textoVencimiento(-3)).toBe('venció hace 3 días')
  })
})

describe('mesesDesde', () => {
  it('cuenta meses completos', () => {
    expect(mesesDesde('2026-06-14', el('2026-09-14'))).toBe(3)
    expect(mesesDesde('2026-06-20', el('2026-09-14'))).toBe(2)
    expect(mesesDesde('2026-09-01', el('2026-09-14'))).toBe(0)
  })

  it('tolera vacío', () => {
    expect(mesesDesde(undefined)).toBeNull()
  })
})
