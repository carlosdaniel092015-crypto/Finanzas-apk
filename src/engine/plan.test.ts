import { describe, expect, it } from 'vitest'
import {
  compararEstrategias,
  ordenarDeudas,
  pagoMinimo,
  simularPlan,
  simularSoloMinimos,
  tasaMensual,
} from './plan'
import { analizar } from './alertas'
import type { Deuda } from './tipos'

const deuda = (p: Partial<Deuda> & Pick<Deuda, 'id' | 'saldo'>): Deuda => ({
  nombre: p.id,
  tipo: 'otro',
  tasaAnual: 0,
  tipoTasa: 'fija',
  cuotaMensual: 0,
  ...p,
})

describe('tasaMensual', () => {
  it('divide la anual entre 12', () => {
    expect(tasaMensual(deuda({ id: 'a', saldo: 100, tasaAnual: 12 }))).toBeCloseTo(0.01)
  })

  it('aplica el escenario de subida SOLO a las variables', () => {
    const fija = deuda({ id: 'f', saldo: 100, tasaAnual: 12, tipoTasa: 'fija' })
    const variable = deuda({ id: 'v', saldo: 100, tasaAnual: 12, tipoTasa: 'variable' })
    expect(tasaMensual(fija, 6)).toBeCloseTo(0.01)
    expect(tasaMensual(variable, 6)).toBeCloseTo(0.015)
  })
})

describe('pagoMinimo', () => {
  it('usa el porcentaje del saldo en tarjetas', () => {
    expect(pagoMinimo(deuda({ id: 't', saldo: 10000, pagoMinimoPct: 5 }), 10000)).toBe(500)
  })

  it('respeta el piso absoluto cuando el porcentaje queda por debajo', () => {
    const t = deuda({ id: 't', saldo: 1000, pagoMinimoPct: 2, pagoMinimoPiso: 300 })
    expect(pagoMinimo(t, 1000)).toBe(300)
  })

  it('nunca exige mas que el saldo', () => {
    const t = deuda({ id: 't', saldo: 50, cuotaMensual: 500 })
    expect(pagoMinimo(t, 50)).toBe(50)
  })
})

describe('ordenarDeudas', () => {
  const cartera = [
    deuda({ id: 'grande_barata', saldo: 20000, tasaAnual: 9 }),
    deuda({ id: 'chica_cara', saldo: 1000, tasaAnual: 35 }),
    deuda({ id: 'media', saldo: 5000, tasaAnual: 18 }),
  ]

  it('avalancha ataca la tasa mas alta', () => {
    expect(ordenarDeudas(cartera, 'avalancha')[0].id).toBe('chica_cara')
  })

  it('bola de nieve ataca el saldo mas chico', () => {
    expect(ordenarDeudas(cartera, 'bola_nieve')[0].id).toBe('chica_cara')
  })

  it('bola de nieve prefiere el saldo chico aunque la tasa sea baja', () => {
    const c = [
      deuda({ id: 'chiquita_barata', saldo: 300, tasaAnual: 0 }),
      deuda({ id: 'cara', saldo: 9000, tasaAnual: 40 }),
    ]
    expect(ordenarDeudas(c, 'bola_nieve')[0].id).toBe('chiquita_barata')
    expect(ordenarDeudas(c, 'avalancha')[0].id).toBe('cara')
  })

  it('personalizada respeta la prioridad manual', () => {
    const c = [
      deuda({ id: 'b', saldo: 100, tasaAnual: 50, prioridadManual: 2 }),
      deuda({ id: 'a', saldo: 9000, tasaAnual: 1, prioridadManual: 1 }),
    ]
    expect(ordenarDeudas(c, 'personalizada').map((d) => d.id)).toEqual(['a', 'b'])
  })
})

describe('simularPlan', () => {
  it('un prestamo sin interes se paga saldo / cuota', () => {
    const r = simularPlan([deuda({ id: 'p', saldo: 1200, cuotaMensual: 100 })], {
      estrategia: 'avalancha',
      excedenteMensual: 0,
    })
    expect(r.meses).toBe(12)
    expect(r.interesTotal).toBe(0)
    expect(r.totalPagado).toBe(1200)
  })

  it('cobra interes: con 12% anual se paga mas que el capital', () => {
    const r = simularPlan([deuda({ id: 'p', saldo: 1200, cuotaMensual: 100, tasaAnual: 12 })], {
      estrategia: 'avalancha',
      excedenteMensual: 0,
    })
    expect(r.interesTotal).toBeGreaterThan(0)
    expect(r.meses).toBeGreaterThan(12)
    expect(r.totalPagado).toBeCloseTo(1200 + r.interesTotal, 0)
  })

  it('el excedente acorta el plazo y reduce el interes', () => {
    const cartera = [deuda({ id: 'p', saldo: 10000, cuotaMensual: 300, tasaAnual: 24 })]
    const base = simularPlan(cartera, { estrategia: 'avalancha', excedenteMensual: 0 })
    const rapido = simularPlan(cartera, { estrategia: 'avalancha', excedenteMensual: 500 })
    expect(rapido.meses!).toBeLessThan(base.meses!)
    expect(rapido.interesTotal).toBeLessThan(base.interesTotal)
  })

  it('la cuota liberada acelera a la siguiente deuda (bola de nieve real)', () => {
    const cartera = [
      deuda({ id: 'chica', saldo: 1000, cuotaMensual: 200, tasaAnual: 30 }),
      deuda({ id: 'grande', saldo: 8000, cuotaMensual: 300, tasaAnual: 30 }),
    ]
    const r = simularPlan(cartera, { estrategia: 'bola_nieve', excedenteMensual: 0 })
    const chica = r.porDeuda.find((d) => d.deudaId === 'chica')!
    const grande = r.porDeuda.find((d) => d.deudaId === 'grande')!
    expect(chica.mesLiquidacion).not.toBeNull()
    expect(grande.mesLiquidacion).not.toBeNull()
    // Despues de matar la chica, la grande recibe los 200 liberados:
    // debe terminar antes que si solo hubiera tenido su propia cuota.
    const grandeSola = simularPlan([cartera[1]], {
      estrategia: 'avalancha',
      excedenteMensual: 0,
    })
    expect(grande.mesLiquidacion!).toBeLessThan(grandeSola.meses!)
  })

  it('avalancha nunca paga mas interes que bola de nieve', () => {
    const cartera = [
      deuda({ id: 'cara_grande', saldo: 9000, cuotaMensual: 250, tasaAnual: 34.9 }),
      deuda({ id: 'barata_chica', saldo: 1200, cuotaMensual: 120, tasaAnual: 6 }),
    ]
    const opts = { excedenteMensual: 400 }
    const av = simularPlan(cartera, { ...opts, estrategia: 'avalancha' })
    const bn = simularPlan(cartera, { ...opts, estrategia: 'bola_nieve' })
    expect(av.interesTotal).toBeLessThanOrEqual(bn.interesTotal)
  })

  it('marca insostenible cuando el pago no cubre ni los intereses', () => {
    // 100k al 60% anual = 5000/mes de interes, pagando 100.
    const r = simularPlan(
      [deuda({ id: 'x', saldo: 100000, cuotaMensual: 100, tasaAnual: 60 })],
      { estrategia: 'avalancha', excedenteMensual: 0 },
    )
    expect(r.insostenible).toBe(true)
    expect(r.meses).toBeNull()
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('una cartera vacia devuelve cero meses sin romperse', () => {
    const r = simularPlan([], { estrategia: 'avalancha', excedenteMensual: 100 })
    expect(r.meses).toBe(0)
    expect(r.cronograma).toHaveLength(0)
  })

  it('el cronograma cuadra: capital + interes = movimiento del saldo', () => {
    const cartera = [deuda({ id: 'p', saldo: 5000, cuotaMensual: 300, tasaAnual: 18 })]
    const r = simularPlan(cartera, { estrategia: 'avalancha', excedenteMensual: 100 })
    const capitalTotal = r.cronograma.reduce((s, f) => s + f.capital, 0)
    expect(capitalTotal).toBeCloseTo(5000, 0)
    expect(r.cronograma.at(-1)!.saldoFinal).toBeLessThanOrEqual(0.01)
  })

  it('el escenario de subida atrasa la fecha solo si hay tasa variable', () => {
    const fija = [deuda({ id: 'f', saldo: 5000, cuotaMensual: 200, tasaAnual: 20, tipoTasa: 'fija' })]
    const varia = [deuda({ id: 'v', saldo: 5000, cuotaMensual: 200, tasaAnual: 20, tipoTasa: 'variable' })]
    const opts = { estrategia: 'avalancha' as const, excedenteMensual: 0 }
    expect(simularPlan(fija, { ...opts, ajusteTasaVariable: 4 }).meses).toBe(
      simularPlan(fija, opts).meses,
    )
    expect(simularPlan(varia, { ...opts, ajusteTasaVariable: 4 }).meses!).toBeGreaterThanOrEqual(
      simularPlan(varia, opts).meses!,
    )
  })
})

describe('compararEstrategias', () => {
  const cartera = [
    deuda({ id: 'visa', saldo: 4200, tasaAnual: 24.5, pagoMinimoPct: 5, tipoTasa: 'variable' }),
    deuda({ id: 'personal', saldo: 9650, cuotaMensual: 480, tasaAnual: 14.8 }),
    deuda({ id: 'auto', saldo: 7800, cuotaMensual: 250, tasaAnual: 9.2 }),
  ]

  it('devuelve las tres estrategias y una recomendada', () => {
    const c = compararEstrategias(cartera, { excedenteMensual: 800 })
    expect(c.resultados).toHaveLength(3)
    expect(['avalancha', 'bola_nieve', 'hibrida']).toContain(c.recomendada)
  })

  it('el ahorro contra solo-minimos es positivo cuando hay excedente', () => {
    const c = compararEstrategias(cartera, { excedenteMensual: 800 })
    expect(c.ahorroPorEstrategia['avalancha']).toBeGreaterThan(0)
    expect(c.soloMinimos.interesTotal).toBeGreaterThan(
      c.resultados.find((r) => r.estrategia === 'avalancha')!.interesTotal,
    )
  })

  it('sin excedente, el plan iguala al escenario de solo minimos en interes o mejora', () => {
    const c = compararEstrategias(cartera, { excedenteMensual: 0 })
    expect(c.ahorroPorEstrategia['avalancha']).toBeGreaterThanOrEqual(0)
  })
})

describe('simularSoloMinimos', () => {
  it('una tarjeta al minimo por porcentaje tarda anios', () => {
    const r = simularSoloMinimos([
      deuda({ id: 't', saldo: 92400, tasaAnual: 34.9, pagoMinimoPct: 5, pagoMinimoPiso: 500 }),
    ])
    expect(r.meses).toBeGreaterThan(60)
    expect(r.interesTotal).toBeGreaterThan(0)
  })
})

describe('tarjeta con CUOTA FIJA (el caso de esta cartera)', () => {
  const tarjeta = (cuotaMensual: number): Deuda =>
    deuda({
      id: 't',
      nombre: 'Tarjeta',
      tipo: 'tarjeta',
      saldo: 50000,
      tasaAnual: 30,
      tipoTasa: 'variable',
      cuotaMensual,
    })

  it('el pago exigible es la cuota fija, no un porcentaje del saldo', () => {
    expect(pagoMinimo(tarjeta(5000), 50000)).toBe(5000)
  })

  it('una cuota por debajo del interés mensual no paga nunca', () => {
    // 30% anual sobre 50.000 = 1.250/mes de interés
    expect(simularPlan([tarjeta(1250)], { estrategia: 'avalancha', excedenteMensual: 0 })
      .insostenible).toBe(true)
    expect(simularPlan([tarjeta(1000)], { estrategia: 'avalancha', excedenteMensual: 0 })
      .meses).toBeNull()
  })

  it('apenas por encima del interés, se paga pero sale carísimo', () => {
    const r = simularPlan([tarjeta(1300)], { estrategia: 'avalancha', excedenteMensual: 0 })
    expect(r.insostenible).toBe(false)
    expect(r.meses).toBeGreaterThan(120)
    // Paga más de dos veces el saldo en intereses: eso es lo que hay que avisar.
    expect(r.interesTotal).toBeGreaterThan(50000 * 2)
  })

  it('el interés corre desde el primer mes: no hay período de gracia', () => {
    const r = simularPlan([tarjeta(5000)], { estrategia: 'avalancha', excedenteMensual: 0 })
    expect(r.cronograma[0].interes).toBeCloseTo(1250, 0)
  })

  it('sin límite de crédito no se inventa utilización', () => {
    const a = analizar({ ingresoMensual: 95000, gastosFijos: 40000, deudas: [tarjeta(5000)] })
    expect(a.some((x) => /limite/.test(x.titulo))).toBe(false)
  })
})

describe('analizar', () => {
  it('detecta la deuda que nunca baja', () => {
    const a = analizar({
      ingresoMensual: 3800,
      gastosFijos: 1920,
      deudas: [deuda({ id: 'x', nombre: 'Tarjeta', saldo: 100000, cuotaMensual: 100, tasaAnual: 60 })],
    })
    expect(a.some((x) => x.nivel === 'critico' && /nunca/.test(x.titulo))).toBe(true)
  })

  it('detecta utilizacion alta de tarjeta', () => {
    const a = analizar({
      ingresoMensual: 3800,
      gastosFijos: 1000,
      deudas: [
        deuda({ id: 't', nombre: 'Visa', saldo: 9000, limiteCredito: 10000, pagoMinimoPct: 5, tasaAnual: 24 }),
      ],
    })
    expect(a.some((x) => /limite/.test(x.titulo))).toBe(true)
  })

  it('detecta cuotas por encima del 40% del ingreso', () => {
    const a = analizar({
      ingresoMensual: 1000,
      gastosFijos: 200,
      deudas: [deuda({ id: 'p', nombre: 'Prestamo', saldo: 10000, cuotaMensual: 500, tasaAnual: 10 })],
    })
    expect(a.some((x) => x.nivel === 'critico' && /ingresos/.test(x.titulo))).toBe(true)
  })

  it('avisa cuando hay meses sin pago registrado', () => {
    const hace4Meses = new Date()
    hace4Meses.setMonth(hace4Meses.getMonth() - 4)
    const a = analizar({
      ingresoMensual: 95000,
      gastosFijos: 40000,
      deudas: [
        deuda({
          id: 'x',
          nombre: 'Tarjeta',
          saldo: 50000,
          cuotaMensual: 5000,
          tasaAnual: 30,
          fechaUltimoPago: hace4Meses.toISOString().slice(0, 10),
        }),
      ],
    })
    expect(a.some((x) => /sin pago registrado/.test(x.titulo))).toBe(true)
  })

  it('no avisa de meses sin pago si no hay fecha registrada', () => {
    const a = analizar({
      ingresoMensual: 95000,
      gastosFijos: 40000,
      deudas: [deuda({ id: 'x', nombre: 'T', saldo: 50000, cuotaMensual: 5000, tasaAnual: 30 })],
    })
    expect(a.some((x) => /sin pago registrado/.test(x.titulo))).toBe(false)
  })

  it('no inventa alertas sin deudas', () => {
    expect(analizar({ ingresoMensual: 3800, gastosFijos: 1920, deudas: [] })).toHaveLength(0)
  })
})
