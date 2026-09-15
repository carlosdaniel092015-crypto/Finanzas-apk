import { describe, expect, it } from 'vitest'
import { deudasComoFuentes, generarRecordatorios } from './recordatorios'
import type { Deuda } from './tipos'

const fmt = (n: number) => `RD$${n}`
const hoy = new Date('2026-09-15T12:00:00')

describe('generarRecordatorios', () => {
  const fuente = { id: 'd1', nombre: 'Tarjeta Popular', monto: 5000, diaPago: 25 }

  it('avisa antes Y el mismo día', () => {
    // Un aviso solo el día del pago llega tarde para quien tiene que ir al banco.
    const r = generarRecordatorios([fuente], { formatoMonto: fmt, hoy, meses: 1 })
    expect(r.some((x) => /vence en 3 días/.test(x.titulo))).toBe(true)
    expect(r.some((x) => /Hoy toca/.test(x.titulo))).toBe(true)
  })

  it('genera varios meses hacia adelante', () => {
    const r = generarRecordatorios([fuente], { formatoMonto: fmt, hoy, meses: 3 })
    const dias = r.filter((x) => /Hoy toca/.test(x.titulo))
    expect(dias).toHaveLength(3)
    expect(dias.map((d) => d.cuando.getMonth())).toEqual([8, 9, 10]) // sep, oct, nov
  })

  it('no programa nada en el pasado', () => {
    const r = generarRecordatorios([fuente], { formatoMonto: fmt, hoy, meses: 3 })
    expect(r.every((x) => x.cuando.getTime() > hoy.getTime())).toBe(true)
  })

  it('omite el aviso previo si ya pasó, pero mantiene el del día', () => {
    // Día 17 con 3 días antes = el aviso previo era el 14, ya pasó.
    const r = generarRecordatorios([{ ...fuente, diaPago: 17 }], {
      formatoMonto: fmt, hoy, meses: 1,
    })
    expect(r.filter((x) => /vence en/.test(x.titulo))).toHaveLength(0)
    expect(r.filter((x) => /Hoy toca/.test(x.titulo))).toHaveLength(1)
  })

  it('ignora fuentes sin día de pago o sin monto', () => {
    expect(generarRecordatorios([{ id: 'x', nombre: 'A', monto: 5000 }], { formatoMonto: fmt, hoy }))
      .toHaveLength(0)
    expect(generarRecordatorios([{ id: 'x', nombre: 'A', monto: 0, diaPago: 5 }], { formatoMonto: fmt, hoy }))
      .toHaveLength(0)
  })

  it('las claves son estables: reprogramar no duplica avisos', () => {
    const a = generarRecordatorios([fuente], { formatoMonto: fmt, hoy, meses: 2 })
    const b = generarRecordatorios([fuente], { formatoMonto: fmt, hoy, meses: 2 })
    expect(a.map((x) => x.clave)).toEqual(b.map((x) => x.clave))
    expect(new Set(a.map((x) => x.clave)).size).toBe(a.length)
  })

  it('llegan ordenados por fecha', () => {
    const r = generarRecordatorios(
      [fuente, { id: 'd2', nombre: 'Préstamo', monto: 18900, diaPago: 5 }],
      { formatoMonto: fmt, hoy, meses: 2 },
    )
    const t = r.map((x) => x.cuando.getTime())
    expect([...t].sort((a, b) => a - b)).toEqual(t)
  })

  it('avisa a las 9 de la mañana, no a medianoche', () => {
    const r = generarRecordatorios([fuente], { formatoMonto: fmt, hoy, meses: 1 })
    expect(r.every((x) => x.cuando.getHours() === 9)).toBe(true)
  })
})

describe('deudasComoFuentes', () => {
  const deuda = (p: Partial<Deuda>): Deuda => ({
    id: 'x', nombre: 'T', tipo: 'tarjeta', saldo: 50000, tasaAnual: 30,
    tipoTasa: 'variable', cuotaMensual: 5000, ...p,
  })

  it('excluye las deudas ya saldadas', () => {
    expect(deudasComoFuentes([deuda({ saldo: 0, diaPago: 5 })])).toHaveLength(0)
  })

  it('lleva el día de pago de la deuda', () => {
    const f = deudasComoFuentes([deuda({ diaPago: 25 })])
    expect(f[0].diaPago).toBe(25)
    expect(f[0].monto).toBe(5000)
  })
})
