import { useMemo } from 'react'
import { AlertTriangle, Info, PartyPopper, TriangleAlert } from 'lucide-react'
import type { ComparacionEstrategias } from '@/engine/plan'
import { escenariosTasaVariable, hayTasaVariable } from '@/engine/plan'
import type { Alerta } from '@/engine/alertas'
import type { Deuda, Estrategia, ResultadoPlan as Resultado } from '@/engine/tipos'
import { formatMeses, formatMesAnio, formatMoney, type Moneda } from '@/lib/format'

const NOMBRE_ESTRATEGIA: Record<Estrategia, string> = {
  avalancha: 'Avalancha',
  bola_nieve: 'Bola de nieve',
  hibrida: 'Híbrida',
  personalizada: 'Personalizada',
}

const EXPLICACION: Record<Estrategia, string> = {
  avalancha: 'Ataca primero la tasa más alta',
  bola_nieve: 'Ataca primero la deuda más pequeña',
  hibrida: 'Equilibra tasa y tamaño',
  personalizada: 'El orden que tú definas',
}

function Escenarios({
  deudas,
  excedente,
  estrategia,
  moneda,
}: {
  deudas: Deuda[]
  excedente: number
  estrategia: Estrategia
  moneda: Moneda
}) {
  const escenarios = useMemo(
    () => escenariosTasaVariable(deudas, { estrategia, excedenteMensual: excedente }),
    [deudas, estrategia, excedente],
  )
  if (!hayTasaVariable(deudas)) return null
  const base = escenarios[0].resultado

  return (
    <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-sm space-y-2.5">
      <div className="flex items-center gap-2">
        <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <h4 className="text-xs font-bold text-slate-900">
          Tienes deuda a tasa variable: esto es lo que pasa si sube
        </h4>
      </div>
      <div className="space-y-1.5">
        {escenarios.map(({ etiqueta, resultado }) => {
          const atraso =
            resultado.meses !== null && base.meses !== null ? resultado.meses - base.meses : null
          return (
            <div
              key={etiqueta}
              className="flex items-center justify-between text-[11px] bg-slate-50 rounded-xl px-3 py-2 border border-slate-100"
            >
              <span className="font-semibold text-slate-700">{etiqueta}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{formatMeses(resultado.meses)}</span>
                {atraso !== null && atraso > 0 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    +{atraso} {atraso === 1 ? 'mes' : 'meses'}
                  </span>
                )}
                <span className="text-slate-400">
                  {formatMoney(resultado.interesTotal, moneda)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Alertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null
  const estilo = {
    critico: 'border-rose-200 bg-rose-50 text-rose-900',
    atencion: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-slate-200 bg-slate-50 text-slate-700',
  } as const

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-slate-900 px-1">Lo que deberías saber</h4>
      {alertas.slice(0, 5).map((a, i) => (
        <div
          key={`${a.titulo}-${i}`}
          className={`rounded-2xl border px-3.5 py-2.5 flex items-start gap-2.5 ${estilo[a.nivel]}`}
        >
          {a.nivel === 'info' ? (
            <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
          )}
          <div>
            <p className="text-[11px] font-bold leading-snug">{a.titulo}</p>
            <p className="text-[11px] opacity-80 leading-relaxed mt-0.5">{a.detalle}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResultadoPlan({
  comparacion,
  elegido,
  deudas,
  excedente,
  moneda,
  alertas,
  onElegir,
}: {
  comparacion: ComparacionEstrategias
  elegido: Resultado
  deudas: Deuda[]
  excedente: number
  moneda: Moneda
  alertas: Alerta[]
  onElegir: (e: Estrategia) => void
}) {
  const ahorro = comparacion.ahorroPorEstrategia[elegido.estrategia] ?? 0
  const hitos = [...elegido.porDeuda]
    .filter((d) => d.mesLiquidacion !== null)
    .sort((a, b) => a.mesLiquidacion! - b.mesLiquidacion!)

  return (
    <div className="space-y-3 pt-2">
      {/* Resultado principal */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-3xl p-5 shadow-xl shadow-emerald-950/20 border border-emerald-600/50 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
            <PartyPopper className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Estrategia {NOMBRE_ESTRATEGIA[elegido.estrategia]}
            </span>

            {elegido.insostenible ? (
              <p className="text-sm font-bold leading-snug">
                Con el aporte actual la deuda <span className="text-amber-300">no baja</span>: los
                intereses se comen el pago. Necesitas subir el abono mensual o renegociar la tasa.
              </p>
            ) : elegido.meses === null ? (
              <p className="text-sm font-bold leading-snug">
                No se liquida dentro del horizonte calculado. Aumenta el aporte mensual para ver una
                fecha real.
              </p>
            ) : (
              <p className="text-sm font-bold text-white leading-snug">
                Destinando tu dinero disponible a la deuda prioritaria, serás libre de deudas en{' '}
                <span className="text-emerald-300 font-extrabold underline decoration-emerald-400 underline-offset-2">
                  {formatMeses(elegido.meses)}
                </span>{' '}
                — {formatMesAnio(elegido.fechaLibre)}.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-2 gap-3 text-left">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-semibold text-emerald-200 block">
              Abono Extra del Flujo
            </span>
            <span className="text-lg font-black text-emerald-300">
              +{formatMoney(excedente, moneda)}
            </span>
            <span className="text-[10px] text-emerald-100 block">Disponibilidad mensual</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-semibold text-emerald-200 block">
              Ahorro en Intereses
            </span>
            <span className="text-lg font-black text-white">{formatMoney(ahorro, moneda)}</span>
            <span className="text-[10px] text-emerald-100 block">vs. pagar solo mínimos</span>
          </div>
        </div>

        {hitos.length > 0 && (
          <div className="mt-3 bg-black/20 rounded-2xl p-3 text-xs space-y-2 border border-white/5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block">
              Orden en que van cayendo:
            </span>
            {hitos.map((h, i) => (
              <div key={h.deudaId} className="flex items-center justify-between font-bold gap-2">
                <span className="text-white truncate">
                  <span className="text-emerald-400 mr-1.5">{i + 1}.</span>
                  {h.nombre}
                </span>
                <span className="text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                  {formatMesAnio(h.fechaLiquidacion)}
                </span>
              </div>
            ))}
            <p className="text-[11px] text-emerald-100/80 pt-1">
              Cuando una deuda muere, su cuota no se gasta: se suma a la siguiente. Eso es lo que
              acelera el final.
            </p>
          </div>
        )}
      </div>

      {/* Comparador de estrategias */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-900 px-1">Compara las estrategias</h4>
        <div className="grid grid-cols-1 gap-2">
          {comparacion.resultados.map((r) => {
            const activa = r.estrategia === elegido.estrategia
            return (
              <button
                key={r.estrategia}
                type="button"
                onClick={() => onElegir(r.estrategia)}
                className={`text-left rounded-2xl p-3.5 border transition w-full ${
                  activa
                    ? 'bg-white border-emerald-400 ring-1 ring-emerald-400/40 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {NOMBRE_ESTRATEGIA[r.estrategia]}
                      </span>
                      {r.estrategia === comparacion.recomendada && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Recomendada
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {EXPLICACION[r.estrategia]}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 block">
                      {formatMeses(r.meses)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {formatMoney(r.interesTotal, moneda)} interés
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
          Referencia: pagando solo los mínimos tardarías {formatMeses(comparacion.soloMinimos.meses)}{' '}
          y pagarías {formatMoney(comparacion.soloMinimos.interesTotal, moneda)} en intereses.
        </p>
      </div>

      <Escenarios
        deudas={deudas}
        excedente={excedente}
        estrategia={elegido.estrategia}
        moneda={moneda}
      />

      <Alertas alertas={alertas} />

      <p className="text-[10px] text-slate-400 px-1 leading-relaxed pb-2">
        Proyección con las tasas que registraste y un aporte mensual constante. Es una estimación,
        no una oferta de crédito: tu banco puede aplicar cargos o seguros que no están aquí.
      </p>
    </div>
  )
}
