import { Lightbulb, TrendingUp, WalletCards } from 'lucide-react'
import { Icono } from '@/components/iconos'
import { formatMoney, type Moneda } from '@/lib/format'
import { useFlujoCaja, useStore } from '@/store'
import type { GastoFijo } from '@/data/tipos'

function CampoMonto({
  valor,
  onChange,
  ariaLabel,
}: {
  valor: number
  onChange: (n: number) => void
  ariaLabel: string
}) {
  return (
    <div className="flex items-center bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-200 focus-within:border-emerald-500">
      <span className="text-xs font-bold text-slate-400 mr-1">$</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        aria-label={ariaLabel}
        value={valor === 0 ? '' : valor}
        placeholder="0"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none"
      />
    </div>
  )
}

function TarjetaGasto({ gasto }: { gasto: GastoFijo }) {
  const setGasto = useStore((s) => s.setGasto)

  if (gasto.ancho === 'completo') {
    return (
      <div className="col-span-2 bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-emerald-300 transition">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Icono nombre={gasto.icono} className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-700 block">{gasto.nombre}</span>
            {gasto.nota && <span className="text-[10px] text-slate-400">{gasto.nota}</span>}
          </div>
        </div>
        <div className="w-32">
          <CampoMonto
            valor={gasto.monto}
            onChange={(n) => setGasto(gasto.id, n)}
            ariaLabel={gasto.nombre}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <Icono nombre={gasto.icono} className="w-4 h-4" />
        </div>
        <span
          className={
            gasto.etiqueta === 'CAASD'
              ? 'text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded'
              : 'text-[10px] font-bold text-slate-400 uppercase'
          }
        >
          {gasto.etiqueta}
        </span>
      </div>
      <span className="text-xs font-semibold text-slate-700 mb-1">{gasto.nombre}</span>
      <CampoMonto
        valor={gasto.monto}
        onChange={(n) => setGasto(gasto.id, n)}
        ariaLabel={gasto.nombre}
      />
    </div>
  )
}

export function FlujoCaja() {
  const { moneda, ingresoMensual, gastosFijos, setIngreso, setMoneda } = useStore()
  const { totalGastos } = useFlujoCaja()

  return (
    <section className="space-y-4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 text-white rounded-2xl p-4 shadow-lg shadow-emerald-950/15 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block mb-0.5">
              Diagnóstico Mensual
            </span>
            <h2 className="text-sm font-extrabold text-white">Domina tus entradas y salidas</h2>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              Cada peso liberado acorta tu fecha de libertad.
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-emerald-200 shrink-0">
            <WalletCards className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Ingresos */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <label
              htmlFor="ingreso"
              className="text-xs font-extrabold uppercase tracking-wider text-slate-600"
            >
              Ingresos Mensuales Totales
            </label>
          </div>
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
            Frecuencia: Mensual
          </span>
        </div>

        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition">
          <span className="text-xl font-bold text-slate-400 mr-2">$</span>
          <input
            id="ingreso"
            type="number"
            inputMode="decimal"
            min={0}
            value={ingresoMensual === 0 ? '' : ingresoMensual}
            placeholder="0.00"
            onChange={(e) => setIngreso(parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent text-2xl font-black text-slate-900 focus:outline-none tracking-tight"
          />
          <select
            aria-label="Moneda"
            value={moneda}
            onChange={(e) => setMoneda(e.target.value as Moneda)}
            className="text-xs font-semibold text-slate-500 uppercase ml-2 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="DOP">DOP</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Sueldo base + variables
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/60 px-2 py-0.5 rounded">
            Editable
          </span>
        </div>
      </div>

      {/* Gastos fijos */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Gastos Fijos Esenciales</h3>
            <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
              {gastosFijos.length}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            {formatMoney(totalGastos, moneda)} / mes
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {gastosFijos.map((g) => (
            <TarjetaGasto key={g.id} gasto={g} />
          ))}
        </div>
      </div>

      <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3.5 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4" />
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-emerald-950">Consejo pro:</span> tu dinero disponible se
          conecta automáticamente con el Centro de Deudas para calcular tu velocidad de pago.
        </p>
      </div>
    </section>
  )
}
