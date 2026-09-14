import { useState } from 'react'
import { FilePlus, X } from 'lucide-react'
import { ETIQUETA_TIPO } from './iconos'
import type { Deuda, TipoDeuda, TipoTasa } from '@/engine/tipos'

const CAMPO =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
const ETIQUETA = 'text-[11px] font-bold text-slate-600 block mb-1'

const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoDeuda[]

export function FormNuevaDeuda({
  onGuardar,
  onCerrar,
}: {
  onGuardar: (d: Omit<Deuda, 'id'>) => void
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoDeuda>('tarjeta')
  const [saldo, setSaldo] = useState('')
  const [cuota, setCuota] = useState('')
  const [tasa, setTasa] = useState('')
  const [tipoTasa, setTipoTasa] = useState<TipoTasa>('fija')
  const [meses, setMeses] = useState('')
  const [limite, setLimite] = useState('')
  const [minimoPct, setMinimoPct] = useState('')

  const esTarjeta = tipo === 'tarjeta' || tipo === 'linea_credito'

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const saldoNum = parseFloat(saldo) || 0
    if (!nombre.trim() || saldoNum <= 0) return

    onGuardar({
      nombre: nombre.trim(),
      tipo,
      saldo: saldoNum,
      tasaAnual: parseFloat(tasa) || 0,
      tipoTasa,
      cuotaMensual: parseFloat(cuota) || 0,
      pagoMinimoPct: esTarjeta ? parseFloat(minimoPct) || undefined : undefined,
      limiteCredito: esTarjeta ? parseFloat(limite) || undefined : undefined,
      mesesRestantes: parseInt(meses, 10) || undefined,
    })
  }

  return (
    <div className="bg-white rounded-3xl p-5 border-2 border-emerald-300 shadow-md space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <FilePlus className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Nueva Obligación Financiera
          </h3>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label className={ETIQUETA} htmlFor="d-nombre">
            Nombre de la Deuda
          </label>
          <input
            id="d-nombre"
            required
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Tarjeta Popular, Préstamo del carro..."
            className={CAMPO}
          />
        </div>

        <div>
          <label className={ETIQUETA} htmlFor="d-tipo">
            Tipo de Deuda
          </label>
          <select
            id="d-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDeuda)}
            className={CAMPO}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={ETIQUETA} htmlFor="d-saldo">
              Saldo Actual ($)
            </label>
            <input
              id="d-saldo"
              type="number"
              inputMode="decimal"
              required
              min="1"
              step="any"
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
              placeholder="Ej. 4500"
              className={CAMPO}
            />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="d-cuota">
              Cuota Mensual ($)
            </label>
            <input
              id="d-cuota"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={cuota}
              onChange={(e) => setCuota(e.target.value)}
              placeholder="Ej. 250"
              className={CAMPO}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={ETIQUETA} htmlFor="d-tasa">
              Tasa de Interés (%)
            </label>
            <input
              id="d-tasa"
              type="number"
              inputMode="decimal"
              min="0"
              max="200"
              step="0.1"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              placeholder="Ej. 24.5"
              className={CAMPO}
            />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="d-tipotasa">
              Tipo de Tasa
            </label>
            <select
              id="d-tipotasa"
              value={tipoTasa}
              onChange={(e) => setTipoTasa(e.target.value as TipoTasa)}
              className={CAMPO}
            >
              <option value="fija">Fija</option>
              <option value="variable">Variable</option>
            </select>
          </div>
        </div>

        {tipoTasa === 'variable' && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
            Con tasa variable el plan se calcula también en escenarios de subida, para que sepas
            cuánto se te movería la fecha si el índice sube.
          </p>
        )}

        {esTarjeta ? (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={ETIQUETA} htmlFor="d-limite">
                Límite de Crédito ($)
              </label>
              <input
                id="d-limite"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                placeholder="Ej. 150000"
                className={CAMPO}
              />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="d-min">
                Pago Mínimo (%)
              </label>
              <input
                id="d-min"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.1"
                value={minimoPct}
                onChange={(e) => setMinimoPct(e.target.value)}
                placeholder="Ej. 5"
                className={CAMPO}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className={ETIQUETA} htmlFor="d-meses">
              Tiempo Restante (meses)
            </label>
            <input
              id="d-meses"
              type="number"
              inputMode="numeric"
              min="1"
              max="600"
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
              placeholder="Ej. 18"
              className={CAMPO}
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onCerrar}
            className="w-1/3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-2/3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-700/20 active:scale-95 transition"
          >
            Guardar Deuda
          </button>
        </div>
      </form>
    </div>
  )
}
