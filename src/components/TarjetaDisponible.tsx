import { ChevronRight } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { useFlujoCaja, useStore } from '@/store'

/** Tarjeta flotante fijada sobre la barra de navegacion. */
export function TarjetaDisponible({ onVerPlan }: { onVerPlan: () => void }) {
  const moneda = useStore((s) => s.moneda)
  const { ingreso, totalGastos, disponible, pctLibre, pctGastos } = useFlujoCaja()

  return (
    <div className="fixed bottom-[86px] left-0 right-0 max-w-md mx-auto px-4 z-20 pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/90 shadow-xl shadow-slate-900/10 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider block">
              Dinero Disponible
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-800 tracking-tight">
                {formatMoney(disponible, moneda)}
              </span>
              <span className="text-[10px] font-bold text-slate-600">{moneda} libre</span>
            </div>
          </div>
          <span className="inline-block text-[11px] font-extrabold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300">
            {Math.round(pctLibre)}% libre
          </span>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-slate-400 h-full transition-all duration-300"
            style={{ width: `${pctGastos}%` }}
            title="Gastos fijos"
          />
          <div
            className="bg-emerald-700 h-full transition-all duration-300"
            style={{ width: `${pctLibre}%` }}
            title="Dinero libre"
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600 pt-0.5">
          <span>Gastos: {formatMoney(totalGastos, moneda)}</span>
          <span className="text-slate-400">•</span>
          <span>Ingreso: {formatMoney(ingreso, moneda)}</span>
          <button
            type="button"
            onClick={onVerPlan}
            className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-0.5 hover:underline ml-auto"
          >
            Ver plan <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
