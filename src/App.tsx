import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AvisoSync } from '@/components/AvisoSync'
import { BottomNav, type Pestana } from '@/components/BottomNav'
import { Header } from '@/components/Header'
import { TarjetaDisponible } from '@/components/TarjetaDisponible'
import { Deudas } from '@/views/Deudas'
import { FlujoCaja } from '@/views/FlujoCaja'
import { Login } from '@/views/Login'
import { Ajustes } from '@/views/Ajustes'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { useStore, useUI } from '@/store'

const CLAVE_INVITADO = 'deudacero:invitado'

const TITULOS: Record<Pestana, string> = {
  flujo: 'Control de Presupuesto',
  deudas: 'Estrategia Cero Deudas',
}

export default function App() {
  const [pestana, setPestana] = useState<Pestana>('flujo')
  const [enAjustes, setEnAjustes] = useState(false)
  const [sesion, setSesion] = useState<Session | null>(null)
  // El modo invitado se recuerda: sin esto, quien usa la app sin cuenta vuelve
  // a la pantalla de login cada vez que la abre.
  const [invitado, setInvitado] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_INVITADO) === '1'
    } catch {
      return false
    }
  })

  const entrarComoInvitado = () => {
    try {
      localStorage.setItem(CLAVE_INVITADO, '1')
    } catch {
      /* modo privado: funciona igual, solo no se recuerda */
    }
    setInvitado(true)
  }
  const [authLista, setAuthLista] = useState(!supabaseConfigurado)
  const cargar = useStore((s) => s.cargar)
  const formAbierto = useUI((s) => s.formAbierto)
  const setFormAbierto = useUI((s) => s.setFormAbierto)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setAuthLista(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s)
      if (s) {
        // Entrar con cuenta manda sobre el modo invitado recordado.
        try {
          localStorage.removeItem(CLAVE_INVITADO)
        } catch { /* nada que limpiar */ }
        setInvitado(false)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const autenticado = !supabaseConfigurado || Boolean(sesion) || invitado

  // Recargar al entrar (y al cambiar de usuario): los datos de otra cuenta no
  // pueden quedar en pantalla.
  useEffect(() => {
    if (autenticado) void cargar()
  }, [autenticado, sesion?.user?.id, cargar])

  if (!authLista) {
    return <div className="min-h-screen bg-slate-50" />
  }

  if (!autenticado) {
    return <Login onModoLocal={entrarComoInvitado} />
  }

  const usuario = sesion?.user?.email?.split('@')[0] ?? 'Invitado'

  const sincronizando = supabaseConfigurado && Boolean(sesion)

  if (enAjustes) {
    return (
      <Ajustes
        usuario={usuario}
        sincronizando={sincronizando}
        onVolver={() => setEnAjustes(false)}
      />
    )
  }

  return (
    <div className="bg-slate-100 min-h-screen flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col relative shadow-2xl overflow-x-hidden border-x border-slate-200/80">
        <Header
          titulo={TITULOS[pestana]}
          usuario={usuario}
          sincronizando={sincronizando}
          onAjustes={() => setEnAjustes(true)}
        />
        <AvisoSync />

        <main className="flex-1 px-4 pt-4 pb-56">
          {pestana === 'flujo' ? <FlujoCaja /> : <Deudas />}
        </main>

        {!formAbierto && <TarjetaDisponible onVerPlan={() => setPestana('deudas')} />}
        <BottomNav
          pestana={pestana}
          onCambiar={(p) => {
            setFormAbierto(false)
            setPestana(p)
          }}
        />
      </div>
    </div>
  )
}
