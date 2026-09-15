import { useMemo, useState } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, Pencil, RefreshCw, Scale, Trash2, TrendingDown, X,
} from 'lucide-react'
import { Icono, ICONO_POR_TIPO, ETIQUETA_TIPO } from './iconos'
import { formatMeses, formatMesAnio, formatMoney, type Moneda } from '@/lib/format'
import {
  anclaDevengo, derivarPlazo, desglosarPago, diasEntre, hoyISO, resumenInteres,
  type NuevoMovimiento,
} from '@/engine/movimientos'
import type { Deuda, MovimientoDeuda, TipoMovimiento } from '@/engine/tipos'

const CAMPO =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
const ETIQUETA = 'text-[11px] font-bold text-slate-600 block mb-1'

const ACCIONES: { tipo: TipoMovimiento; texto: string; Icono: typeof ArrowDownCircle; clase: string }[] = [
  { tipo: 'pago',       texto: 'Registrar pago',  Icono: ArrowDownCircle, clase: 'bg-emerald-600 text-white' },
  { tipo: 'consumo',    texto: 'Consumo',         Icono: ArrowUpCircle,   clase: 'bg-slate-100 text-slate-700' },
  { tipo: 'reenganche', texto: 'Reenganche',      Icono: RefreshCw,       clase: 'bg-slate-100 text-slate-700' },
  { tipo: 'ajuste',     texto: 'Cuadrar saldo',   Icono: Scale,           clase: 'bg-slate-100 text-slate-700' },
]

const TITULO: Record<TipoMovimiento, string> = {
  pago: 'Registrar un pago',
  consumo: 'Registrar un consumo',
  reenganche: 'Registrar un reenganche',
  ajuste: 'Cuadrar con el estado de cuenta',
}

const AYUDA: Record<TipoMovimiento, string> = {
  pago: 'Se reparte solo entre interés y capital según los días transcurridos.',
  consumo: 'Una compra nueva con la tarjeta. Sube el saldo y empieza a generar interés desde hoy.',
  reenganche: 'Refinanciaste: el saldo pasa a ser el monto nuevo y puedes cambiar tasa, cuota y plazo.',
  ajuste: 'Pon el saldo exacto que dice el banco. Su estado de cuenta manda sobre nuestra estimación.',
}

function FormMovimiento({
  deuda, moneda, tipo, onGuardar, onCancelar,
}: {
  deuda: Deuda
  moneda: Moneda
  tipo: TipoMovimiento
  onGuardar: (m: NuevoMovimiento) => void
  onCancelar: () => void
}) {
  const [fecha, setFecha] = useState(hoyISO())
  const [monto, setMonto] = useState(
    tipo === 'pago' ? String(deuda.cuotaMensual || '') : tipo === 'ajuste' ? String(deuda.saldo) : '',
  )
  const [nota, setNota] = useState('')
  const [nuevaTasa, setNuevaTasa] = useState(String(deuda.tasaAnual))
  const [nuevaCuota, setNuevaCuota] = useState(String(deuda.cuotaMensual || ''))
  const [nuevoPlazo, setNuevoPlazo] = useState('')

  // Vista previa del reparto, antes de confirmar.
  const previa = useMemo(() => {
    if (tipo !== 'pago') return null
    const m = parseFloat(monto) || 0
    if (m <= 0) return null
    return desglosarPago({
      saldo: deuda.saldo,
      tasaAnual: deuda.tasaAnual,
      monto: m,
      dias: diasEntre(anclaDevengo(deuda, fecha), fecha),
    })
  }, [tipo, monto, fecha, deuda])

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const m = parseFloat(monto) || 0
    if (m <= 0 && tipo !== 'ajuste') return
    onGuardar({
      tipo, fecha, monto: m, nota: nota.trim() || undefined,
      nuevaTasa: tipo === 'reenganche' ? parseFloat(nuevaTasa) || undefined : undefined,
      nuevaCuota: tipo === 'reenganche' ? parseFloat(nuevaCuota) || undefined : undefined,
      nuevoPlazoMeses: tipo === 'reenganche' ? parseInt(nuevoPlazo, 10) || undefined : undefined,
    })
  }

  return (
    <form onSubmit={enviar} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900">{TITULO[tipo]}</h4>
        <button type="button" onClick={onCancelar} aria-label="Cancelar" className="text-slate-400 p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{AYUDA[tipo]}</p>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={ETIQUETA} htmlFor="m-monto">
            {tipo === 'ajuste' ? 'Saldo real ($)' : tipo === 'reenganche' ? 'Monto nuevo ($)' : 'Monto ($)'}
          </label>
          <input id="m-monto" type="number" inputMode="decimal" required min="0" step="any"
            value={monto} onChange={(e) => setMonto(e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="m-fecha">Fecha</label>
          <input id="m-fecha" type="date" required value={fecha}
            onChange={(e) => setFecha(e.target.value)} className={CAMPO} />
        </div>
      </div>

      {tipo === 'reenganche' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={ETIQUETA} htmlFor="m-tasa">Tasa (%)</label>
            <input id="m-tasa" type="number" inputMode="decimal" step="0.1" value={nuevaTasa}
              onChange={(e) => setNuevaTasa(e.target.value)} className={CAMPO} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="m-cuota">Cuota ($)</label>
            <input id="m-cuota" type="number" inputMode="decimal" step="any" value={nuevaCuota}
              onChange={(e) => setNuevaCuota(e.target.value)} className={CAMPO} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="m-plazo">Meses</label>
            <input id="m-plazo" type="number" inputMode="numeric" min="1" max="600" value={nuevoPlazo}
              onChange={(e) => setNuevoPlazo(e.target.value)} placeholder="48" className={CAMPO} />
          </div>
        </div>
      )}

      {previa && (
        <div className={`rounded-xl px-3 py-2 border text-[11px] leading-relaxed ${
          previa.cubreInteres
            ? 'bg-white border-slate-200 text-slate-700'
            : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
          {previa.cubreInteres ? (
            <>
              De {formatMoney(parseFloat(monto) || 0, moneda)}, el banco se lleva{' '}
              <strong>{formatMoney(previa.interes, moneda)}</strong> de interés y solo{' '}
              <strong>{formatMoney(previa.capital, moneda)}</strong> baja tu deuda.
              <br />
              Quedarías en <strong>{formatMoney(previa.saldoDespues, moneda)}</strong>.
            </>
          ) : (
            <>
              <strong>Este pago no cubre el interés.</strong> Se acumularon{' '}
              {formatMoney(previa.interes, moneda)} y estás abonando{' '}
              {formatMoney(parseFloat(monto) || 0, moneda)}: tu deuda <strong>sube</strong> a{' '}
              {formatMoney(previa.saldoDespues, moneda)}.
            </>
          )}
        </div>
      )}

      <div>
        <label className={ETIQUETA} htmlFor="m-nota">Nota <span className="font-medium text-slate-400">opcional</span></label>
        <input id="m-nota" value={nota} onChange={(e) => setNota(e.target.value)}
          placeholder="Ej. supermercado, abono extra..." className={CAMPO} />
      </div>

      <button type="submit"
        className="w-full py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl active:scale-95 transition">
        Confirmar
      </button>
    </form>
  )
}

const ICONO_MOV: Record<TipoMovimiento, { Icono: typeof ArrowDownCircle; clase: string; etiqueta: string }> = {
  pago:       { Icono: ArrowDownCircle, clase: 'text-emerald-700 bg-emerald-50', etiqueta: 'Pago' },
  consumo:    { Icono: ArrowUpCircle,   clase: 'text-rose-700 bg-rose-50',       etiqueta: 'Consumo' },
  reenganche: { Icono: RefreshCw,       clase: 'text-amber-700 bg-amber-50',     etiqueta: 'Reenganche' },
  ajuste:     { Icono: Scale,           clase: 'text-slate-600 bg-slate-100',    etiqueta: 'Ajuste' },
}

export function DetalleDeuda({
  deuda, movimientos, moneda, onCerrar, onEditar, onEliminar, onMovimiento, onDeshacer,
}: {
  deuda: Deuda
  movimientos: MovimientoDeuda[]
  moneda: Moneda
  onCerrar: () => void
  onEditar: () => void
  onEliminar: () => void
  onMovimiento: (m: NuevoMovimiento) => void
  onDeshacer: (movimientoId: string) => void
}) {
  const [accion, setAccion] = useState<TipoMovimiento | null>(null)

  const historial = useMemo(
    () => movimientos.filter((m) => m.deudaId === deuda.id).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [movimientos, deuda.id],
  )
  const interes = useMemo(() => resumenInteres(deuda, movimientos), [deuda, movimientos])
  const plazo = useMemo(() => derivarPlazo(deuda), [deuda])

  const esRevolvente = deuda.tipo === 'tarjeta' || deuda.tipo === 'linea_credito'
  // En una tarjeta el saldo sube y baja con cada consumo: "llevas pagado X de Y"
  // no significa nada. Ahi lo que importa es cuanto del limite estas usando.
  const pagado =
    !esRevolvente && deuda.montoOriginal ? Math.max(0, deuda.montoOriginal - deuda.saldo) : null
  const pctPagado = pagado !== null ? (pagado / deuda.montoOriginal!) * 100 : null
  const usoLimite =
    esRevolvente && deuda.limiteCredito ? (deuda.saldo / deuda.limiteCredito) * 100 : null
  const acciones = ACCIONES.filter((a) => a.tipo !== 'consumo' || esRevolvente)

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md bg-slate-50 rounded-t-3xl max-h-[92vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="sticky top-0 bg-slate-50/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-slate-200 flex items-start justify-between gap-2 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Icono nombre={ICONO_POR_TIPO[deuda.tipo]} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 truncate">{deuda.nombre}</h3>
              <p className="text-[11px] text-slate-500">
                {ETIQUETA_TIPO[deuda.tipo]} · {deuda.tasaAnual}% {deuda.tipoTasa}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={onEditar} aria-label="Editar deuda"
              className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-slate-100">
              <Pencil className="w-4 h-4" />
            </button>
            <button type="button" onClick={onEliminar} aria-label="Eliminar deuda"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={onCerrar} aria-label="Cerrar"
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3 pb-8">
          {/* Saldo y progreso */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Saldo actual</span>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatMoney(deuda.saldo, moneda)}
            </p>
            {pctPagado !== null && (
              <>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, pctPagado))}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  Llevas pagado <strong className="text-emerald-700">{formatMoney(pagado!, moneda)}</strong> de{' '}
                  {formatMoney(deuda.montoOriginal!, moneda)} · {Math.round(pctPagado)}%
                </p>
              </>
            )}
            {usoLimite !== null && (
              <>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      usoLimite > 70 ? 'bg-rose-500' : usoLimite > 30 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, usoLimite)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Usas <strong>{Math.round(usoLimite)}%</strong> de tu límite de{' '}
                  {formatMoney(deuda.limiteCredito!, moneda)} · lo ideal es menos del 30%
                </p>
              </>
            )}
          </div>

          {/* CUÁNTO TE GANAN */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Lo que te ganan de interés
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-300 block">Ya les pagaste</span>
                <span className="text-base font-black text-white">{formatMoney(interes.pagado, moneda)}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-300 block">Te falta pagarles</span>
                <span className="text-base font-black text-amber-300">
                  {interes.insostenible ? '∞' : formatMoney(interes.proyectado, moneda)}
                </span>
              </div>
            </div>

            <div className="bg-black/25 rounded-xl p-2.5 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-slate-300">Corriendo este mes</span>
                <span className="text-sm font-black text-amber-300">{formatMoney(interes.esteMes, moneda)}</span>
              </div>
              {deuda.cuotaMensual > 0 && (
                <>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex">
                    <div className="bg-amber-400 h-full" style={{ width: `${interes.pctDeLaCuota}%` }} />
                    <div className="bg-emerald-400 h-full" style={{ width: `${100 - interes.pctDeLaCuota}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    De tu cuota de {formatMoney(deuda.cuotaMensual, moneda)},{' '}
                    <span className="text-amber-300 font-bold">{Math.round(interes.pctDeLaCuota)}%</span> se lo lleva
                    el banco y solo el resto baja tu deuda.
                  </p>
                </>
              )}
            </div>

            {interes.insostenible && (
              <p className="text-[11px] text-rose-200 bg-rose-500/20 border border-rose-400/30 rounded-xl px-3 py-2 leading-relaxed">
                Con esta cuota la deuda nunca se salda: el interés se come el abono. Súbela o renegocia la tasa.
              </p>
            )}
          </div>

          {/* Plazo */}
          {(plazo.fechaFin || plazo.plazoMesesTotal) && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Plazo</span>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                {plazo.fechaFin && (
                  <>
                    <span className="text-slate-500">Termina</span>
                    <span className="font-bold text-slate-900 text-right">{formatMesAnio(plazo.fechaFin)}</span>
                  </>
                )}
                {plazo.mesesRestantes !== undefined && (
                  <>
                    <span className="text-slate-500">Le faltan</span>
                    <span className="font-bold text-slate-900 text-right">{formatMeses(plazo.mesesRestantes)}</span>
                  </>
                )}
                {plazo.plazoMesesTotal !== undefined && plazo.cuotasPagadas !== undefined && (
                  <>
                    <span className="text-slate-500">Cuotas</span>
                    <span className="font-bold text-slate-900 text-right">
                      {plazo.cuotasPagadas} de {plazo.plazoMesesTotal}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Acciones */}
          {accion ? (
            <FormMovimiento deuda={deuda} moneda={moneda} tipo={accion}
              onCancelar={() => setAccion(null)}
              onGuardar={(m) => { onMovimiento(m); setAccion(null) }} />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {acciones.map(({ tipo, texto, Icono: Ic, clase }) => (
                <button key={tipo} type="button" onClick={() => setAccion(tipo)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition ${clase}`}>
                  <Ic className="w-4 h-4" />
                  {texto}
                </button>
              ))}
            </div>
          )}

          {/* Historial */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 px-1">
              Historial {historial.length > 0 && <span className="text-slate-400 font-medium">({historial.length})</span>}
            </h4>
            {historial.length === 0 ? (
              <p className="text-[11px] text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl px-3 py-4 text-center leading-relaxed">
                Todavía no hay movimientos. Cada pago que registres queda aquí con su desglose
                de interés y capital.
              </p>
            ) : (
              historial.map((m) => {
                const { Icono: Ic, clase, etiqueta } = ICONO_MOV[m.tipo]
                return (
                  <div key={m.id} className="bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200/80 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${clase}`}>
                      <Ic className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">{etiqueta}</span>
                        <span className="text-xs font-black text-slate-900">{formatMoney(m.monto, moneda)}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[10px] text-slate-400">{m.fecha}</span>
                        {m.tipo === 'pago' && m.interes !== undefined && (
                          <span className="text-[10px] text-slate-500">
                            interés {formatMoney(m.interes, moneda)} · capital{' '}
                            <span className={m.capital! < 0 ? 'text-rose-600 font-bold' : ''}>
                              {formatMoney(m.capital ?? 0, moneda)}
                            </span>
                          </span>
                        )}
                      </div>
                      {m.nota && <p className="text-[10px] text-slate-400 italic truncate">{m.nota}</p>}
                      <p className="text-[10px] text-slate-400">
                        saldo → {formatMoney(m.saldoDespues, moneda)}
                      </p>
                    </div>
                    <button type="button" onClick={() => onDeshacer(m.id)} aria-label="Deshacer movimiento"
                      className="text-slate-300 hover:text-rose-500 p-1 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
