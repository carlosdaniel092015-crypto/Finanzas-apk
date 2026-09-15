import type { EstadoFinanciero, Gasto, Ingreso } from './tipos'
import type { Deuda } from '@/engine/tipos'

/**
 * Traduccion entre el modelo de la app y las filas de Postgres.
 *
 * Vive aparte y sin dependencias de red para poder PROBARSE: escribir un valor
 * que la base rechaza (un enum que no existe, un id que no es uuid) hace que la
 * sincronizacion falle entera y en silencio, y el sintoma que ve la persona es
 * "guardado solo en este telefono" sin saber por que.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const esUuid = (v: string): boolean => UUID.test(v)

/**
 * Los ids de la app van a columnas `uuid`. Un id que no lo sea (por ejemplo los
 * que generaba la migracion del formato viejo) revienta el INSERT entero.
 */
export const idValido = (id: string): string => (esUuid(id) ? id : crypto.randomUUID())

export interface FilaRecurrente {
  id: string
  user_id: string
  tipo: 'ingreso' | 'gasto'
  nombre: string
  categoria: string
  monto_estimado: number
  frecuencia: string
  dia_del_mes: number | null
  activo: boolean
}

export const ingresoAFila = (i: Ingreso, userId: string): FilaRecurrente => ({
  id: idValido(i.id),
  user_id: userId,
  tipo: 'ingreso',
  nombre: i.descripcion,
  categoria: i.tipo,
  monto_estimado: i.monto,
  frecuencia: i.frecuencia,
  dia_del_mes: i.diaCobro ?? null,
  activo: true,
})

export const gastoAFila = (g: Gasto, userId: string): FilaRecurrente => ({
  id: idValido(g.id),
  user_id: userId,
  tipo: 'gasto',
  nombre: g.descripcion,
  categoria: g.categoria,
  monto_estimado: g.monto,
  frecuencia: g.frecuencia,
  dia_del_mes: g.diaPago ?? null,
  activo: true,
})

export const filasRecurrentes = (estado: EstadoFinanciero, userId: string): FilaRecurrente[] => [
  ...estado.ingresos.filter((i) => i.descripcion.trim()).map((i) => ingresoAFila(i, userId)),
  ...estado.gastos.filter((g) => g.descripcion.trim()).map((g) => gastoAFila(g, userId)),
]

export const deudaAFila = (d: Deuda, userId: string) => ({
  id: idValido(d.id),
  user_id: userId,
  nombre: d.nombre,
  tipo: d.tipo,
  saldo_actual: d.saldo,
  monto_original: d.montoOriginal ?? null,
  tasa_anual: d.tasaAnual,
  tipo_tasa: d.tipoTasa,
  cuota_mensual: d.cuotaMensual || null,
  pago_minimo_pct: d.pagoMinimoPct ?? null,
  pago_minimo_piso: d.pagoMinimoPiso ?? null,
  plazo_meses_total: d.plazoMesesTotal ?? null,
  plazo_meses_restantes: d.mesesRestantes ?? null,
  limite_credito: d.limiteCredito ?? null,
  prioridad_manual: d.prioridadManual ?? null,
  ultimos4: d.ultimos4 ?? null,
  dia_pago: d.diaPago ?? null,
  dia_corte: d.diaCorte ?? null,
  fecha_inicio: d.fechaInicio ?? null,
  fecha_fin_estimada: d.fechaFin ?? null,
  fecha_ultimo_pago: d.fechaUltimoPago ?? null,
  fecha_registro: d.fechaRegistro ?? null,
})

/** Valores que la base acepta en `frecuencia` (enum cerrado). */
export const FRECUENCIAS_VALIDAS = [
  'semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual',
] as const

/** Valores que la base acepta en `deudas.tipo` (enum cerrado). */
export const TIPOS_DEUDA_VALIDOS = [
  'tarjeta', 'prestamo_personal', 'prestamo_vehiculo', 'hipoteca',
  'linea_credito', 'prestamo_informal', 'otro',
] as const

/** Traduce el error de Postgres a algo que se pueda accionar. */
export function mensajeDeError(error: { message: string; code?: string }): string {
  const m = error.message
  if (error.code === '42P01' || /does not exist|Could not find the table/i.test(m)) {
    return 'Faltan tablas: corre docs/ESQUEMA.sql en el SQL Editor de Supabase.'
  }
  if (error.code === '42703' || /column .* does not exist|Could not find the '.*' column/i.test(m)) {
    return 'Falta una columna: corre las migraciones pendientes de docs/migraciones/ en orden.'
  }
  if (/ON CONFLICT specification/i.test(m)) {
    return 'Falta una migración: corre docs/migraciones/005 en el SQL Editor de Supabase.'
  }
  if (error.code === '22P02' || /invalid input (value|syntax) for/i.test(m)) {
    return 'Un valor no encaja con lo que espera la base. Corre las migraciones pendientes.'
  }
  if (error.code === '42501' || /row-level security|permission denied/i.test(m)) {
    return 'Sin permiso para escribir. Cierra sesión y vuelve a entrar.'
  }
  if (/fetch|network|Failed to fetch/i.test(m)) {
    return 'Sin conexión. Tus datos están guardados aquí y suben cuando vuelva la señal.'
  }
  return `No se pudo sincronizar: ${m}`
}
