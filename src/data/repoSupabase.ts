import type { Repo } from './repo'
import { ESTADO_INICIAL, type EstadoFinanciero, type Gasto, type Ingreso } from './tipos'
import type { Deuda, TipoDeuda, TipoTasa } from '@/engine/tipos'
import type { Frecuencia } from '@/engine/frecuencia'
import { deudaAFila, filasRecurrentes, mensajeDeError } from './filas'
import { supabase } from '@/lib/supabase'
import { repoLocal } from './repoLocal'

interface FilaDeuda {
  id: string
  nombre: string
  tipo: TipoDeuda
  saldo_actual: number
  monto_original: number | null
  tasa_anual: number
  tipo_tasa: TipoTasa
  cuota_mensual: number | null
  pago_minimo_pct: number | null
  pago_minimo_piso: number | null
  plazo_meses_total: number | null
  plazo_meses_restantes: number | null
  limite_credito: number | null
  prioridad_manual: number | null
  ultimos4: string | null
  dia_pago: number | null
  dia_corte: number | null
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  fecha_ultimo_pago: string | null
  fecha_registro: string | null
}

const COLUMNAS_DEUDA =
  'id,nombre,tipo,saldo_actual,monto_original,tasa_anual,tipo_tasa,cuota_mensual,' +
  'pago_minimo_pct,pago_minimo_piso,plazo_meses_total,plazo_meses_restantes,limite_credito,' +
  'prioridad_manual,ultimos4,dia_pago,dia_corte,fecha_inicio,fecha_fin_estimada,' +
  'fecha_ultimo_pago,fecha_registro'

const aDeuda = (f: FilaDeuda): Deuda => ({
  id: f.id,
  nombre: f.nombre,
  tipo: f.tipo,
  saldo: Number(f.saldo_actual) || 0,
  montoOriginal: f.monto_original ?? undefined,
  tasaAnual: Number(f.tasa_anual) || 0,
  tipoTasa: f.tipo_tasa === 'variable' ? 'variable' : 'fija',
  cuotaMensual: Number(f.cuota_mensual) || 0,
  pagoMinimoPct: f.pago_minimo_pct ?? undefined,
  pagoMinimoPiso: f.pago_minimo_piso ?? undefined,
  plazoMesesTotal: f.plazo_meses_total ?? undefined,
  mesesRestantes: f.plazo_meses_restantes ?? undefined,
  limiteCredito: f.limite_credito ?? undefined,
  prioridadManual: f.prioridad_manual ?? undefined,
  ultimos4: f.ultimos4 ?? undefined,
  diaPago: f.dia_pago ?? undefined,
  diaCorte: f.dia_corte ?? undefined,
  fechaInicio: f.fecha_inicio ?? undefined,
  fechaFin: f.fecha_fin_estimada ?? undefined,
  fechaUltimoPago: f.fecha_ultimo_pago ?? undefined,
  fechaRegistro: f.fecha_registro ?? undefined,
})

async function usuarioActual(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/**
 * Persistencia real. Si el usuario no ha iniciado sesion todavia, cae al repo
 * local en vez de perder lo que escribio: el modo invitado sigue siendo util.
 */
export const repoSupabase: Repo = {
  modo: 'supabase',

  async cargar() {
    const userId = await usuarioActual()
    if (!supabase || !userId) return repoLocal.cargar()

    const [perfil, deudas, recurrentes] = await Promise.all([
      supabase.from('perfiles').select('moneda').eq('id', userId).maybeSingle(),
      supabase.from('deudas').select(COLUMNAS_DEUDA).eq('user_id', userId).eq('estado', 'activa'),
      supabase
        .from('recurrentes')
        .select('id,nombre,monto_estimado,categoria,tipo,dia_del_mes,frecuencia')
        .eq('user_id', userId)
        .eq('activo', true),
    ])

    const fallo = [perfil.error, deudas.error, recurrentes.error].find(Boolean)
    if (fallo) {
      const local = await repoLocal.cargar()
      return { estado: local.estado, error: mensajeDeError(fallo) }
    }

    const filas = recurrentes.data ?? []
    const frec = (v: unknown): Frecuencia =>
      typeof v === 'string' && v ? (v as Frecuencia) : 'mensual'

    const ingresos: Ingreso[] = filas
      .filter((r) => r.tipo === 'ingreso')
      .map((r) => ({
        id: r.id,
        descripcion: r.nombre,
        tipo: (r.categoria as Ingreso['tipo']) ?? 'otro',
        monto: Number(r.monto_estimado) || 0,
        frecuencia: frec(r.frecuencia),
        diaCobro: r.dia_del_mes ?? undefined,
      }))

    const gastos: Gasto[] = filas
      .filter((r) => r.tipo === 'gasto')
      .map((r) => ({
        id: r.id,
        descripcion: r.nombre,
        categoria: (r.categoria as Gasto['categoria']) ?? 'otro',
        monto: Number(r.monto_estimado) || 0,
        frecuencia: frec(r.frecuencia),
        diaPago: r.dia_del_mes ?? undefined,
      }))

    // Los movimientos de deuda viven en la copia local: son el historial ya
    // confirmado y no queremos perderlos si una tabla remota falla.
    const local = await repoLocal.cargar()

    return {
      estado: {
        ...ESTADO_INICIAL,
        moneda: (perfil.data?.moneda as EstadoFinanciero['moneda']) ?? 'DOP',
        ingresos,
        gastos,
        deudas: (deudas.data ?? []).map((f) => aDeuda(f as unknown as FilaDeuda)),
        movimientos: local.estado?.movimientos ?? [],
        estrategia: local.estado?.estrategia ?? 'avalancha',
        notificaciones: local.estado?.notificaciones ?? false,
      },
    }
  },

  async guardar(estado) {
    const userId = await usuarioActual()
    // Siempre dejamos copia local: es el respaldo si el APK esta sin red.
    await repoLocal.guardar(estado)
    if (!supabase || !userId) return {}

    const errores: string[] = []
    const anotar = (r: { error: { message: string; code?: string } | null }) => {
      if (r.error) errores.push(mensajeDeError(r.error))
    }

    anotar(await supabase.from('perfiles').upsert({ id: userId, moneda: estado.moneda }))

    // --- Deudas ---
    // Se hace upsert por CLAVE PRIMARIA. Antes se usaba onConflict sobre
    // (user_id, nombre), que no tiene indice unico: Postgres responde
    // "no unique or exclusion constraint matching the ON CONFLICT
    // specification" y NADA se guardaba.
    const filasDeuda = estado.deudas.map((d) => deudaAFila(d, userId))
    if (filasDeuda.length > 0) {
      anotar(await supabase.from('deudas').upsert(filasDeuda))
    }

    // Las deudas quitadas en la app se marcan pagadas, no se destruyen: el
    // historial de pagos las referencia.
    const vivas = new Set(filasDeuda.map((f) => f.id))
    const { data: enBase } = await supabase
      .from('deudas')
      .select('id')
      .eq('user_id', userId)
      .eq('estado', 'activa')
    const aCerrar = (enBase ?? []).map((r) => r.id).filter((id) => !vivas.has(id))
    if (aCerrar.length > 0) {
      anotar(await supabase.from('deudas').update({ estado: 'pagada' }).in('id', aCerrar))
    }

    // --- Ingresos y gastos ---
    const filas = filasRecurrentes(estado, userId)
    if (filas.length > 0) {
      anotar(await supabase.from('recurrentes').upsert(filas))
    }

    const presentes = new Set(filas.map((f) => f.id))
    const { data: recEnBase } = await supabase
      .from('recurrentes')
      .select('id')
      .eq('user_id', userId)
      .eq('activo', true)
    const aBorrar = (recEnBase ?? []).map((r) => r.id).filter((id) => !presentes.has(id))
    if (aBorrar.length > 0) {
      anotar(await supabase.from('recurrentes').update({ activo: false }).in('id', aBorrar))
    }

    return errores.length > 0 ? { error: errores[0] } : {}
  },
}
