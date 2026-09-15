import { useEffect, useState } from 'react'
import {
  Bell, BellOff, Check, ChevronLeft, Copy, LogOut, Mail, RefreshCw, ShieldCheck, Trash2,
} from 'lucide-react'
import { crearBuzon, direccionBuzon, DOMINIO_BUZON, leerBuzon, revocarBuzon } from '@/data/buzon'
import { deudasComoFuentes, generarRecordatorios } from '@/engine/recordatorios'
import {
  cancelarTodos, esNativo, estadoPermiso, pedirPermiso, programar, type EstadoPermiso,
} from '@/lib/notificaciones'
import { formatMoney } from '@/lib/format'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { useFlujoCaja, useStore } from '@/store'

function Bloque({
  titulo, descripcion, children,
}: {
  titulo: string
  descripcion?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
      <div className="px-4 pt-3.5 pb-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{titulo}</h3>
        {descripcion && (
          <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{descripcion}</p>
        )}
      </div>
      <div className="px-4 pb-4 space-y-2.5">{children}</div>
    </div>
  )
}

export function Ajustes({
  onVolver,
  usuario,
  sincronizando,
}: {
  onVolver: () => void
  usuario: string
  /** Hay sesión de verdad. En modo invitado no hay cuenta a la que colgar nada. */
  sincronizando: boolean
}) {
  const { moneda, setMoneda, deudas, gastos, notificaciones, setNotificaciones } = useStore()
  const { ingreso, totalGastos, disponible } = useFlujoCaja()

  const [permiso, setPermiso] = useState<EstadoPermiso>('sin-pedir')
  const [programados, setProgramados] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [cargandoBuzon, setCargandoBuzon] = useState(true)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    void estadoPermiso().then(setPermiso)
    if (!sincronizando) {
      setCargandoBuzon(false)
      return
    }
    void leerBuzon()
      .then(setToken)
      .finally(() => setCargandoBuzon(false))
  }, [sincronizando])

  const fuentes = [
    ...deudasComoFuentes(deudas),
    ...gastos
      .filter((g) => g.diaPago && g.monto > 0)
      .map((g) => ({ id: `gasto-${g.id}`, nombre: g.descripcion, monto: g.monto, diaPago: g.diaPago })),
  ]

  async function alternarNotificaciones() {
    if (notificaciones) {
      await cancelarTodos()
      setNotificaciones(false)
      setProgramados(null)
      return
    }
    const ok = (await estadoPermiso()) === 'concedido' || (await pedirPermiso())
    setPermiso(await estadoPermiso())
    if (!ok) return
    setNotificaciones(true)
    await reprogramar()
  }

  async function reprogramar() {
    const items = generarRecordatorios(fuentes, {
      formatoMonto: (n) => formatMoney(n, moneda),
    })
    await cancelarTodos()
    setProgramados(await programar(items))
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      // Sin permiso de portapapeles el usuario puede seleccionarlo a mano.
    }
  }

  const direccion = token ? direccionBuzon(token) : null

  return (
    <div className="bg-slate-100 min-h-screen flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col shadow-2xl border-x border-slate-200/80">
        <header className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-slate-200/70 flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver"
            className="p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700">
              Configuración
            </span>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Ajustes</h1>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 space-y-3 pb-10">
          {/* ── Cuenta ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {usuario.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{usuario}</p>
              <p className="text-[11px] text-slate-500">
                {sincronizando
                  ? 'Datos sincronizados en la nube'
                  : 'Modo local: los datos viven solo en este dispositivo'}
              </p>
            </div>
          </div>

          {/* ── Notificaciones ── */}
          <Bloque
            titulo="Notificaciones"
            descripcion="Te avisa 3 días antes y el mismo día de cada pago."
          >
            <button
              type="button"
              onClick={() => void alternarNotificaciones()}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border transition ${
                notificaciones
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {notificaciones ? (
                  <Bell className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-xs font-bold text-slate-900">
                  {notificaciones ? 'Recordatorios activados' : 'Activar recordatorios'}
                </span>
              </span>
              <span
                className={`w-9 h-5 rounded-full shrink-0 relative transition ${
                  notificaciones ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                    notificaciones ? 'left-[1.125rem]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>

            {permiso === 'denegado' && (
              <p className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 leading-relaxed">
                Bloqueaste las notificaciones para esta app. Hay que volver a permitirlas desde los
                ajustes del sistema; desde aquí no se puede.
              </p>
            )}

            {notificaciones && (
              <>
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>
                    {fuentes.length === 0
                      ? 'Ningún pago tiene día asignado todavía'
                      : `${fuentes.length} ${fuentes.length === 1 ? 'pago' : 'pagos'} con día definido`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void reprogramar()}
                    className="flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Reprogramar
                  </button>
                </div>
                {programados !== null && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    {programados > 0
                      ? `${programados} avisos programados para los próximos 3 meses.`
                      : 'No hay nada que avisar: ponle día de pago a tus deudas y gastos.'}
                  </p>
                )}
              </>
            )}

            {!esNativo() && (
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
                En el navegador solo se avisa de lo que vence <strong>al abrir la app</strong>: sin la
                app instalada, el navegador no despierta nada por su cuenta. En el APK sí quedan
                agendados en el sistema y suenan aunque esté cerrada.
              </p>
            )}
          </Bloque>

          {/* ── Correo del banco ── */}
          <Bloque
            titulo="Correo del banco"
            descripcion="Reenvía aquí las notificaciones de tus bancos y los consumos aparecen solos."
          >
            {!sincronizando ? (
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
                {supabaseConfigurado
                  ? 'Entra con tu cuenta para usar esto: el correo llega a un buzón que cuelga de ella. En modo invitado no hay dónde recibirlo.'
                  : 'Esto necesita la cuenta en la nube, que todavía no está configurada.'}
              </p>
            ) : cargandoBuzon ? (
              <p className="text-[11px] text-slate-400 px-1">Cargando…</p>
            ) : !token ? (
              <button
                type="button"
                onClick={() => void crearBuzon().then(setToken)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-95 transition"
              >
                <Mail className="w-4 h-4" /> Crear mi dirección de correo
              </button>
            ) : (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tu dirección
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono font-bold text-slate-900 break-all flex-1">
                      {direccion}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copiar(direccion!)}
                      aria-label="Copiar dirección"
                      className="p-1.5 text-slate-500 hover:text-emerald-700 shrink-0"
                    >
                      {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!DOMINIO_BUZON && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
                    Falta configurar el dominio que recibe el correo
                    (<code className="font-mono">VITE_DOMINIO_BUZON</code>). Mientras tanto eso de
                    arriba es solo tu token, no una dirección que funcione. Los pasos están en{' '}
                    <strong>docs/CORREO.md</strong>.
                  </p>
                )}

                <ol className="text-[11px] text-slate-600 leading-relaxed space-y-1 pl-4 list-decimal">
                  <li>En Gmail: Ajustes → Filtros → Crear filtro.</li>
                  <li>
                    En <strong>De</strong>: <code className="font-mono text-[10px]">bhd.com.do OR banreservas.com OR popularenlinea.com OR qik.com.do</code>
                  </li>
                  <li>Acción: <strong>Reenviar a</strong> la dirección de arriba.</li>
                  <li>Ponle los <strong>últimos 4 dígitos</strong> a cada tarjeta, para que cada correo se asigne solo.</li>
                </ol>

                <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                  Solo se reenvía lo que casa con ese filtro. La app nunca entra a tu bandeja.
                </p>

                <button
                  type="button"
                  onClick={() => void revocarBuzon().then(() => setToken(null))}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Revocar esta dirección
                </button>
              </>
            )}
          </Bloque>

          {/* ── Preferencias ── */}
          <Bloque titulo="Preferencias">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Moneda</span>
              <select
                aria-label="Moneda"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as typeof moneda)}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="DOP">DOP — Peso dominicano</option>
                <option value="USD">USD — Dólar</option>
              </select>
            </div>

            <div className="border-t border-slate-100 pt-2.5 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Ingresos</span>
                <span className="font-bold text-emerald-700">{formatMoney(ingreso, moneda)}/mes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gastos</span>
                <span className="font-bold text-slate-900">{formatMoney(totalGastos, moneda)}/mes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Te queda</span>
                <span className="font-bold text-emerald-700">{formatMoney(disponible, moneda)}/mes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deudas activas</span>
                <span className="font-bold text-slate-900">{deudas.filter((d) => d.saldo > 0).length}</span>
              </div>
            </div>
          </Bloque>

          {/* ── Seguridad ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3.5 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tus datos solo los ves tú: cada fila de la base está restringida a tu cuenta. La app
              nunca pide claves de tu banco, y no existe forma de que las pida.
            </p>
          </div>

          {sincronizando && (
            <button
              type="button"
              onClick={() => void supabase?.auth.signOut()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 text-slate-600 rounded-2xl text-xs font-bold transition"
            >
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          )}
        </main>
      </div>
    </div>
  )
}
