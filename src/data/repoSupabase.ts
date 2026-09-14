import type { Repo } from './repo'
import { ESTADO_INICIAL, type EstadoFinanciero, type GastoFijo } from './tipos'
import type { Deuda, TipoDeuda, TipoTasa } from '@/engine/tipos'
import { supabase } from '@/lib/supabase'
import { repoLocal } from './repoLocal'

/** Filas tal como viven en Postgres (docs/ESQUEMA.sql). */
interface FilaDeuda {
  id: string
  nombre: string
  tipo: TipoDeuda
  saldo_actual: number
  tasa_anual: number
  tipo_tasa: TipoTasa
  cuota_mensual: number | null
  pago_minimo_pct: number | null
  pago_minimo_piso: number | null
  plazo_meses_restantes: number | null
  limite_credito: number | null
  prioridad_manual: number | null
  dia_pago: number | null
  dia_corte: number | null
  fecha_ultimo_pago: string | null
}

const aDeuda = (f: FilaDeuda): Deuda => ({
  id: f.id,
  nombre: f.nombre,
  tipo: f.tipo,
  saldo: Number(f.saldo_actual) || 0,
  tasaAnual: Number(f.tasa_anual) || 0,
  tipoTasa: f.tipo_tasa === 'variable' ? 'variable' : 'fija',
  cuotaMensual: Number(f.cuota_mensual) || 0,
  pagoMinimoPct: f.pago_minimo_pct ?? undefined,
  pagoMinimoPiso: f.pago_minimo_piso ?? undefined,
  mesesRestantes: f.plazo_meses_restantes ?? undefined,
  limiteCredito: f.limite_credito ?? undefined,
  prioridadManual: f.prioridad_manual ?? undefined,
  diaPago: f.dia_pago ?? undefined,
  diaCorte: f.dia_corte ?? undefined,
  fechaUltimoPago: f.fecha_ultimo_pago ?? undefined,
})

const aFila = (d: Deuda, userId: string) => ({
  id: d.id,
  user_id: userId,
  nombre: d.nombre,
  tipo: d.tipo,
  saldo_actual: d.saldo,
  tasa_anual: d.tasaAnual,
  tipo_tasa: d.tipoTasa,
  cuota_mensual: d.cuotaMensual || null,
  pago_minimo_pct: d.pagoMinimoPct ?? null,
  pago_minimo_piso: d.pagoMinimoPiso ?? null,
  plazo_meses_restantes: d.mesesRestantes ?? null,
  limite_credito: d.limiteCredito ?? null,
  prioridad_manual: d.prioridadManual ?? null,
  dia_pago: d.diaPago ?? null,
  dia_corte: d.diaCorte ?? null,
  fecha_ultimo_pago: d.fechaUltimoPago ?? null,
})

/** Traduce el error de una consulta a algo que el usuario pueda accionar. */
function perfiles_err(r: { error: { message: string; code?: string } | null }): string | null {
  if (!r.error) return null
  if (r.error.code === '42P01' || /does not exist|Could not find the table/i.test(r.error.message)) {
    return 'Las tablas no existen todavía: corre docs/ESQUEMA.sql en el SQL Editor de Supabase.'
  }
  return `No se pudo sincronizar: ${r.error.message}`
}

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
      supabase
        .from('deudas')
        .select(
          'id,nombre,tipo,saldo_actual,tasa_anual,tipo_tasa,cuota_mensual,pago_minimo_pct,pago_minimo_piso,plazo_meses_restantes,limite_credito,prioridad_manual,dia_pago,dia_corte,fecha_ultimo_pago',
        )
        .eq('user_id', userId)
        .eq('estado', 'activa'),
      supabase
        .from('recurrentes')
        .select('id,nombre,monto_estimado,servicio,tipo,dia_del_mes')
        .eq('user_id', userId)
        .eq('activo', true),
    ])

    // Si el esquema no esta aplicado, Postgres responde 42P01 y sin este aviso
    // la app se veria simplemente "vacia", que es el sintoma mas confuso posible.
    const fallo = [perfiles_err(perfil), perfiles_err(deudas), perfiles_err(recurrentes)].find(Boolean)
    if (fallo) {
      const local = await repoLocal.cargar()
      return { estado: local.estado, error: fallo }
    }

    const ingreso = (recurrentes.data ?? [])
      .filter((r) => r.tipo === 'ingreso')
      .reduce((s, r) => s + (Number(r.monto_estimado) || 0), 0)

    const gastos: GastoFijo[] = ESTADO_INICIAL.gastosFijos.map((base) => {
      const fila = (recurrentes.data ?? []).find(
        (r) => r.tipo === 'gasto' && r.nombre === base.nombre,
      )
      return fila
        ? { ...base, monto: Number(fila.monto_estimado) || 0, diaPago: fila.dia_del_mes ?? undefined }
        : base
    })

    return {
      estado: {
        ...ESTADO_INICIAL,
        moneda: (perfil.data?.moneda as EstadoFinanciero['moneda']) ?? 'DOP',
        ingresoMensual: ingreso,
        gastosFijos: gastos,
        deudas: (deudas.data ?? []).map((f) => aDeuda(f as FilaDeuda)),
      },
    }
  },

  async guardar(estado) {
    const userId = await usuarioActual()
    // Siempre dejamos copia local: es el respaldo si el APK esta sin red.
    await repoLocal.guardar(estado)
    if (!supabase || !userId) return {}
    const errores: string[] = []

    const anotar = (r: { error: { message: string } | null }) => {
      if (r.error) errores.push(r.error.message)
    }

    anotar(await supabase.from('perfiles').upsert({ id: userId, moneda: estado.moneda }))

    if (estado.deudas.length > 0) {
      anotar(await supabase.from('deudas').upsert(estado.deudas.map((d) => aFila(d, userId))))
    }

    // Las deudas borradas en la app se marcan pagadas, no se destruyen:
    // el historial de pagos las referencia.
    const vivas = estado.deudas.map((d) => d.id)
    let q = supabase.from('deudas').update({ estado: 'pagada' }).eq('user_id', userId)
    if (vivas.length > 0) q = q.not('id', 'in', `(${vivas.join(',')})`)
    anotar(await q.eq('estado', 'activa'))

    const filasRecurrentes = [
      ...estado.gastosFijos
        .filter((g) => g.monto > 0)
        .map((g) => ({
          user_id: userId,
          tipo: 'gasto' as const,
          nombre: g.nombre,
          monto_estimado: g.monto,
          dia_del_mes: g.diaPago ?? null,
          activo: true,
        })),
      ...(estado.ingresoMensual > 0
        ? [
            {
              user_id: userId,
              tipo: 'ingreso' as const,
              nombre: 'Ingresos mensuales',
              monto_estimado: estado.ingresoMensual,
              dia_del_mes: null,
              activo: true,
            },
          ]
        : []),
    ]
    if (filasRecurrentes.length > 0) {
      anotar(
        await supabase
          .from('recurrentes')
          .upsert(filasRecurrentes, { onConflict: 'user_id,nombre' }),
      )
    }

    return errores.length > 0 ? { error: errores[0] } : {}
  },
}
