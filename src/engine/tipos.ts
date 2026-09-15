export type TipoDeuda =
  | 'tarjeta'
  | 'prestamo_personal'
  | 'prestamo_vehiculo'
  | 'hipoteca'
  | 'linea_credito'
  | 'prestamo_informal'
  | 'otro'

export type TipoTasa = 'fija' | 'variable'

export type Estrategia = 'avalancha' | 'bola_nieve' | 'hibrida' | 'personalizada'

export interface Deuda {
  id: string
  nombre: string
  tipo: TipoDeuda
  /** Saldo pendiente hoy */
  saldo: number
  /** Tasa ANUAL en porcentaje, ej. 24.5 */
  tasaAnual: number
  tipoTasa: TipoTasa
  /** Cuota fija mensual (prestamos). En tarjetas puede ser 0 y usarse el minimo por %. */
  cuotaMensual: number
  /**
   * Tarjetas que cobran el minimo como % del saldo. Estas tarjetas NO son ese
   * caso: se paga una cuota fija (cuotaMensual). Se conserva para carteras que
   * si funcionen asi, pero el formulario no lo pide.
   */
  pagoMinimoPct?: number
  /** Tarjetas: piso absoluto del pago minimo */
  pagoMinimoPiso?: number
  /** Dia del mes en que se paga (1..31). Opcional: alimenta los recordatorios. */
  diaPago?: number
  /** Tarjetas: dia de corte del estado de cuenta (1..31). Opcional. */
  diaCorte?: number
  /** Fecha del ultimo pago registrado, ISO "AAAA-MM-DD". Opcional. */
  fechaUltimoPago?: string
  /** Monto con el que arranco la deuda, para medir cuanto llevas pagado */
  montoOriginal?: number
  /** Plazo: cuantas cuotas tiene el prestamo en total */
  plazoMesesTotal?: number
  /** Cuando empezo, ISO "AAAA-MM-DD" */
  fechaInicio?: string
  /**
   * Cuando se dio de alta en la app. Es el ancla del devengo cuando no hay
   * ninguna otra fecha: sin esto el interes entre pagos saldria siempre cero.
   */
  fechaRegistro?: string
  /** Cuando termina segun contrato, ISO "AAAA-MM-DD" */
  fechaFin?: string
  /** Solo informativo / para mostrar */
  mesesRestantes?: number
  limiteCredito?: number
  /** Orden para la estrategia personalizada (1 = primero) */
  prioridadManual?: number
}

export interface OpcionesPlan {
  estrategia: Estrategia
  /** Dinero libre mensual que se suma a los pagos minimos */
  excedenteMensual: number
  /** Escenario de subida para las deudas a tasa VARIABLE, en puntos porcentuales */
  ajusteTasaVariable?: number
  /** Corte de la simulacion. Default 600 meses (50 anios). */
  maxMeses?: number
  /** Mes 1 del plan. Default: hoy. */
  fechaInicio?: Date
  /**
   * true (default): el aporte mensual total se mantiene constante aunque los
   * minimos bajen — es la disciplina que produce el efecto bola de nieve.
   * false: se paga exactamente el minimo exigible cada mes, que es como se
   * comporta de verdad una tarjeta abandonada al pago minimo.
   */
  presupuestoFijo?: boolean
}

export interface FilaCronograma {
  mes: number
  fecha: string
  deudaId: string
  pago: number
  interes: number
  capital: number
  saldoFinal: number
  esObjetivo: boolean
}

export interface ResumenDeuda {
  deudaId: string
  nombre: string
  /** Mes (1-based) en que queda en cero. null si no se liquida dentro del horizonte. */
  mesLiquidacion: number | null
  fechaLiquidacion: string | null
  interesPagado: number
  totalPagado: number
}

export interface ResultadoPlan {
  estrategia: Estrategia
  /** Meses hasta quedar libre. null si no se logra dentro del horizonte. */
  meses: number | null
  fechaLibre: string | null
  interesTotal: number
  totalPagado: number
  /** Pago mensual total constante del plan (minimos + excedente) */
  pagoMensual: number
  orden: string[]
  porDeuda: ResumenDeuda[]
  cronograma: FilaCronograma[]
  /** true cuando el presupuesto no alcanza para cubrir ni siquiera los intereses */
  insostenible: boolean
  advertencias: string[]
}

export type TipoMovimiento = 'pago' | 'consumo' | 'reenganche' | 'ajuste'

/**
 * Un hecho real ocurrido sobre una deuda. El saldo de una deuda NO se edita a
 * mano: se mueve solo a traves de estos registros, para que siempre se pueda
 * responder "por que debo esto".
 */
export interface MovimientoDeuda {
  id: string
  deudaId: string
  tipo: TipoMovimiento
  /** ISO "AAAA-MM-DD" */
  fecha: string
  /** Siempre positivo. Lo que significa depende del tipo. */
  monto: number
  /** Solo en 'pago': cuanto se fue en intereses */
  interes?: number
  /** Solo en 'pago': cuanto bajo realmente la deuda */
  capital?: number
  /** Saldo que quedo despues de aplicarlo */
  saldoDespues: number
  nota?: string
}
