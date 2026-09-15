export type Frecuencia =
  | 'semanal'
  | 'quincenal'
  | 'mensual'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual'

/**
 * Veces que ocurre al mes. Un seguro de RD$3,000 al año NO son RD$3,000 de
 * carga mensual: son RD$250. Sin normalizar, un gasto anual grande haria
 * parecer que no queda nada este mes, y el plan de deudas saldria mal.
 *
 * Semanal usa 52/12 y no 4: hay meses de cinco semanas y a lo largo del año
 * la diferencia son casi cuatro semanas de gasto sin contabilizar.
 */
const VECES_AL_MES: Record<Frecuencia, number> = {
  semanal: 52 / 12,
  quincenal: 2,
  mensual: 1,
  bimestral: 1 / 2,
  trimestral: 1 / 3,
  semestral: 1 / 6,
  anual: 1 / 12,
}

export const ETIQUETA_FRECUENCIA: Record<Frecuencia, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  bimestral: 'Cada 2 meses',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

export const FRECUENCIAS = Object.keys(VECES_AL_MES) as Frecuencia[]

/** Equivalente mensual de un monto con cualquier periodicidad. */
export function aMensual(monto: number, frecuencia: Frecuencia = 'mensual'): number {
  if (!Number.isFinite(monto)) return 0
  return Math.round(monto * VECES_AL_MES[frecuencia] * 100) / 100
}

/** Suma el equivalente mensual de una lista. */
export function totalMensual(
  items: { monto: number; frecuencia?: Frecuencia }[],
): number {
  return Math.round(
    items.reduce((s, i) => s + aMensual(i.monto || 0, i.frecuencia ?? 'mensual'), 0) * 100,
  ) / 100
}
