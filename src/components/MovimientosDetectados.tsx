import { useState } from 'react'
import { Mail, ShoppingBag, ArrowDownCircle, X } from 'lucide-react'
import { formatMoney, type Moneda } from '@/lib/format'
import type { MovimientoDetectado } from '@/data/detectados'
import type { Deuda } from '@/engine/tipos'

/**
 * Bandeja de lo que llegó por correo. La app PROPONE, no aplica: un correo
 * puede ser un duplicado, una compra declinada o un reverso, y si eso entrara
 * solo al saldo quedaría corrompido sin que nadie se entere.
 */
export function MovimientosDetectados({
  detectados,
  deudas,
  moneda,
  onConfirmar,
  onDescartar,
}: {
  detectados: MovimientoDetectado[]
  deudas: Deuda[]
  moneda: Moneda
  onConfirmar: (d: MovimientoDetectado, deudaId: string) => void
  onDescartar: (d: MovimientoDetectado) => void
}) {
  const [eligiendo, setEligiendo] = useState<string | null>(null)
  if (detectados.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-sky-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-200 flex items-center gap-2">
        <Mail className="w-4 h-4 text-sky-700" />
        <h3 className="text-xs font-bold text-sky-900">
          {detectados.length === 1
            ? 'Un movimiento detectado en tu correo'
            : `${detectados.length} movimientos detectados en tu correo`}
        </h3>
      </div>

      <div className="divide-y divide-slate-100">
        {detectados.map((d) => {
          const sugerida = d.deudaId ? deudas.find((x) => x.id === d.deudaId) : undefined
          const abierto = eligiendo === d.id
          const Icono = d.tipo === 'pago' ? ArrowDownCircle : ShoppingBag

          return (
            <div key={d.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    d.tipo === 'pago' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  <Icono className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {d.comercio || (d.tipo === 'pago' ? 'Pago recibido' : 'Consumo')}
                    </span>
                    <span className="text-xs font-black text-slate-900 shrink-0">
                      {formatMoney(d.monto, (d.moneda as Moneda) ?? moneda)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {d.banco} · {d.fecha}
                    {d.ultimos4 ? ` · ···${d.ultimos4}` : ''}
                  </p>
                  {d.confianza !== 'alta' && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 inline-block mt-1">
                      Revísalo: no pude leer todo el correo
                    </p>
                  )}
                </div>
              </div>

              {/* Sin tarjeta identificada hay que elegirla: nunca se adivina. */}
              {abierto || !sugerida ? (
                <div className="pl-11 space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-500">
                    {sugerida ? 'Aplicar a otra deuda:' : '¿A cuál deuda va?'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {deudas.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => { onConfirmar(d, x.id); setEligiendo(null) }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold transition"
                      >
                        {x.nombre}
                        {x.ultimos4 ? ` ···${x.ultimos4}` : ''}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { onDescartar(d); setEligiendo(null) }}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 rounded-lg text-[11px] font-bold transition"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pl-11 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onConfirmar(d, sugerida.id)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold active:scale-95 transition"
                  >
                    Aplicar a {sugerida.nombre}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEligiendo(d.id)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                  >
                    Otra
                  </button>
                  <button
                    type="button"
                    onClick={() => onDescartar(d)}
                    aria-label="Descartar"
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
