const MS_DIA = 86_400_000

/** Ultimo dia que existe en ese mes (28..31). */
function diasDelMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate()
}

/**
 * Proxima fecha de pago a partir del dia del mes acordado.
 * Un dia 31 en un mes de 30 cae el 30: el banco no inventa un dia que no existe.
 */
export function proximoPago(diaPago?: number, hoy = new Date()): Date | null {
  if (!diaPago || diaPago < 1 || diaPago > 31) return null
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  const enMes = (anio: number, mes: number) =>
    new Date(anio, mes, Math.min(diaPago, diasDelMes(anio, mes)))

  const esteMes = enMes(base.getFullYear(), base.getMonth())
  if (esteMes >= base) return esteMes
  return enMes(base.getFullYear(), base.getMonth() + 1)
}

/** Dias entre hoy y una fecha. Negativo = ya pasó. */
export function diasHasta(fecha: Date, hoy = new Date()): number {
  const a = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const b = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((a.getTime() - b.getTime()) / MS_DIA)
}

/** "hoy" / "mañana" / "en 5 días" / "hace 3 días" */
export function textoVencimiento(dias: number): string {
  if (dias === 0) return 'vence hoy'
  if (dias === 1) return 'vence mañana'
  if (dias > 1) return `vence en ${dias} días`
  if (dias === -1) return 'venció ayer'
  return `venció hace ${Math.abs(dias)} días`
}

/** Meses completos transcurridos desde una fecha ISO. null si no hay fecha. */
export function mesesDesde(isoDate?: string, hoy = new Date()): number | null {
  if (!isoDate) return null
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m) return null
  let meses = (hoy.getFullYear() - y) * 12 + (hoy.getMonth() + 1 - m)
  if (d && hoy.getDate() < d) meses -= 1
  return Math.max(0, meses)
}
