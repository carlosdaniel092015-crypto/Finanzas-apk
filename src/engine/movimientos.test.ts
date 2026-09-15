import { describe, expect, it } from 'vitest'
import {
  anclaDevengo, aplicarMovimiento, derivarPlazo, desglosarPago, diasEntre, interesDeLaCartera,
  interesDevengado, mesesEntre, pagosPendientes, resumenInteres, sumarMesesISO,
} from './movimientos'
import type { Deuda, MovimientoDeuda } from './tipos'

const tarjeta: Deuda = {
  id: 't', nombre: 'Tarjeta Popular', tipo: 'tarjeta', saldo: 50000,
  tasaAnual: 30, tipoTasa: 'variable', cuotaMensual: 5000,
}

const prestamo: Deuda = {
  id: 'p', nombre: 'Préstamo vehículo', tipo: 'prestamo_vehiculo', saldo: 205000,
  tasaAnual: 14.2, tipoTasa: 'fija', cuotaMensual: 18900,
  fechaInicio: '2024-01-15', plazoMesesTotal: 60,
}

describe('interesDevengado', () => {
  it('base actual/365', () => {
    // 50.000 al 30% durante 30 dias = 50000 * 0.30 * 30/365
    expect(interesDevengado(50000, 30, 30)).toBeCloseTo(1232.88, 1)
  })

  it('cero dias, cero interes', () => {
    expect(interesDevengado(50000, 30, 0)).toBe(0)
  })

  it('una deuda sin interes no devenga nada', () => {
    expect(interesDevengado(10000, 0, 90)).toBe(0)
  })

  it('el doble de dias es el doble de interes', () => {
    expect(interesDevengado(50000, 30, 60)).toBeCloseTo(interesDevengado(50000, 30, 30) * 2, 1)
  })
})

describe('desglosarPago', () => {
  it('separa interes y capital', () => {
    const d = desglosarPago({ saldo: 50000, tasaAnual: 30, monto: 5000, dias: 30 })
    expect(d.interes).toBeCloseTo(1232.88, 1)
    expect(d.capital).toBeCloseTo(3767.12, 1)
    expect(d.saldoDespues).toBeCloseTo(46232.88, 1)
    expect(d.cubreInteres).toBe(true)
  })

  it('marca cuando el pago NO cubre el interes y la deuda sube', () => {
    const d = desglosarPago({ saldo: 50000, tasaAnual: 30, monto: 1000, dias: 30 })
    expect(d.cubreInteres).toBe(false)
    expect(d.capital).toBeLessThan(0)
    expect(d.saldoDespues).toBeGreaterThan(50000)
  })

  it('un pago mayor al saldo lo deja en cero, no en negativo', () => {
    const d = desglosarPago({ saldo: 1000, tasaAnual: 30, monto: 5000, dias: 30 })
    expect(d.saldoDespues).toBe(0)
  })
})

describe('aplicarMovimiento', () => {
  it('pago: baja el saldo y deja la fecha del ultimo pago', () => {
    const conFecha = { ...tarjeta, fechaUltimoPago: '2026-08-15' }
    const { deuda, movimiento } = aplicarMovimiento(conFecha, {
      tipo: 'pago', fecha: '2026-09-14', monto: 5000,
    })
    expect(deuda.saldo).toBeLessThan(50000)
    expect(deuda.fechaUltimoPago).toBe('2026-09-14')
    expect(movimiento.interes! + movimiento.capital!).toBeCloseTo(5000, 1)
    expect(movimiento.saldoDespues).toBe(deuda.saldo)
  })

  it('no muta la deuda original', () => {
    const original = { ...tarjeta, fechaUltimoPago: '2026-08-15' }
    aplicarMovimiento(original, { tipo: 'pago', fecha: '2026-09-14', monto: 5000 })
    expect(original.saldo).toBe(50000)
  })

  it('consumo: sube el saldo y NO mueve la fecha del ultimo pago', () => {
    const conFecha = { ...tarjeta, fechaUltimoPago: '2026-09-01' }
    const { deuda } = aplicarMovimiento(conFecha, {
      tipo: 'consumo', fecha: '2026-09-14', monto: 8000,
    })
    expect(deuda.saldo).toBe(58000)
    expect(deuda.fechaUltimoPago).toBe('2026-09-01')
  })

  it('reenganche: saldo, tasa, cuota y plazo nuevos, con fecha fin recalculada', () => {
    const { deuda, movimiento } = aplicarMovimiento(prestamo, {
      tipo: 'reenganche', fecha: '2026-09-14', monto: 300000,
      nuevaTasa: 16.5, nuevoPlazoMeses: 48, nuevaCuota: 8600,
    })
    expect(deuda.saldo).toBe(300000)
    expect(deuda.tasaAnual).toBe(16.5)
    expect(deuda.cuotaMensual).toBe(8600)
    expect(deuda.plazoMesesTotal).toBe(48)
    expect(deuda.fechaInicio).toBe('2026-09-14')
    expect(deuda.fechaFin).toBe('2030-09-14')
    expect(movimiento.tipo).toBe('reenganche')
  })

  it('reenganche sin condiciones nuevas conserva las viejas', () => {
    const { deuda } = aplicarMovimiento(prestamo, {
      tipo: 'reenganche', fecha: '2026-09-14', monto: 250000,
    })
    expect(deuda.tasaAnual).toBe(14.2)
    expect(deuda.cuotaMensual).toBe(18900)
  })

  it('ajuste: cuadra contra el estado de cuenta', () => {
    const { deuda } = aplicarMovimiento(tarjeta, {
      tipo: 'ajuste', fecha: '2026-09-14', monto: 47310.55, nota: 'Estado de cuenta',
    })
    expect(deuda.saldo).toBe(47310.55)
  })
})

describe('derivarPlazo', () => {
  it('con meses e inicio, deduce la fecha de fin', () => {
    const p = derivarPlazo(
      { fechaInicio: '2024-01-15', plazoMesesTotal: 60 }, '2026-09-14',
    )
    expect(p.fechaFin).toBe('2029-01-15')
    expect(p.mesesRestantes).toBe(28)
    expect(p.cuotasPagadas).toBe(32)
  })

  it('con fecha de fin e inicio, deduce los meses', () => {
    const p = derivarPlazo(
      { fechaInicio: '2024-01-15', fechaFin: '2029-01-15' }, '2026-09-14',
    )
    expect(p.plazoMesesTotal).toBe(60)
  })

  it('sin datos no inventa nada', () => {
    expect(derivarPlazo({}).fechaFin).toBeUndefined()
    expect(derivarPlazo({}).mesesRestantes).toBeUndefined()
  })

  it('un prestamo ya vencido da cero meses, no negativos', () => {
    const p = derivarPlazo({ fechaInicio: '2020-01-15', fechaFin: '2023-01-15' }, '2026-09-14')
    expect(p.mesesRestantes).toBe(0)
  })
})

describe('sumarMesesISO / mesesEntre / diasEntre', () => {
  it('un 31 en un mes de 30 cae el 30', () => {
    expect(sumarMesesISO('2026-01-31', 1)).toBe('2026-02-28')
    expect(sumarMesesISO('2026-08-31', 1)).toBe('2026-09-30')
  })

  it('resta meses', () => {
    expect(sumarMesesISO('2026-01-15', -1)).toBe('2025-12-15')
  })

  it('mesesEntre cuenta meses completos', () => {
    expect(mesesEntre('2026-01-15', '2026-09-14')).toBe(7)
    expect(mesesEntre('2026-01-15', '2026-09-15')).toBe(8)
  })

  it('diasEntre nunca es negativo', () => {
    expect(diasEntre('2026-09-14', '2026-09-01')).toBe(0)
    expect(diasEntre('2026-09-01', '2026-09-14')).toBe(13)
  })
})

describe('resumenInteres', () => {
  const movs: MovimientoDeuda[] = [
    { id:'1', deudaId:'t', tipo:'pago', fecha:'2026-07-14', monto:5000, interes:1250, capital:3750, saldoDespues:52000 },
    { id:'2', deudaId:'t', tipo:'pago', fecha:'2026-08-14', monto:5000, interes:1200, capital:3800, saldoDespues:50000 },
    { id:'3', deudaId:'otra', tipo:'pago', fecha:'2026-08-14', monto:900, interes:400, capital:500, saldoDespues:1000 },
  ]

  it('suma solo el interes de ESA deuda', () => {
    expect(resumenInteres(tarjeta, movs).pagado).toBe(2450)
  })

  it('dice qué parte de la cuota se lleva el banco', () => {
    const r = resumenInteres(tarjeta, movs)
    // 50.000 al 30% = 1.250/mes de interes sobre una cuota de 5.000 = 25%
    expect(r.esteMes).toBeCloseTo(1250, 0)
    expect(r.pctDeLaCuota).toBeCloseTo(25, 0)
  })

  it('marca insostenible cuando la cuota no cubre el interes', () => {
    const r = resumenInteres({ ...tarjeta, cuotaMensual: 1000 }, [])
    expect(r.insostenible).toBe(true)
  })

  it('el total es lo pagado mas lo proyectado', () => {
    const r = resumenInteres(tarjeta, movs)
    expect(r.total).toBeCloseTo(r.pagado + r.proyectado, 1)
  })
})

describe('interesDeLaCartera', () => {
  it('agrega toda la cartera e ignora las saldadas', () => {
    const r = interesDeLaCartera([tarjeta, prestamo, { ...tarjeta, id: 'z', saldo: 0 }], [])
    expect(r.porDeuda).toHaveLength(2)
    expect(r.cuotas).toBe(23900)
    expect(r.esteMes).toBeGreaterThan(0)
  })
})

describe('pagosPendientes', () => {
  const conDia = { ...tarjeta, diaPago: 5 }

  it('marca pendiente si no hay pago en el ciclo vigente', () => {
    const p = pagosPendientes([conDia], [], '2026-09-14')
    expect(p).toHaveLength(1)
    expect(p[0].fechaEsperada).toBe('2026-09-05')
    expect(p[0].dias).toBe(-9) // vencio hace 9 dias
    expect(p[0].monto).toBe(5000)
  })

  it('no lo marca si ya se registro el pago del ciclo', () => {
    const movs: MovimientoDeuda[] = [
      { id:'1', deudaId:'t', tipo:'pago', fecha:'2026-09-06', monto:5000, saldoDespues:46000 },
    ]
    expect(pagosPendientes([conDia], movs, '2026-09-14')).toHaveLength(0)
  })

  it('un pago del ciclo ANTERIOR no cuenta para el actual', () => {
    const movs: MovimientoDeuda[] = [
      { id:'1', deudaId:'t', tipo:'pago', fecha:'2026-08-06', monto:5000, saldoDespues:46000 },
    ]
    expect(pagosPendientes([conDia], movs, '2026-09-14')).toHaveLength(1)
  })

  it('si el dia de pago aun no llega, el ciclo vigente es el del mes pasado', () => {
    const p = pagosPendientes([{ ...tarjeta, diaPago: 25 }], [], '2026-09-14')
    expect(p[0].fechaEsperada).toBe('2026-08-25')
  })

  it('sin dia de pago usa el mes calendario', () => {
    const p = pagosPendientes([tarjeta], [], '2026-09-14')
    expect(p[0].fechaEsperada).toBe('2026-09-01')
  })

  it('una deuda saldada no genera pendiente', () => {
    expect(pagosPendientes([{ ...conDia, saldo: 0 }], [], '2026-09-14')).toHaveLength(0)
  })

  it('ordena lo mas vencido primero', () => {
    const otra = { ...tarjeta, id: 'x', diaPago: 20 }
    const p = pagosPendientes([conDia, otra], [], '2026-09-14')
    expect(p[0].deuda.id).toBe('x') // ciclo del 20 de agosto, mas viejo
  })
})

describe('ancla del devengo', () => {
  const sinFechas: Deuda = {
    id: 'x', nombre: 'Tarjeta nueva', tipo: 'tarjeta', saldo: 50000,
    tasaAnual: 30, tipoTasa: 'variable', cuotaMensual: 5000,
    fechaRegistro: '2026-08-15',
  }

  it('sin último pago ni inicio, devenga desde el alta en la app', () => {
    const { movimiento } = aplicarMovimiento(sinFechas, {
      tipo: 'pago', fecha: '2026-09-14', monto: 5000,
    })
    // 30 dias al 30% sobre 50.000
    expect(movimiento.interes).toBeGreaterThan(1000)
  })

  it('SIN ninguna fecha el interés sería cero: por eso fechaRegistro es obligatoria de facto', () => {
    const { movimiento } = aplicarMovimiento(
      { ...sinFechas, fechaRegistro: undefined },
      { tipo: 'pago', fecha: '2026-09-14', monto: 5000 },
    )
    expect(movimiento.interes).toBe(0)
  })

  it('el último pago tiene prioridad sobre el alta', () => {
    const { movimiento } = aplicarMovimiento(
      { ...sinFechas, fechaUltimoPago: '2026-09-07' },
      { tipo: 'pago', fecha: '2026-09-14', monto: 5000 },
    )
    // 7 dias, no 30
    expect(movimiento.interes).toBeLessThan(400)
    expect(movimiento.interes).toBeGreaterThan(0)
  })

  it('dos pagos seguidos devengan desde el pago anterior, no desde el alta', () => {
    const uno = aplicarMovimiento(sinFechas, { tipo: 'pago', fecha: '2026-09-14', monto: 5000 })
    const dos = aplicarMovimiento(uno.deuda, { tipo: 'pago', fecha: '2026-10-14', monto: 5000 })
    // El saldo bajo, asi que el segundo interes debe ser MENOR que el primero
    expect(dos.movimiento.interes!).toBeLessThan(uno.movimiento.interes!)
    expect(dos.movimiento.interes!).toBeGreaterThan(0)
  })
})

describe('anclaDevengo', () => {
  const base = { fechaUltimoPago: undefined, fechaInicio: undefined, fechaRegistro: undefined }

  it('prefiere el último pago', () => {
    expect(anclaDevengo({ ...base, fechaUltimoPago: '2026-09-01', fechaInicio: '2024-01-01', fechaRegistro: '2026-08-01' }, '2026-09-14'))
      .toBe('2026-09-01')
  })

  it('luego el inicio del préstamo', () => {
    expect(anclaDevengo({ ...base, fechaInicio: '2024-01-01', fechaRegistro: '2026-08-01' }, '2026-09-14'))
      .toBe('2024-01-01')
  })

  it('luego el alta en la app', () => {
    expect(anclaDevengo({ ...base, fechaRegistro: '2026-08-01' }, '2026-09-14')).toBe('2026-08-01')
  })

  it('sin nada, la propia fecha del movimiento', () => {
    expect(anclaDevengo(base, '2026-09-14')).toBe('2026-09-14')
  })

  it('la vista previa y el cobro real usan el MISMO ancla', () => {
    // Este test existe porque la UI calculaba el ancla por su cuenta y se
    // olvidaba de fechaRegistro: el preview decia 0 y al confirmar cobraba.
    const d: Deuda = {
      id: 'x', nombre: 'T', tipo: 'tarjeta', saldo: 50000, tasaAnual: 30,
      tipoTasa: 'variable', cuotaMensual: 5000, fechaRegistro: '2026-08-15',
    }
    const fecha = '2026-09-14'
    const previa = desglosarPago({
      saldo: d.saldo, tasaAnual: d.tasaAnual, monto: 5000,
      dias: diasEntre(anclaDevengo(d, fecha), fecha),
    })
    const real = aplicarMovimiento(d, { tipo: 'pago', fecha, monto: 5000 })
    expect(previa.interes).toBe(real.movimiento.interes)
    expect(previa.saldoDespues).toBe(real.movimiento.saldoDespues)
    expect(previa.interes).toBeGreaterThan(0)
  })
})
