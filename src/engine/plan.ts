import type {
  Deuda,
  Estrategia,
  FilaCronograma,
  OpcionesPlan,
  ResultadoPlan,
  ResumenDeuda,
} from './tipos'

const HORIZONTE_DEFAULT = 600 // 50 anios
const CENTAVO = 0.005

/** Redondea a centavos para que los saldos no arrastren errores de punto flotante. */
const c = (n: number) => Math.round(n * 100) / 100

/**
 * Tasa mensual efectiva de una deuda, aplicando el escenario de subida
 * solamente a las deudas de tasa VARIABLE.
 */
export function tasaMensual(d: Deuda, ajusteVariable = 0): number {
  const anual = d.tipoTasa === 'variable' ? d.tasaAnual + ajusteVariable : d.tasaAnual
  return Math.max(0, anual) / 100 / 12
}

/**
 * Pago minimo exigible este mes.
 * - Tarjetas: max(% del saldo, piso), acotado al saldo.
 * - Prestamos: la cuota fija, acotada al saldo.
 * Nunca devuelve mas de lo que se debe.
 */
export function pagoMinimo(d: Deuda, saldo: number): number {
  if (saldo <= 0) return 0
  let minimo = 0
  if (d.pagoMinimoPct && d.pagoMinimoPct > 0) {
    minimo = Math.max(minimo, (saldo * d.pagoMinimoPct) / 100)
  }
  if (d.pagoMinimoPiso && d.pagoMinimoPiso > 0) {
    minimo = Math.max(minimo, d.pagoMinimoPiso)
  }
  if (d.cuotaMensual && d.cuotaMensual > 0) {
    minimo = Math.max(minimo, d.cuotaMensual)
  }
  // Sin ningun dato, exigimos al menos el interes del mes para no dejarla crecer.
  if (minimo === 0) minimo = saldo * tasaMensual(d)
  return c(Math.min(minimo, saldo))
}

/** Ordena las deudas segun la estrategia. El primero de la lista recibe el excedente. */
export function ordenarDeudas(
  deudas: Deuda[],
  estrategia: Estrategia,
  ajusteVariable = 0,
): Deuda[] {
  const activas = deudas.filter((d) => d.saldo > 0)
  const tasaDe = (d: Deuda) =>
    d.tipoTasa === 'variable' ? d.tasaAnual + ajusteVariable : d.tasaAnual

  switch (estrategia) {
    case 'avalancha':
      // Mayor tasa primero: minimiza el interes total pagado.
      return [...activas].sort((a, b) => tasaDe(b) - tasaDe(a) || a.saldo - b.saldo)

    case 'bola_nieve':
      // Menor saldo primero: victorias rapidas, mas sostenible psicologicamente.
      return [...activas].sort((a, b) => a.saldo - b.saldo || tasaDe(b) - tasaDe(a))

    case 'hibrida': {
      // 70% tasa + 30% "que tan pequena es". Normalizado 0..1 para poder sumarlos.
      const tasas = activas.map(tasaDe)
      const saldos = activas.map((d) => d.saldo)
      const norm = (v: number, arr: number[]) => {
        const min = Math.min(...arr)
        const max = Math.max(...arr)
        return max === min ? 1 : (v - min) / (max - min)
      }
      const score = (d: Deuda) =>
        0.7 * norm(tasaDe(d), tasas) + 0.3 * (1 - norm(d.saldo, saldos))
      return [...activas].sort((a, b) => score(b) - score(a))
    }

    case 'personalizada':
      return [...activas].sort(
        (a, b) =>
          (a.prioridadManual ?? Number.MAX_SAFE_INTEGER) -
          (b.prioridadManual ?? Number.MAX_SAFE_INTEGER),
      )
  }
}

function sumarMeses(base: Date, meses: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), 1)
  d.setMonth(d.getMonth() + meses)
  return d
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Simula la salida de deudas mes a mes.
 *
 * Modelo: el pago mensual TOTAL se mantiene constante (suma de minimos iniciales +
 * excedente). Cada mes se acreditan intereses, se cubren los minimos vigentes de todas
 * las deudas activas, y TODO lo que sobra va a la deuda objetivo. Cuando una deuda muere
 * su cuota no se "recupera": sigue dentro del presupuesto y acelera a la siguiente.
 * Ese es el efecto bola de nieve real.
 */
export function simularPlan(deudas: Deuda[], opciones: OpcionesPlan): ResultadoPlan {
  const {
    estrategia,
    excedenteMensual,
    ajusteTasaVariable = 0,
    maxMeses = HORIZONTE_DEFAULT,
    fechaInicio = new Date(),
    presupuestoFijo = true,
  } = opciones

  const activas = deudas.filter((d) => d.saldo > 0)
  const advertencias: string[] = []

  if (activas.length === 0) {
    return {
      estrategia,
      meses: 0,
      fechaLibre: iso(fechaInicio),
      interesTotal: 0,
      totalPagado: 0,
      pagoMensual: 0,
      orden: [],
      porDeuda: [],
      cronograma: [],
      insostenible: false,
      advertencias: [],
    }
  }

  const saldos = new Map<string, number>(activas.map((d) => [d.id, d.saldo]))
  const interesAcum = new Map<string, number>(activas.map((d) => [d.id, 0]))
  const pagadoAcum = new Map<string, number>(activas.map((d) => [d.id, 0]))
  const mesLiquidacion = new Map<string, number | null>(activas.map((d) => [d.id, null]))

  // Presupuesto mensual FIJO: los minimos de hoy + lo que libera el flujo de caja.
  const minimosIniciales = activas.reduce((s, d) => s + pagoMinimo(d, d.saldo), 0)
  const presupuestoConstante = c(minimosIniciales + Math.max(0, excedenteMensual))
  let primerPagoMensual = presupuestoConstante

  const cronograma: FilaCronograma[] = []
  let interesTotal = 0
  let totalPagado = 0
  let insostenible = false
  let mes = 0

  while (mes < maxMeses) {
    const vivas = activas.filter((d) => (saldos.get(d.id) ?? 0) > CENTAVO)
    if (vivas.length === 0) break
    mes++
    const fecha = iso(sumarMeses(fechaInicio, mes))

    // --- 1. Intereses del mes ---
    const interesDelMes = new Map<string, number>()
    for (const d of vivas) {
      const saldo = saldos.get(d.id)!
      const i = c(saldo * tasaMensual(d, ajusteTasaVariable))
      interesDelMes.set(d.id, i)
      saldos.set(d.id, c(saldo + i))
      interesAcum.set(d.id, c(interesAcum.get(d.id)! + i))
      interesTotal = c(interesTotal + i)
    }

    // --- 2. Prioridad: quien recibe el excedente este mes ---
    const orden = ordenarDeudas(
      vivas.map((d) => ({ ...d, saldo: saldos.get(d.id)! })),
      estrategia,
      ajusteTasaVariable,
    )
    const objetivoId = orden[0]?.id

    // --- 3. Minimos a todas, empezando por las que NO son el objetivo ---
    // Con presupuestoFijo (el plan) el aporte mensual no baja aunque bajen los
    // minimos: eso es lo que libera capacidad y acelera a la siguiente deuda.
    // Sin el (escenario "solo minimos") se paga exactamente lo exigible cada mes.
    const presupuestoMes = presupuestoFijo
      ? presupuestoConstante
      : c(
          vivas.reduce((s, d) => s + pagoMinimo(d, saldos.get(d.id)!), 0) +
            Math.max(0, excedenteMensual),
        )
    if (mes === 1) primerPagoMensual = presupuestoMes
    let disponible = presupuestoMes
    const pagoDelMes = new Map<string, number>(vivas.map((d) => [d.id, 0]))

    const cobrar = (d: Deuda, monto: number) => {
      const real = c(Math.min(monto, saldos.get(d.id)!, disponible))
      if (real <= 0) return
      saldos.set(d.id, c(saldos.get(d.id)! - real))
      pagoDelMes.set(d.id, c(pagoDelMes.get(d.id)! + real))
      pagadoAcum.set(d.id, c(pagadoAcum.get(d.id)! + real))
      disponible = c(disponible - real)
      totalPagado = c(totalPagado + real)
    }

    const noObjetivo = vivas.filter((d) => d.id !== objetivoId)
    for (const d of noObjetivo) cobrar(d, pagoMinimo(d, saldos.get(d.id)!))

    const objetivo = vivas.find((d) => d.id === objetivoId)
    if (objetivo) {
      cobrar(objetivo, pagoMinimo(objetivo, saldos.get(objetivo.id)!))
      // --- 4. TODO el remanente al objetivo ---
      if (disponible > CENTAVO) cobrar(objetivo, disponible)
    }

    // Si aun sobra (el objetivo quedo liquidado), cae en cascada al siguiente.
    let idx = 1
    while (disponible > CENTAVO && idx < orden.length) {
      const siguiente = vivas.find((d) => d.id === orden[idx].id)
      if (siguiente) cobrar(siguiente, disponible)
      idx++
    }

    // --- 5. Registrar y detectar liquidaciones ---
    for (const d of vivas) {
      const saldoFinal = saldos.get(d.id)!
      cronograma.push({
        mes,
        fecha,
        deudaId: d.id,
        pago: pagoDelMes.get(d.id)!,
        interes: interesDelMes.get(d.id) ?? 0,
        capital: c(pagoDelMes.get(d.id)! - (interesDelMes.get(d.id) ?? 0)),
        saldoFinal,
        esObjetivo: d.id === objetivoId,
      })
      if (saldoFinal <= CENTAVO && mesLiquidacion.get(d.id) === null) {
        mesLiquidacion.set(d.id, mes)
      }
    }

    // --- 6. Freno de seguridad: el presupuesto no cubre ni los intereses ---
    const interesMes = [...interesDelMes.values()].reduce((s, v) => s + v, 0)
    if (presupuestoMes <= interesMes + CENTAVO) {
      insostenible = true
      advertencias.push(
        'Tu pago mensual no alcanza a cubrir ni los intereses: con este presupuesto la deuda crece en vez de bajar.',
      )
      break
    }
  }

  const libre = [...saldos.values()].every((s) => s <= CENTAVO)
  const mesesFinal = libre ? mes : null

  if (!libre && !insostenible) {
    advertencias.push(
      `La deuda no se liquida dentro de ${maxMeses} meses con el aporte actual.`,
    )
  }

  const porDeuda: ResumenDeuda[] = activas.map((d) => {
    const m = mesLiquidacion.get(d.id) ?? null
    return {
      deudaId: d.id,
      nombre: d.nombre,
      mesLiquidacion: m,
      fechaLiquidacion: m ? iso(sumarMeses(fechaInicio, m)) : null,
      interesPagado: interesAcum.get(d.id) ?? 0,
      totalPagado: pagadoAcum.get(d.id) ?? 0,
    }
  })

  return {
    estrategia,
    meses: mesesFinal,
    fechaLibre: mesesFinal ? iso(sumarMeses(fechaInicio, mesesFinal)) : null,
    interesTotal,
    totalPagado,
    pagoMensual: primerPagoMensual,
    orden: ordenarDeudas(activas, estrategia, ajusteTasaVariable).map((d) => d.id),
    porDeuda,
    cronograma,
    insostenible,
    advertencias,
  }
}

/**
 * Escenario base: pagar unicamente los minimos, sin excedente y sin concentrar en nadie.
 * Es la referencia contra la cual se mide el interes ahorrado.
 */
export function simularSoloMinimos(
  deudas: Deuda[],
  opciones?: Partial<OpcionesPlan>,
): ResultadoPlan {
  return simularPlan(deudas, {
    estrategia: 'avalancha',
    excedenteMensual: 0,
    ajusteTasaVariable: opciones?.ajusteTasaVariable ?? 0,
    maxMeses: opciones?.maxMeses ?? HORIZONTE_DEFAULT,
    fechaInicio: opciones?.fechaInicio,
    presupuestoFijo: false,
  })
}

export interface ComparacionEstrategias {
  resultados: ResultadoPlan[]
  soloMinimos: ResultadoPlan
  /** Cuanto interes te ahorras con cada estrategia frente a pagar solo minimos */
  ahorroPorEstrategia: Record<string, number>
  recomendada: Estrategia
}

/** Corre avalancha, bola de nieve e hibrida y las devuelve comparables. */
export function compararEstrategias(
  deudas: Deuda[],
  opciones: Omit<OpcionesPlan, 'estrategia'>,
): ComparacionEstrategias {
  const estrategias: Estrategia[] = ['avalancha', 'bola_nieve', 'hibrida']
  const resultados = estrategias.map((estrategia) =>
    simularPlan(deudas, { ...opciones, estrategia }),
  )
  const soloMinimos = simularSoloMinimos(deudas, opciones)

  const ahorroPorEstrategia: Record<string, number> = {}
  for (const r of resultados) {
    ahorroPorEstrategia[r.estrategia] = c(soloMinimos.interesTotal - r.interesTotal)
  }

  // La avalancha es matematicamente optima en interes; se deja explicito igual
  // porque con tasas empatadas puede no serlo y queremos elegir por dato, no por fe.
  const recomendada = [...resultados].sort(
    (a, b) =>
      a.interesTotal - b.interesTotal ||
      (a.meses ?? Infinity) - (b.meses ?? Infinity),
  )[0].estrategia

  return { resultados, soloMinimos, ahorroPorEstrategia, recomendada }
}

/**
 * Escenarios de sensibilidad para deudas a tasa variable.
 * Si no hay ninguna variable, los tres escenarios son identicos y la UI lo oculta.
 */
export function escenariosTasaVariable(
  deudas: Deuda[],
  opciones: OpcionesPlan,
): { etiqueta: string; puntos: number; resultado: ResultadoPlan }[] {
  return [
    { etiqueta: 'Escenario base', puntos: 0 },
    { etiqueta: 'Si sube 2 puntos', puntos: 2 },
    { etiqueta: 'Si sube 4 puntos', puntos: 4 },
  ].map(({ etiqueta, puntos }) => ({
    etiqueta,
    puntos,
    resultado: simularPlan(deudas, { ...opciones, ajusteTasaVariable: puntos }),
  }))
}

export const hayTasaVariable = (deudas: Deuda[]) =>
  deudas.some((d) => d.tipoTasa === 'variable' && d.saldo > 0)
