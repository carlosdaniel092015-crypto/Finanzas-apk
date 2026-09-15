import type { Deuda, Estrategia, MovimientoDeuda } from '@/engine/tipos'
import type { Moneda } from '@/lib/format'

export type { Deuda, Estrategia, MovimientoDeuda }

/** Un renglon de gasto fijo del modulo de Flujo de Caja. */
export interface GastoFijo {
  id: string
  nombre: string
  /** clave del icono en components/iconos.ts */
  icono: string
  /** etiqueta corta de la esquina: "Fijo", "Servicio", "Cocina"... */
  etiqueta: string
  monto: number
  /** true = ocupa las dos columnas de la cuadricula */
  ancho: 'medio' | 'completo'
  /** subtitulo opcional, ej "Netflix, Spotify, Cloud" */
  nota?: string
  /** dia del mes en que vence, para los recordatorios */
  diaPago?: number
}

export interface EstadoFinanciero {
  moneda: Moneda
  ingresoMensual: number
  gastosFijos: GastoFijo[]
  deudas: Deuda[]
  /** Historial de hechos sobre las deudas: pagos, consumos, reenganches, ajustes */
  movimientos: MovimientoDeuda[]
  estrategia: Estrategia
}

export const GASTOS_POR_DEFECTO: GastoFijo[] = [
  { id: 'alquiler',     nombre: 'Alquiler / Hipoteca',        icono: 'home',       etiqueta: 'Fijo',       monto: 0, ancho: 'medio' },
  { id: 'electricidad', nombre: 'Electricidad / Luz',         icono: 'zap',        etiqueta: 'Servicio',   monto: 0, ancho: 'medio' },
  { id: 'agua',         nombre: 'CAASD (Agua potable)',       icono: 'droplets',   etiqueta: 'CAASD',      monto: 0, ancho: 'medio' },
  { id: 'gas',          nombre: 'Gas Doméstico',              icono: 'flame',      etiqueta: 'Cocina',     monto: 0, ancho: 'medio' },
  { id: 'combustible',  nombre: 'Vehículo / Combustible',     icono: 'fuel',       etiqueta: 'Transporte', monto: 0, ancho: 'medio' },
  { id: 'movil',        nombre: 'Planes Móviles',             icono: 'smartphone', etiqueta: 'Conexión',   monto: 0, ancho: 'medio' },
  { id: 'streaming',    nombre: 'Streaming & Suscripciones',  icono: 'tv',         etiqueta: 'Ocio',       monto: 0, ancho: 'completo', nota: 'Netflix, Spotify, Cloud' },
]

export const ESTADO_INICIAL: EstadoFinanciero = {
  moneda: 'DOP',
  ingresoMensual: 0,
  gastosFijos: GASTOS_POR_DEFECTO,
  deudas: [],
  movimientos: [],
  estrategia: 'avalancha',
}
