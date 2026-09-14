import { useState } from 'react'
import { Lock, ShieldCheck, WifiOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function Login({ onModoLocal }: { onModoLocal: () => void }) {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setCargando(true)
    setError(null)
    setAviso(null)

    const { error: err } = registrando
      ? await supabase.auth.signUp({ email: correo, password: clave })
      : await supabase.auth.signInWithPassword({ email: correo, password: clave })

    setCargando(false)
    if (err) {
      setError(err.message)
      return
    }
    if (registrando) setAviso('Revisa tu correo para confirmar la cuenta.')
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-slate-50">
      <div className="text-center space-y-2 mb-8">
        <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-700/25 mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Deuda Cero</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Tus finanzas claras.
          <br />
          Tu salida de deudas, con fecha.
        </p>
      </div>

      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label htmlFor="correo" className="text-[11px] font-bold text-slate-600 block mb-1">
            Correo
          </label>
          <input
            id="correo"
            type="email"
            required
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div>
          <label htmlFor="clave" className="text-[11px] font-bold text-slate-600 block mb-1">
            Contraseña
          </label>
          <input
            id="clave"
            type="password"
            required
            minLength={6}
            autoComplete={registrando ? 'new-password' : 'current-password'}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {error && (
          <p className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {aviso && (
          <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-700/20 active:scale-[0.98] transition"
        >
          {cargando ? 'Un momento...' : registrando ? 'Crear cuenta' : 'Entrar'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setRegistrando((v) => !v)}
        className="text-xs font-semibold text-emerald-700 hover:underline mt-4 mx-auto"
      >
        {registrando ? '¿Ya tienes cuenta? Entrar' : 'Crear cuenta'}
      </button>

      <button
        type="button"
        onClick={onModoLocal}
        className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
      >
        <WifiOff className="w-3.5 h-3.5" />
        Usar sin cuenta (datos solo en este teléfono)
      </button>

      <div className="flex items-center justify-center gap-4 mt-8 text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3" /> Cifrado
        </span>
        <span>Tus datos son solo tuyos</span>
        <span>Funciona sin internet</span>
      </div>
    </div>
  )
}
