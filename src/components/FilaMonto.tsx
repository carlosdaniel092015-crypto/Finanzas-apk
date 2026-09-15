import { useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Icono } from './iconos'
import { aMensual, ETIQUETA_FRECUENCIA, FRECUENCIAS, type Frecuencia } from '@/engine/frecuencia'
import { formatMoney, type Moneda } from '@/lib/format'

const CAMPO =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

export interface DatosFila {
  descripcion: string
  clave: string
  monto: number
  frecuencia: Frecuencia
  dia?: number
}

/**
 * Un renglón de ingreso o gasto: se ve compacto y se edita en el sitio.
 * Cuando la periodicidad no es mensual muestra siempre su equivalente al mes,
 * porque es ese número —no el que se escribió— el que decide cuánto queda.
 */
export function FilaMonto({
  datos,
  moneda,
  icono,
  etiquetaClave,
  opcionesClave,
  etiquetaDia,
  acento,
  onGuardar,
  onEliminar,
}: {
  datos: DatosFila
  moneda: Moneda
  icono: string
  etiquetaClave: string
  opcionesClave: { valor: string; texto: string }[]
  etiquetaDia: string
  acento: 'ingreso' | 'gasto'
  onGuardar: (d: DatosFila) => void
  onEliminar: () => void
}) {
  const [editando, setEditando] = useState(datos.descripcion === '')
  const [borrador, setBorrador] = useState(datos)

  const mensual = aMensual(datos.monto, datos.frecuencia)
  const distinto = datos.frecuencia !== 'mensual'
  const color = acento === 'ingreso' ? 'text-emerald-700' : 'text-slate-900'
  const fondo = acento === 'ingreso' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'

  if (editando) {
    return (
      <div className="bg-white rounded-2xl p-3.5 border-2 border-emerald-300 space-y-2.5">
        <input
          autoFocus
          value={borrador.descripcion}
          onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })}
          placeholder={acento === 'ingreso' ? 'Ej. Sueldo Suedfargesa' : 'Ej. Alquiler del apartamento'}
          aria-label="Descripción"
          className={CAMPO}
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Monto</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={borrador.monto === 0 ? '' : borrador.monto}
              onChange={(e) => setBorrador({ ...borrador, monto: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              aria-label="Monto"
              className={CAMPO}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Cada cuánto</label>
            <select
              value={borrador.frecuencia}
              onChange={(e) => setBorrador({ ...borrador, frecuencia: e.target.value as Frecuencia })}
              aria-label="Frecuencia"
              className={CAMPO}
            >
              {FRECUENCIAS.map((f) => (
                <option key={f} value={f}>{ETIQUETA_FRECUENCIA[f]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{etiquetaClave}</label>
            <select
              value={borrador.clave}
              onChange={(e) => setBorrador({ ...borrador, clave: e.target.value })}
              aria-label={etiquetaClave}
              className={CAMPO}
            >
              {opcionesClave.map((o) => (
                <option key={o.valor} value={o.valor}>{o.texto}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              {etiquetaDia} <span className="font-medium text-slate-400">opcional</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={borrador.dia ?? ''}
              onChange={(e) =>
                setBorrador({ ...borrador, dia: parseInt(e.target.value, 10) || undefined })
              }
              placeholder="Ej. 25"
              aria-label={etiquetaDia}
              className={CAMPO}
            />
          </div>
        </div>

        {borrador.frecuencia !== 'mensual' && borrador.monto > 0 && (
          <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            Equivale a <strong>{formatMoney(aMensual(borrador.monto, borrador.frecuencia), moneda)}</strong> al
            mes. Es ese número el que cuenta para saber cuánto te queda.
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!borrador.descripcion.trim()) return
              onGuardar(borrador)
              setEditando(false)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-95 transition"
          >
            <Check className="w-3.5 h-3.5" /> Guardar
          </button>
          <button
            type="button"
            onClick={() => (datos.descripcion === '' ? onEliminar() : (setBorrador(datos), setEditando(false)))}
            aria-label="Cancelar"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl px-3.5 py-3 border border-slate-200/80 shadow-sm flex items-center gap-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${fondo}`}>
        <Icono nombre={icono} className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 truncate">{datos.descripcion}</p>
        <p className="text-[10px] text-slate-400">
          {opcionesClave.find((o) => o.valor === datos.clave)?.texto ?? datos.clave}
          {' · '}
          {ETIQUETA_FRECUENCIA[datos.frecuencia]}
          {datos.dia ? ` · día ${datos.dia}` : ''}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-xs font-black ${color}`}>{formatMoney(datos.monto, moneda)}</p>
        {distinto && (
          <p className="text-[10px] text-slate-400">{formatMoney(mensual, moneda)}/mes</p>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => { setBorrador(datos); setEditando(true) }}
          aria-label={`Editar ${datos.descripcion}`}
          className="p-1.5 text-slate-400 hover:text-emerald-700"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onEliminar}
          aria-label={`Eliminar ${datos.descripcion}`}
          className="p-1.5 text-slate-300 hover:text-rose-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
