import { useMemo, useState } from 'react'
import { FilePlus, TriangleAlert, X } from 'lucide-react'
import { ETIQUETA_TIPO } from './iconos'
import { formatMoney, formatMeses, type Moneda } from '@/lib/format'
import { simularPlan } from '@/engine/plan'
import type { Deuda, TipoDeuda, TipoTasa } from '@/engine/tipos'

const CAMPO =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
const ETIQUETA = 'text-[11px] font-bold text-slate-600 block mb-1'
const OPCIONAL = 'text-[10px] font-medium text-slate-400 ml-1'

const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoDeuda[]

/** Las tarjetas de aquí cobran ~30% variable desde el consumo, sin gracia. */
const TASA_SUGERIDA: Partial<Record<TipoDeuda, { tasa: string; tipo: TipoTasa }>> = {
  tarjeta: { tasa: '30', tipo: 'variable' },
  linea_credito: { tasa: '30', tipo: 'variable' },
}

export function FormNuevaDeuda({
  moneda,
  onGuardar,
  onCerrar,
}: {
  moneda: Moneda
  onGuardar: (d: Omit<Deuda, 'id'>) => void
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoDeuda>('tarjeta')
  const [saldo, setSaldo] = useState('')
  const [cuota, setCuota] = useState('')
  const [tasa, setTasa] = useState(TASA_SUGERIDA.tarjeta!.tasa)
  const [tipoTasa, setTipoTasa] = useState<TipoTasa>(TASA_SUGERIDA.tarjeta!.tipo)
  const [limite, setLimite] = useState('')
  const [diaPago, setDiaPago] = useState('')
  const [diaCorte, setDiaCorte] = useState('')
  const [ultimoPago, setUltimoPago] = useState('')

  const esTarjeta = tipo === 'tarjeta' || tipo === 'linea_credito'

  function cambiarTipo(nuevo: TipoDeuda) {
    setTipo(nuevo)
    const sugerida = TASA_SUGERIDA[nuevo]
    if (sugerida) {
      setTasa(sugerida.tasa)
      setTipoTasa(sugerida.tipo)
    }
  }

  // Aviso en vivo: con una cuota fija, si no cubre el interés del mes la deuda
  // NUNCA se paga. A 30% anual eso pasa por debajo del 2.5% del saldo, que es
  // más alto de lo que la gente supone.
  const proyeccion = useMemo(() => {
    const s = parseFloat(saldo) || 0
    const c = parseFloat(cuota) || 0
    const t = parseFloat(tasa) || 0
    if (s <= 0 || c <= 0) return null
    const interesMes = (s * t) / 100 / 12
    const r = simularPlan(
      [{ id: 'tmp', nombre, tipo, saldo: s, tasaAnual: t, tipoTasa, cuotaMensual: c }],
      { estrategia: 'avalancha', excedenteMensual: 0 },
    )
    return { interesMes, resultado: r }
  }, [saldo, cuota, tasa, tipoTasa, tipo, nombre])

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const saldoNum = parseFloat(saldo) || 0
    const cuotaNum = parseFloat(cuota) || 0
    if (!nombre.trim() || saldoNum <= 0 || cuotaNum <= 0) return

    onGuardar({
      nombre: nombre.trim(),
      tipo,
      saldo: saldoNum,
      tasaAnual: parseFloat(tasa) || 0,
      tipoTasa,
      cuotaMensual: cuotaNum,
      limiteCredito: esTarjeta ? parseFloat(limite) || undefined : undefined,
      diaPago: parseInt(diaPago, 10) || undefined,
      diaCorte: esTarjeta ? parseInt(diaCorte, 10) || undefined : undefined,
      fechaUltimoPago: ultimoPago || undefined,
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
            onChange={(e) => cambiarTipo(e.target.value as TipoDeuda)}
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
              placeholder="Ej. 50000"
              className={CAMPO}
            />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="d-cuota">
              Cuota Fija Mensual ($)
            </label>
            <input
              id="d-cuota"
              type="number"
              inputMode="decimal"
              required
              min="1"
              step="any"
              value={cuota}
              onChange={(e) => setCuota(e.target.value)}
              placeholder="Ej. 5000"
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
              placeholder="Ej. 30"
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

        {esTarjeta && (
          <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
            El interés de la tarjeta corre <strong>desde el consumo</strong>, sin período de
            gracia: así se calcula aquí.
          </p>
        )}

        {tipoTasa === 'variable' && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
            Con tasa variable el plan también se calcula en escenarios de subida, para que sepas
            cuánto se te movería la fecha si el índice sube.
          </p>
        )}

        {/* Proyección en vivo de esta deuda sola */}
        {proyeccion && (
          <div
            className={`rounded-xl px-3 py-2.5 border text-[11px] leading-relaxed ${
              proyeccion.resultado.insostenible
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {proyeccion.resultado.insostenible ? (
              <div className="flex items-start gap-2">
                <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Esta cuota no paga nunca la deuda.</strong> El interés del primer mes es{' '}
                  {formatMoney(proyeccion.interesMes, moneda)} y estás abonando{' '}
                  {formatMoney(parseFloat(cuota) || 0, moneda)}. El saldo crece cada mes.
                </span>
              </div>
            ) : (
              <span>
                Con esta cuota sola, esta deuda se salda en{' '}
                <strong>{formatMeses(proyeccion.resultado.meses)}</strong> y pagarías{' '}
                <strong>{formatMoney(proyeccion.resultado.interesTotal, moneda)}</strong> de
                interés. El plan la acelera con tu dinero disponible.
              </span>
            )}
          </div>
        )}

        {esTarjeta && (
          <div>
            <label className={ETIQUETA} htmlFor="d-limite">
              Límite de Crédito ($)<span className={OPCIONAL}>opcional</span>
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
        )}

        {/* Fechas: todas opcionales. Alimentan los recordatorios. */}
        <div className="pt-1 border-t border-slate-100 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-1">
            Fechas <span className="normal-case font-medium">— opcionales, para los recordatorios</span>
          </p>

          <div className={esTarjeta ? 'grid grid-cols-2 gap-2.5' : ''}>
            <div>
              <label className={ETIQUETA} htmlFor="d-diapago">
                Día de Pago
              </label>
              <input
                id="d-diapago"
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={diaPago}
                onChange={(e) => setDiaPago(e.target.value)}
                placeholder="Ej. 5"
                className={CAMPO}
              />
            </div>
            {esTarjeta && (
              <div>
                <label className={ETIQUETA} htmlFor="d-diacorte">
                  Día de Corte
                </label>
                <input
                  id="d-diacorte"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  value={diaCorte}
                  onChange={(e) => setDiaCorte(e.target.value)}
                  placeholder="Ej. 28"
                  className={CAMPO}
                />
              </div>
            )}
          </div>

          <div>
            <label className={ETIQUETA} htmlFor="d-ultimopago">
              Fecha del Último Pago
            </label>
            <input
              id="d-ultimopago"
              type="date"
              value={ultimoPago}
              onChange={(e) => setUltimoPago(e.target.value)}
              className={CAMPO}
            />
          </div>
        </div>

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
