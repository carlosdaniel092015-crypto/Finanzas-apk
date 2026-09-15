import { supabase } from '@/lib/supabase'
import type { TipoMovimiento } from '@/engine/tipos'

/** Un movimiento que la app leyó de un correo y espera confirmación. */
export interface MovimientoDetectado {
  id: string
  deudaId: string | null
  banco: string
  tipo: TipoMovimiento
  monto: number
  moneda: string
  fecha: string
  comercio?: string
  ultimos4?: string
  confianza: 'alta' | 'media' | 'baja'
  extracto?: string
}

export async function cargarDetectados(): Promise<MovimientoDetectado[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('movimientos_detectados')
    .select('id,deuda_id,banco,tipo,monto,moneda,fecha,comercio,ultimos4,confianza,extracto')
    .eq('estado', 'pendiente')
    .order('fecha', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data.map((f) => ({
    id: f.id,
    deudaId: f.deuda_id,
    banco: f.banco,
    tipo: f.tipo,
    monto: Number(f.monto) || 0,
    moneda: f.moneda ?? 'DOP',
    fecha: f.fecha,
    comercio: f.comercio ?? undefined,
    ultimos4: f.ultimos4 ?? undefined,
    confianza: (f.confianza ?? 'media') as MovimientoDetectado['confianza'],
    extracto: f.extracto ?? undefined,
  }))
}

export async function marcarDetectado(
  id: string,
  estado: 'confirmado' | 'descartado',
): Promise<void> {
  if (!supabase) return
  await supabase.from('movimientos_detectados').update({ estado }).eq('id', id)
}
