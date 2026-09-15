import { useMemo, useState } from 'react'
import { ArrowRight, CalendarCheck, Layers, PlusCircle, Sparkles, Target, TrendingDown } from 'lucide-react'
import { FormDeuda } from '@/components/FormDeuda'
import { DetalleDeuda } from '@/components/DetalleDeuda'
import { TarjetaDeuda } from '@/components/TarjetaDeuda'
import { ResultadoPlan } from '@/components/ResultadoPlan'
import { compararEstrategias, ordenarDeudas, pagoMinimo } from '@/engine/plan'
import { hoyISO, interesDeLaCartera, pagosPendientes } from '@/engine/movimientos'
import { analizar } from '@/engine/alertas'
import { formatMoney } from '@/lib/format'
import { textoVencimiento } from '@/lib/fechas'
import { useFlujoCaja, useStore, useUI } from '@/store'
import type { Deuda } from '@/engine/tipos'

export function Deudas() {
  const {
    moneda, deudas, movimientos, estrategia,
    agregarDeuda, editarDeuda, eliminarDeuda, setEstrategia,
    registrarMovimiento, deshacerMovimiento,
  } = useStore()
  const { disponible, ingreso, totalGastos } = useFlujoCaja()
  const mostrarForm = useUI((s) => s.formAbierto)
  const setMostrarForm = useUI((s) => s.setFormAbierto)

  const [editando, setEditando] = useState<Deuda | null>(null)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [planVisible, setPlanVisible] = useState(false)

  const detalle = deudas.find((d) => d.id === detalleId) ?? null

  const totalDeuda = deudas.reduce((s, d) => s + d.saldo, 0)
  const totalCuotas = deudas.reduce((s, d) => s + (d.cuotaMensual || pagoMinimo(d, d.saldo)), 0)

  const objetivoId = useMemo(() => ordenarDeudas(deudas, estrategia)[0]?.id, [deudas, estrategia])

  const pendientes = useMemo(
    () => pagosPendientes(deudas, movimientos, hoyISO()),
    [deudas, movimientos],
  )

  const interes = useMemo(() => interesDeLaCartera(deudas, movimientos), [deudas, movimientos])

  const comparacion = useMemo(
    () => (deudas.length > 0 ? compararEstrategias(deudas, { excedenteMensual: disponible }) : null),
    [deudas, disponible],
  )
  const elegido = comparacion?.resultados.find((r) => r.estrategia === estrategia) ?? null

  const alertas = useMemo(
    () => analizar({ ingresoMensual: ingreso, gastosFijos: totalGastos, deudas }),
    [ingreso, totalGastos, deudas],
  )

  function cerrarForm() {
    setMostrarForm(false)
    setEditando(null)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Estrategia Cero Deudas</h2>
          <p className="text-xs text-slate-500 font-medium">Amortización acelerada y plan de escape</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditando(null); setMostrarForm(!mostrarForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 active:scale-95 transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Agregar</span>
        </button>
      </div>

      {mostrarForm && (
        <FormDeuda
          moneda={moneda}
          inicial={editando ?? undefined}
          onCerrar={cerrarForm}
          onGuardar={(d) => {
            if (editando) editarDeuda(editando.id, d)
            else agregarDeuda(d)
            cerrarForm()
          }}
        />
      )}

      {/* Pagos del ciclo que aún no están registrados. Un toque para confirmar. */}
      {!mostrarForm && pendientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-bold text-amber-900">
              {pendientes.length === 1 ? 'Un pago sin registrar' : `${pendientes.length} pagos sin registrar`}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pendientes.map((p) => (
              <div key={p.deuda.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{p.deuda.nombre}</p>
                  <p className="text-[10px] text-slate-500">
                    {formatMoney(p.monto, moneda)} · {textoVencimiento(p.dias)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      registrarMovimiento(p.deuda.id, {
                        tipo: 'pago', fecha: hoyISO(), monto: p.monto,
                      })
                    }
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold active:scale-95 transition"
                  >
                    Pagué
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetalleId(p.deuda.id)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                  >
                    Otro monto
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deudas.length === 0 && !mostrarForm ? (
        <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-300 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Todavía no registras deudas</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Agrega tus tarjetas, préstamos y financiamientos. Con la tasa y la cuota de cada uno te
            calculo la fecha exacta en que quedas libre.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deudas.map((d) => (
            <TarjetaDeuda
              key={d.id}
              deuda={d}
              moneda={moneda}
              esObjetivo={d.id === objetivoId}
              onAbrir={() => setDetalleId(d.id)}
            />
          ))}
        </div>
      )}

      {deudas.length > 0 && (
        <>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase font-bold text-slate-400">Total Pasivos</p>
                <p className="text-sm font-extrabold text-slate-900 truncate">
                  {formatMoney(totalDeuda, moneda)}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] uppercase font-bold text-slate-400">Cuota Mensual</p>
              <p className="text-sm font-extrabold text-emerald-700">
                {formatMoney(totalCuotas, moneda)}/mes
              </p>
            </div>
          </div>

          {/* Cuánto te ganan, de toda la cartera */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Lo que te ganan de interés
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Solo en intereses les estás pagando{' '}
              <strong className="text-amber-300 text-sm">{formatMoney(interes.esteMes, moneda)}</strong>{' '}
              este mes. Eso no baja ni un peso de tu deuda.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white/10 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-300 block">Ya les pagaste</span>
                <span className="text-sm font-black text-white">{formatMoney(interes.pagado, moneda)}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-300 block">Te falta pagarles</span>
                <span className="text-sm font-black text-amber-300">
                  {formatMoney(interes.proyectado, moneda)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPlanVisible(true)}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 active:scale-[0.98] text-white rounded-2xl font-black text-sm tracking-wide shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all duration-200 group border border-emerald-400/40"
          >
            <Sparkles className="w-5 h-5 text-emerald-100 group-hover:rotate-12 transition-transform" />
            <span>Generar Plan Inteligente</span>
            <ArrowRight className="w-4 h-4 text-emerald-100 ml-1" />
          </button>

          {disponible === 0 && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
              Tu flujo de caja no deja excedente todavía. El plan se calcula igual con las cuotas
              fijas, pero llena tus ingresos y gastos en la otra pestaña para ver cuánto puedes
              acelerar.
            </p>
          )}

          {planVisible && comparacion && elegido && (
            <ResultadoPlan
              comparacion={comparacion}
              elegido={elegido}
              deudas={deudas}
              excedente={disponible}
              moneda={moneda}
              alertas={alertas}
              onElegir={setEstrategia}
            />
          )}
        </>
      )}

      {detalle && (
        <DetalleDeuda
          deuda={detalle}
          movimientos={movimientos}
          moneda={moneda}
          onCerrar={() => setDetalleId(null)}
          onEditar={() => { setEditando(detalle); setDetalleId(null); setMostrarForm(true) }}
          onEliminar={() => { eliminarDeuda(detalle.id); setDetalleId(null) }}
          onMovimiento={(m) => registrarMovimiento(detalle.id, m)}
          onDeshacer={deshacerMovimiento}
        />
      )}
    </section>
  )
}
