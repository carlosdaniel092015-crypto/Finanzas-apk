export type Moneda = 'DOP' | 'USD'

const LOCALES: Record<Moneda, string> = { DOP: 'es-DO', USD: 'en-US' }

export function formatMoney(monto: number, moneda: Moneda = 'DOP'): string {
  return new Intl.NumberFormat(LOCALES[moneda], {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(monto) ? monto : 0)
}

/**
 * "3 años y 2 meses" / "11 meses".
 * null significa que la simulacion llego al horizonte (50 años) sin liquidar:
 * eso es un dato, no un vacio, asi que se dice con palabras.
 */
export function formatMeses(meses: number | null): string {
  if (meses === null) return 'más de 50 años'
  if (meses <= 0) return 'ya estás libre'
  if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`
  const a = Math.floor(meses / 12)
  const m = meses % 12
  const anios = `${a} ${a === 1 ? 'año' : 'años'}`
  return m === 0 ? anios : `${anios} y ${m} ${m === 1 ? 'mes' : 'meses'}`
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "2026-03-01" -> "Mar 2028" */
export function formatMesAnio(isoDate: string | null): string {
  if (!isoDate) return '—'
  const [y, m] = isoDate.split('-').map(Number)
  const nombre = MESES_CORTOS[(m ?? 1) - 1] ?? ''
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`
}

export const pct = (n: number, decimales = 0) =>
  `${(Number.isFinite(n) ? n : 0).toFixed(decimales)}%`
