import type { Deuda, MovimientoDeuda, TipoMovimiento } from './tipos'
import { simularPlan } from './plan'

const c = (n: number) => Math.round(n * 100) / 100
const MS_DIA = 86_400_000

const aFecha = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
const aISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const hoyISO = () => aISO(new Date())

export function diasEntre(desdeISO: string, hastaISO: string): number {
  return Math.max(0, Math.round((aFecha(hastaISO).getTime() - aFecha(desdeISO).getTime()) / MS_DIA))
}

export function mesesEntre(desdeISO: string, hastaISO: string): number {
  const a = aFecha(desdeISO)
  const b = aFecha(hastaISO)
  let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) meses -= 1
  return meses
}

export function sumarMesesISO(desdeISO: string, meses: number): string {
  const d = aFecha(desdeISO)
  const dia = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + meses)
  // Un 31 en un mes de 30 cae el 30, igual que hace el banco.
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return aISO(d)
}

/**
 * Interes devengado en un periodo, base actual/365 — que es como acumulan las
 * tarjetas dia a dia. La PROYECCION del plan usa capitalizacion mensual
 * (tasa/12); la diferencia entre ambas bases es de centavos y aqui preferimos
 * la que refleja lo que el banco cobra de verdad entre dos pagos reales.
 */
export function interesDevengado(saldo: number, tasaAnual: number, dias: number): number {
  if (saldo <= 0 || tasaAnual <= 0 || dias <= 0) return 0
  return c((saldo * (tasaAnual / 100) * dias) / 365)
}

export interface Desglose {
  interes: number
  capital: number
  saldoDespues: number
  /** false = el pago ni siquiera cubrio el interes: la deuda SUBIO */
  cubreInteres: boolean
}

/** Reparte un pago entre interes del periodo y capital. */
export function desglosarPago(params: {
  saldo: number
  tasaAnual: number
  monto: number
  dias: number
}): Desglose {
  const { saldo, tasaAnual, monto, dias } = params
  const interes = interesDevengado(saldo, tasaAnual, dias)
  const capital = c(monto - interes)
  return {
    interes,
    capital,
    saldoDespues: c(Math.max(0, saldo + interes - monto)),
    cubreInteres: capital > 0,
  }
}

/**
 * Desde cuando se devenga interes para un movimiento en esta fecha.
 * De la mas precisa a la menos: el ultimo pago, el inicio del prestamo, o el
 * alta en la app. Vive aqui y no duplicado en la UI porque la vista previa y
 * el cobro real TIENEN que dar el mismo numero: si divergen, la app miente
 * justo en el momento de confirmar.
 */
export function anclaDevengo(
  deuda: Pick<Deuda, 'fechaUltimoPago' | 'fechaInicio' | 'fechaRegistro'>,
  fechaMovimiento: string,
): string {
  return deuda.fechaUltimoPago ?? deuda.fechaInicio ?? deuda.fechaRegistro ?? fechaMovimiento
}

export interface NuevoMovimiento {
  tipo: TipoMovimiento
  fecha: string
  monto: number
  nota?: string
  /** Solo en 'reenganche': condiciones nuevas del prestamo */
  nuevaTasa?: number
  nuevoPlazoMeses?: number
  nuevaCuota?: number
}

/**
 * Aplica un hecho a una deuda y devuelve la deuda actualizada junto al registro.
 * Funcion PURA: no muta la deuda que recibe.
 */
export function aplicarMovimiento(
  deuda: Deuda,
  mov: NuevoMovimiento,
  id = crypto.randomUUID(),
): { deuda: Deuda; movimiento: MovimientoDeuda } {
  const dias = diasEntre(anclaDevengo(deuda, mov.fecha), mov.fecha)

  switch (mov.tipo) {
    case 'pago': {
      const d = desglosarPago({
        saldo: deuda.saldo,
        tasaAnual: deuda.tasaAnual,
        monto: mov.monto,
        dias,
      })
      return {
        deuda: { ...deuda, saldo: d.saldoDespues, fechaUltimoPago: mov.fecha },
        movimiento: {
          id,
          deudaId: deuda.id,
          tipo: 'pago',
          fecha: mov.fecha,
          monto: c(mov.monto),
          interes: d.interes,
          capital: d.capital,
          saldoDespues: d.saldoDespues,
          nota: mov.nota,
        },
      }
    }

    case 'consumo': {
      // El interes de lo consumido corre desde hoy: no se toca fechaUltimoPago.
      const saldoDespues = c(deuda.saldo + mov.monto)
      return {
        deuda: { ...deuda, saldo: saldoDespues },
        movimiento: {
          id, deudaId: deuda.id, tipo: 'consumo', fecha: mov.fecha,
          monto: c(mov.monto), saldoDespues, nota: mov.nota,
        },
      }
    }

    case 'reenganche': {
      // Refinanciar: el saldo pasa a ser el monto nuevo, y puede cambiar tasa,
      // plazo y cuota. El historial guarda que esto paso.
      const saldoDespues = c(mov.monto)
      const plazo = mov.nuevoPlazoMeses
      return {
        deuda: {
          ...deuda,
          saldo: saldoDespues,
          montoOriginal: saldoDespues,
          tasaAnual: mov.nuevaTasa ?? deuda.tasaAnual,
          cuotaMensual: mov.nuevaCuota ?? deuda.cuotaMensual,
          plazoMesesTotal: plazo ?? deuda.plazoMesesTotal,
          mesesRestantes: plazo ?? deuda.mesesRestantes,
          fechaInicio: mov.fecha,
          fechaFin: plazo ? sumarMesesISO(mov.fecha, plazo) : deuda.fechaFin,
          fechaUltimoPago: undefined,
        },
        movimiento: {
          id, deudaId: deuda.id, tipo: 'reenganche', fecha: mov.fecha,
          monto: saldoDespues, saldoDespues, nota: mov.nota,
        },
      }
    }

    case 'ajuste': {
      // Cuadrar contra el estado de cuenta del banco, que es la verdad.
      const saldoDespues = c(Math.max(0, mov.monto))
      return {
        deuda: { ...deuda, saldo: saldoDespues, fechaUltimoPago: mov.fecha },
        movimiento: {
          id, deudaId: deuda.id, tipo: 'ajuste', fecha: mov.fecha,
          monto: saldoDespues, saldoDespues, nota: mov.nota,
        },
      }
    }
  }
}

// ---------------------------------------------------------------- PLAZO ----

export interface Plazo {
  plazoMesesTotal?: number
  fechaFin?: string
  mesesRestantes?: number
  cuotasPagadas?: number
}

/**
 * Completa el plazo a partir de lo que el usuario sepa: si da la fecha de fin
 * se deducen los meses, y si da los meses se deduce la fecha. Nunca pide las
 * dos cosas.
 */
export function derivarPlazo(
  d: Pick<Deuda, 'fechaInicio' | 'fechaFin' | 'plazoMesesTotal'>,
  hoy = hoyISO(),
): Plazo {
  let { fechaFin, plazoMesesTotal } = d
  const { fechaInicio } = d

  if (!fechaFin && plazoMesesTotal && fechaInicio) {
    fechaFin = sumarMesesISO(fechaInicio, plazoMesesTotal)
  }
  if (!plazoMesesTotal && fechaFin && fechaInicio) {
    plazoMesesTotal = Math.max(0, mesesEntre(fechaInicio, fechaFin))
  }

  const mesesRestantes = fechaFin ? Math.max(0, mesesEntre(hoy, fechaFin)) : undefined
  const cuotasPagadas =
    plazoMesesTotal !== undefined && mesesRestantes !== undefined
      ? Math.max(0, plazoMesesTotal - mesesRestantes)
      : undefined

  return { plazoMesesTotal, fechaFin, mesesRestantes, cuotasPagadas }
}

// ------------------------------------------------------------- INTERES -----

export interface ResumenInteres {
  /** Interes que YA le pagaste, segun tus registros */
  pagado: number
  /** Interes que te falta pagar si sigues con la cuota actual */
  proyectado: number
  /** Lo que te va a costar en total esa deuda */
  total: number
  /** Lo que corre este mes, ahora mismo */
  esteMes: number
  /** Qué porcentaje de tu cuota se lo lleva el banco y no baja la deuda */
  pctDeLaCuota: number
  /** true si la deuda nunca se liquida con la cuota actual */
  insostenible: boolean
}

export function resumenInteres(deuda: Deuda, movimientos: MovimientoDeuda[]): ResumenInteres {
  const pagado = c(
    movimientos
      .filter((m) => m.deudaId === deuda.id && m.tipo === 'pago')
      .reduce((s, m) => s + (m.interes ?? 0), 0),
  )

  const proy = simularPlan([deuda], { estrategia: 'avalancha', excedenteMensual: 0 })
  const esteMes = c((deuda.saldo * deuda.tasaAnual) / 100 / 12)
  const cuota = deuda.cuotaMensual || 0

  return {
    pagado,
    proyectado: proy.interesTotal,
    total: c(pagado + proy.interesTotal),
    esteMes,
    pctDeLaCuota: cuota > 0 ? Math.min(100, c((esteMes / cuota) * 100)) : 0,
    insostenible: proy.insostenible || proy.meses === null,
  }
}

/** "Cuanto me ganan" sumando toda la cartera. */
export function interesDeLaCartera(deudas: Deuda[], movimientos: MovimientoDeuda[]) {
  const activas = deudas.filter((d) => d.saldo > 0)
  const porDeuda = activas.map((d) => ({ deuda: d, resumen: resumenInteres(d, movimientos) }))
  return {
    porDeuda,
    pagado: c(porDeuda.reduce((s, x) => s + x.resumen.pagado, 0)),
    proyectado: c(porDeuda.reduce((s, x) => s + x.resumen.proyectado, 0)),
    esteMes: c(porDeuda.reduce((s, x) => s + x.resumen.esteMes, 0)),
    cuotas: c(activas.reduce((s, d) => s + (d.cuotaMensual || 0), 0)),
  }
}

// ---------------------------------------------------------- PENDIENTES -----

export interface PagoPendiente {
  deuda: Deuda
  /** Fecha en que tocaba */
  fechaEsperada: string
  /** Negativo = ya venció */
  dias: number
  monto: number
}

/**
 * Deudas cuya cuota de este ciclo todavia no esta registrada.
 * Sin dia de pago se usa el mes calendario: si no hay pago este mes, esta
 * pendiente. Nunca damos un pago por hecho: eso lo confirma la persona.
 */
export function pagosPendientes(
  deudas: Deuda[],
  movimientos: MovimientoDeuda[],
  hoy = hoyISO(),
): PagoPendiente[] {
  const fechaHoy = aFecha(hoy)

  return deudas
    .filter((d) => d.saldo > 0 && (d.cuotaMensual || 0) > 0)
    .map((d) => {
      let fechaEsperada: string
      if (d.diaPago) {
        const ultimoDia = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth() + 1, 0).getDate()
        const esteMes = new Date(
          fechaHoy.getFullYear(),
          fechaHoy.getMonth(),
          Math.min(d.diaPago, ultimoDia),
        )
        // Si aun no llega el dia de este mes, el ciclo vigente es el del mes pasado.
        fechaEsperada = aISO(
          esteMes <= fechaHoy ? esteMes : aFecha(sumarMesesISO(aISO(esteMes), -1)),
        )
      } else {
        fechaEsperada = aISO(new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), 1))
      }

      const yaPagado = movimientos.some(
        (m) => m.deudaId === d.id && m.tipo === 'pago' && m.fecha >= fechaEsperada,
      )
      return yaPagado
        ? null
        : {
            deuda: d,
            fechaEsperada,
            dias: -diasEntre(fechaEsperada, hoy),
            monto: d.cuotaMensual,
          }
    })
    .filter((x): x is PagoPendiente => x !== null)
    .sort((a, b) => a.dias - b.dias)
}
