import { Trash2 } from 'lucide-react'
import { Icono, ICONO_POR_TIPO } from './iconos'
import { formatMoney, type Moneda } from '@/lib/format'
import { pagoMinimo } from '@/engine/plan'
import type { Deuda } from '@/engine/tipos'

export function TarjetaDeuda({
  deuda,
  esObjetivo,
  moneda,
  onEliminar,
}: {
  deuda: Deuda
  esObjetivo: boolean
  moneda: Moneda
  onEliminar: (id: string) => void
}) {
  const cuota = deuda.cuotaMensual || pagoMinimo(deuda, deuda.saldo)
  const uso =
    deuda.limiteCredito && deuda.limiteCredito > 0
      ? (deuda.saldo / deuda.limiteCredito) * 100
      : null

  return (
    <div
      className={`bg-white rounded-2xl p-4 border transition hover:border-emerald-400 ${
        esObjetivo
          ? 'border-emerald-300 ring-1 ring-emerald-400/40 shadow-sm'
          : 'border-slate-200/80 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
              esObjetivo ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Icono nombre={ICONO_POR_TIPO[deuda.tipo]} className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">{deuda.nombre}</h4>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {deuda.tasaAnual}% ({deuda.tipoTasa === 'fija' ? 'Fija' : 'Variable'})
              </span>
              {uso !== null && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    uso > 70
                      ? 'text-rose-700 bg-rose-50'
                      : uso > 30
                        ? 'text-amber-700 bg-amber-50'
                        : 'text-slate-500 bg-slate-50'
                  }`}
                >
                  {uso.toFixed(0)}% del límite
                </span>
              )}
              {deuda.mesesRestantes ? (
                <span className="text-[10px] text-slate-400">• {deuda.mesesRestantes} meses</span>
              ) : null}
            </div>
          </div>
        </div>

        {esObjetivo ? (
          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
            Objetivo #1
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onEliminar(deuda.id)}
            aria-label={`Eliminar ${deuda.nombre}`}
            className="text-slate-300 hover:text-rose-500 transition p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 mt-2">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Total Adeudado
          </span>
          <span className="text-sm font-black text-slate-900">
            {formatMoney(deuda.saldo, moneda)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Cuota Mensual
          </span>
          <span className="text-sm font-extrabold text-emerald-700">
            {formatMoney(cuota, moneda)}/m
          </span>
        </div>
      </div>
    </div>
  )
}
