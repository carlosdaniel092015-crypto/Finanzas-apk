import { Lightbulb, Plus, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { FilaMonto, type DatosFila } from '@/components/FilaMonto'
import {
  ETIQUETA_GASTO, ETIQUETA_INGRESO, GASTOS_SUGERIDOS, ICONO_GASTO, ICONO_INGRESO,
  INGRESOS_SUGERIDOS, type CategoriaGasto, type Gasto, type Ingreso, type TipoIngreso,
} from '@/data/tipos'
import { aMensual } from '@/engine/frecuencia'
import { formatMoney, type Moneda } from '@/lib/format'
import { useFlujoCaja, useStore } from '@/store'

const OPCIONES_INGRESO = (Object.keys(ETIQUETA_INGRESO) as TipoIngreso[]).map((t) => ({
  valor: t,
  texto: ETIQUETA_INGRESO[t],
}))

const OPCIONES_GASTO = (Object.keys(ETIQUETA_GASTO) as CategoriaGasto[]).map((c) => ({
  valor: c,
  texto: ETIQUETA_GASTO[c],
}))

function Sugerencias({
  items,
  onAgregar,
}: {
  items: { descripcion: string }[]
  onAgregar: (descripcion: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      <span className="text-[10px] font-bold text-slate-400 self-center mr-0.5">Añadir rápido:</span>
      {items.map((s) => (
        <button
          key={s.descripcion}
          type="button"
          onClick={() => onAgregar(s.descripcion)}
          className="px-2 py-1 bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 text-slate-600 rounded-lg text-[11px] font-semibold transition"
        >
          + {s.descripcion}
        </button>
      ))}
    </div>
  )
}

export function FlujoCaja() {
  const {
    moneda, ingresos, gastos, setMoneda,
    agregarIngreso, editarIngreso, eliminarIngreso,
    agregarGasto, editarGasto, eliminarGasto,
  } = useStore()
  const { ingreso, totalGastos, disponible, pctLibre } = useFlujoCaja()

  const usadas = new Set(ingresos.map((i) => i.descripcion.toLowerCase()))
  const sugIngresos = INGRESOS_SUGERIDOS.filter((s) => !usadas.has(s.descripcion.toLowerCase()))
  const usadasG = new Set(gastos.map((g) => g.descripcion.toLowerCase()))
  const sugGastos = GASTOS_SUGERIDOS.filter((s) => !usadasG.has(s.descripcion.toLowerCase()))

  const aFila = (i: Ingreso): DatosFila => ({
    descripcion: i.descripcion, clave: i.tipo, monto: i.monto, frecuencia: i.frecuencia, dia: i.diaCobro,
  })
  const aFilaG = (g: Gasto): DatosFila => ({
    descripcion: g.descripcion, clave: g.categoria, monto: g.monto, frecuencia: g.frecuencia, dia: g.diaPago,
  })

  return (
    <section className="space-y-4">
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

      {/* ───────────────────────── INGRESOS ───────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ingresos</h3>
              <p className="text-[10px] text-slate-400">Todo lo que entra</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              {formatMoney(ingreso, moneda)}/mes
            </span>
            <select
              aria-label="Moneda"
              value={moneda}
              onChange={(e) => setMoneda(e.target.value as Moneda)}
              className="text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {ingresos.map((i) => (
          <FilaMonto
            key={i.id}
            datos={aFila(i)}
            moneda={moneda}
            icono={ICONO_INGRESO[i.tipo]}
            etiquetaClave="Tipo"
            opcionesClave={OPCIONES_INGRESO}
            etiquetaDia="Día de cobro"
            acento="ingreso"
            onGuardar={(d) =>
              editarIngreso(i.id, {
                descripcion: d.descripcion, tipo: d.clave as TipoIngreso,
                monto: d.monto, frecuencia: d.frecuencia, diaCobro: d.dia,
              })
            }
            onEliminar={() => eliminarIngreso(i.id)}
          />
        ))}

        <button
          type="button"
          onClick={() => agregarIngreso({ descripcion: '', tipo: 'sueldo', monto: 0, frecuencia: 'mensual' })}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-700 text-slate-500 rounded-2xl text-xs font-bold transition"
        >
          <Plus className="w-4 h-4" /> Agregar ingreso
        </button>

        <Sugerencias
          items={sugIngresos}
          onAgregar={(descripcion) => {
            const s = INGRESOS_SUGERIDOS.find((x) => x.descripcion === descripcion)!
            agregarIngreso(s)
          }}
        />
      </div>

      {/* ───────────────────────── GASTOS ───────────────────────── */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gastos</h3>
              <p className="text-[10px] text-slate-400">Todo lo que sale</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            {formatMoney(totalGastos, moneda)}/mes
          </span>
        </div>

        {gastos.map((g) => (
          <FilaMonto
            key={g.id}
            datos={aFilaG(g)}
            moneda={moneda}
            icono={ICONO_GASTO[g.categoria]}
            etiquetaClave="Categoría"
            opcionesClave={OPCIONES_GASTO}
            etiquetaDia="Día de pago"
            acento="gasto"
            onGuardar={(d) =>
              editarGasto(g.id, {
                descripcion: d.descripcion, categoria: d.clave as CategoriaGasto,
                monto: d.monto, frecuencia: d.frecuencia, diaPago: d.dia,
              })
            }
            onEliminar={() => eliminarGasto(g.id)}
          />
        ))}

        <button
          type="button"
          onClick={() => agregarGasto({ descripcion: '', categoria: 'otro', monto: 0, frecuencia: 'mensual' })}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-700 text-slate-500 rounded-2xl text-xs font-bold transition"
        >
          <Plus className="w-4 h-4" /> Agregar gasto
        </button>

        <Sugerencias
          items={sugGastos}
          onAgregar={(descripcion) => {
            const s = GASTOS_SUGERIDOS.find((x) => x.descripcion === descripcion)!
            agregarGasto(s)
          }}
        />
      </div>

      {/* ───────────────────── CUÁNTO TE QUEDA ───────────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Al final del mes
        </h3>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Entra</span>
            <span className="font-bold text-emerald-700">+{formatMoney(ingreso, moneda)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Sale</span>
            <span className="font-bold text-slate-900">−{formatMoney(totalGastos, moneda)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-900">Te queda</span>
            <span
              className={`text-xl font-black tracking-tight ${
                ingreso === 0 ? 'text-slate-300' : disponible > 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatMoney(disponible, moneda)}
            </span>
          </div>
        </div>

        {ingreso > 0 && (
          <>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div className="bg-slate-400 h-full transition-all" style={{ width: `${100 - pctLibre}%` }} />
              <div className="bg-emerald-600 h-full transition-all" style={{ width: `${pctLibre}%` }} />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {totalGastos > ingreso ? (
                <>
                  <strong className="text-rose-600">Gastas más de lo que entra.</strong> Te faltan{' '}
                  {formatMoney(totalGastos - ingreso, moneda)} al mes. Eso es lo que hace crecer la deuda.
                </>
              ) : (
                <>
                  Te queda libre el <strong>{Math.round(pctLibre)}%</strong> de lo que entra. Esos{' '}
                  {formatMoney(disponible, moneda)} son los que atacan tus deudas en el plan.
                </>
              )}
            </p>
          </>
        )}

        {ingresos.length === 0 && gastos.length === 0 && (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Empieza agregando tus ingresos y gastos arriba. Puedes escribir la descripción que
            quieras y elegir cada cuánto ocurre.
          </p>
        )}
      </div>

      {(ingresos.some((i) => i.frecuencia !== 'mensual') ||
        gastos.some((g) => g.frecuencia !== 'mensual')) && (
        <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3.5 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-emerald-950">Ojo con lo que no es mensual:</span> un
            seguro de {formatMoney(12000, moneda)} al año pesa {formatMoney(aMensual(12000, 'anual'), moneda)} cada
            mes. Todo se lleva a su equivalente mensual para que "te queda" sea real.
          </p>
        </div>
      )}
    </section>
  )
}
