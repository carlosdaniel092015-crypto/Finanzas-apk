import { useMemo, useState } from 'react'
import { ArrowRight, Layers, PlusCircle, Sparkles, Target } from 'lucide-react'
import { FormNuevaDeuda } from '@/components/FormNuevaDeuda'
import { TarjetaDeuda } from '@/components/TarjetaDeuda'
import { ResultadoPlan } from '@/components/ResultadoPlan'
import { compararEstrategias, ordenarDeudas, pagoMinimo } from '@/engine/plan'
import { analizar } from '@/engine/alertas'
import { formatMoney } from '@/lib/format'
import { useFlujoCaja, useStore } from '@/store'

export function Deudas() {
  const { moneda, deudas, estrategia, agregarDeuda, eliminarDeuda, setEstrategia } = useStore()
  const { disponible, ingreso, totalGastos } = useFlujoCaja()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [planVisible, setPlanVisible] = useState(false)

  const totalDeuda = deudas.reduce((s, d) => s + d.saldo, 0)
  const totalCuotas = deudas.reduce((s, d) => s + (d.cuotaMensual || pagoMinimo(d, d.saldo)), 0)

  const objetivoId = useMemo(
    () => ordenarDeudas(deudas, estrategia)[0]?.id,
    [deudas, estrategia],
  )

  // El plan es una funcion pura de (deudas, excedente, estrategia): recalcular
  // en cada cambio es barato y evita que la pantalla muestre datos viejos.
  const comparacion = useMemo(
    () => (deudas.length > 0 ? compararEstrategias(deudas, { excedenteMensual: disponible }) : null),
    [deudas, disponible],
  )

  const elegido = comparacion?.resultados.find((r) => r.estrategia === estrategia) ?? null

  const alertas = useMemo(
    () => analizar({ ingresoMensual: ingreso, gastosFijos: totalGastos, deudas }),
    [ingreso, totalGastos, deudas],
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Estrategia Cero Deudas</h2>
          <p className="text-xs text-slate-500 font-medium">Amortización acelerada y plan de escape</p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 active:scale-95 transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Agregar</span>
        </button>
      </div>

      {mostrarForm && (
        <FormNuevaDeuda
          onCerrar={() => setMostrarForm(false)}
          onGuardar={(d) => {
            agregarDeuda(d)
            setMostrarForm(false)
          }}
        />
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
              onEliminar={eliminarDeuda}
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
              Tu flujo de caja no deja excedente todavía. El plan se calcula igual con los pagos
              mínimos, pero llena tus ingresos y gastos en la otra pestaña para ver cuánto puedes
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
    </section>
  )
}
