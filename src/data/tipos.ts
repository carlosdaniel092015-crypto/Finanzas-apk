import type { Deuda, Estrategia, MovimientoDeuda } from '@/engine/tipos'
import type { Frecuencia } from '@/engine/frecuencia'
import type { Moneda } from '@/lib/format'

export type { Deuda, Estrategia, MovimientoDeuda, Frecuencia }

export type TipoIngreso =
  | 'sueldo' | 'incentivo' | 'comision' | 'freelance'
  | 'alquiler' | 'negocio' | 'pension' | 'otro'

export const ETIQUETA_INGRESO: Record<TipoIngreso, string> = {
  sueldo: 'Sueldo',
  incentivo: 'Incentivo',
  comision: 'Comisión',
  freelance: 'Freelance / Extra',
  alquiler: 'Alquiler que cobro',
  negocio: 'Negocio propio',
  pension: 'Pensión',
  otro: 'Otro',
}

export const ICONO_INGRESO: Record<TipoIngreso, string> = {
  sueldo: 'banknote',
  incentivo: 'gift',
  comision: 'percent',
  freelance: 'briefcase',
  alquiler: 'home',
  negocio: 'store',
  pension: 'landmark',
  otro: 'circle-dollar',
}

/** Un ingreso que tú registras, con su concepto y su periodicidad. */
export interface Ingreso {
  id: string
  descripcion: string
  tipo: TipoIngreso
  monto: number
  frecuencia: Frecuencia
  /** Día del mes en que lo cobras. Opcional. */
  diaCobro?: number
}

export type CategoriaGasto =
  | 'vivienda' | 'servicios' | 'transporte' | 'alimentacion'
  | 'comunicacion' | 'ocio' | 'salud' | 'educacion' | 'seguros' | 'otro'

export const ETIQUETA_GASTO: Record<CategoriaGasto, string> = {
  vivienda: 'Vivienda',
  servicios: 'Servicios',
  transporte: 'Transporte',
  alimentacion: 'Alimentación',
  comunicacion: 'Comunicación',
  ocio: 'Ocio',
  salud: 'Salud',
  educacion: 'Educación',
  seguros: 'Seguros',
  otro: 'Otro',
}

export const ICONO_GASTO: Record<CategoriaGasto, string> = {
  vivienda: 'home',
  servicios: 'zap',
  transporte: 'fuel',
  alimentacion: 'shopping-bag',
  comunicacion: 'smartphone',
  ocio: 'tv',
  salud: 'heart-pulse',
  educacion: 'graduation-cap',
  seguros: 'shield',
  otro: 'receipt',
}

/** Un gasto que tú registras, con tu propia descripción. */
export interface Gasto {
  id: string
  descripcion: string
  categoria: CategoriaGasto
  monto: number
  frecuencia: Frecuencia
  /** Día del mes en que vence. Opcional, alimenta los recordatorios. */
  diaPago?: number
  nota?: string
}

export interface EstadoFinanciero {
  moneda: Moneda
  ingresos: Ingreso[]
  gastos: Gasto[]
  deudas: Deuda[]
  /** Historial de hechos sobre las deudas: pagos, consumos, reenganches, ajustes */
  movimientos: MovimientoDeuda[]
  estrategia: Estrategia
  notificaciones: boolean
}

/**
 * Sugerencias para arrancar rapido. NO se crean solas: se ofrecen como botones
 * y solo entra lo que la persona elija. Un gasto que no es tuyo ensucia el
 * calculo de cuanto te queda.
 */
export const GASTOS_SUGERIDOS: Omit<Gasto, 'id'>[] = [
  { descripcion: 'Alquiler',              categoria: 'vivienda',     monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Electricidad',          categoria: 'servicios',    monto: 0, frecuencia: 'mensual' },
  { descripcion: 'CAASD (agua)',          categoria: 'servicios',    monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Gas',                   categoria: 'servicios',    monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Combustible',           categoria: 'transporte',   monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Plan de teléfono',      categoria: 'comunicacion', monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Internet',              categoria: 'comunicacion', monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Streaming',             categoria: 'ocio',         monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Supermercado',          categoria: 'alimentacion', monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Seguro del vehículo',   categoria: 'seguros',      monto: 0, frecuencia: 'anual' },
  { descripcion: 'Marbete',               categoria: 'transporte',   monto: 0, frecuencia: 'anual' },
]

export const INGRESOS_SUGERIDOS: Omit<Ingreso, 'id'>[] = [
  { descripcion: 'Sueldo',     tipo: 'sueldo',    monto: 0, frecuencia: 'mensual' },
  { descripcion: 'Incentivo',  tipo: 'incentivo', monto: 0, frecuencia: 'trimestral' },
  { descripcion: 'Comisiones', tipo: 'comision',  monto: 0, frecuencia: 'mensual' },
]

export const ESTADO_INICIAL: EstadoFinanciero = {
  moneda: 'DOP',
  ingresos: [],
  gastos: [],
  deudas: [],
  movimientos: [],
  estrategia: 'avalancha',
  notificaciones: false,
}

/**
 * Trae un estado guardado por una version anterior al formato de hoy.
 * Antes el ingreso era UN numero y los gastos siete casillas fijas con nombre
 * de sistema; ahora ambos son listas que la persona escribe. Sin esto, quien
 * ya habia llenado sus datos los veria desaparecer al actualizar.
 */
export function migrarEstado(guardado: Record<string, unknown>): EstadoFinanciero {
  const base = { ...ESTADO_INICIAL, ...guardado } as EstadoFinanciero &
    Record<string, unknown>

  if (!Array.isArray(base.ingresos)) base.ingresos = []
  if (!Array.isArray(base.gastos)) base.gastos = []

  const ingresoViejo = Number(guardado.ingresoMensual) || 0
  if (base.ingresos.length === 0 && ingresoViejo > 0) {
    base.ingresos = [
      {
        // uuid obligatorio: la columna de Postgres lo es, y un id como
        // "migrado-ingreso" hace fallar el INSERT de TODA la sincronizacion.
        id: crypto.randomUUID(),
        descripcion: 'Sueldo',
        tipo: 'sueldo',
        monto: ingresoViejo,
        frecuencia: 'mensual',
      },
    ]
  }

  const gastosViejos = guardado.gastosFijos
  if (base.gastos.length === 0 && Array.isArray(gastosViejos)) {
    const CATEGORIA_POR_ICONO: Record<string, CategoriaGasto> = {
      home: 'vivienda', zap: 'servicios', droplets: 'servicios', flame: 'servicios',
      fuel: 'transporte', smartphone: 'comunicacion', tv: 'ocio',
    }
    base.gastos = (gastosViejos as Record<string, unknown>[])
      .filter((g) => (Number(g.monto) || 0) > 0)
      .map((g) => ({
        id: crypto.randomUUID(),
        descripcion: String(g.nombre ?? 'Gasto'),
        categoria: CATEGORIA_POR_ICONO[String(g.icono)] ?? 'otro',
        monto: Number(g.monto) || 0,
        frecuencia: 'mensual' as Frecuencia,
        diaPago: typeof g.diaPago === 'number' ? g.diaPago : undefined,
      }))
  }

  delete base.ingresoMensual
  delete base.gastosFijos
  return base as EstadoFinanciero
}
