import { describe, expect, it } from 'vitest'
import { aMensual, totalMensual } from './frecuencia'

describe('aMensual', () => {
  it('mensual se queda igual', () => {
    expect(aMensual(25000, 'mensual')).toBe(25000)
  })

  it('quincenal es el doble: dos quincenas hacen un mes', () => {
    expect(aMensual(20000, 'quincenal')).toBe(40000)
  })

  it('anual se reparte entre 12', () => {
    // Un seguro de 3.000 al año son 250 al mes, no 3.000.
    expect(aMensual(3000, 'anual')).toBe(250)
  })

  it('trimestral y semestral', () => {
    expect(aMensual(9000, 'trimestral')).toBe(3000)
    expect(aMensual(9000, 'semestral')).toBe(1500)
    expect(aMensual(9000, 'bimestral')).toBe(4500)
  })

  it('semanal usa 52/12, no 4', () => {
    // Con 4 se perderian casi cuatro semanas de gasto al año.
    expect(aMensual(1000, 'semanal')).toBeCloseTo(4333.33, 1)
    expect(aMensual(1000, 'semanal')).toBeGreaterThan(4000)
  })

  it('sin frecuencia asume mensual', () => {
    expect(aMensual(5000)).toBe(5000)
  })

  it('tolera basura sin propagar NaN al resto de los calculos', () => {
    expect(aMensual(NaN, 'mensual')).toBe(0)
    expect(aMensual(Infinity, 'anual')).toBe(0)
  })
})

describe('totalMensual', () => {
  it('suma periodicidades mezcladas', () => {
    expect(
      totalMensual([
        { monto: 60000, frecuencia: 'mensual' },   // 60.000
        { monto: 15000, frecuencia: 'quincenal' }, // 30.000
        { monto: 12000, frecuencia: 'anual' },     //  1.000
      ]),
    ).toBe(91000)
  })

  it('lista vacia da cero', () => {
    expect(totalMensual([])).toBe(0)
  })

  it('ignora montos vacios', () => {
    expect(totalMensual([{ monto: 0 }, { monto: 5000 }])).toBe(5000)
  })
})
