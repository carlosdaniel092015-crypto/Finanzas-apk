import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AvisoSync } from '@/components/AvisoSync'
import { BottomNav, type Pestana } from '@/components/BottomNav'
import { Header } from '@/components/Header'
import { TarjetaDisponible } from '@/components/TarjetaDisponible'
import { Deudas } from '@/views/Deudas'
import { FlujoCaja } from '@/views/FlujoCaja'
import { Login } from '@/views/Login'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { useStore } from '@/store'

const TITULOS: Record<Pestana, string> = {
  flujo: 'Control de Presupuesto',
  deudas: 'Estrategia Cero Deudas',
}

export default function App() {
  const [pestana, setPestana] = useState<Pestana>('flujo')
  const [sesion, setSesion] = useState<Session | null>(null)
  const [invitado, setInvitado] = useState(false)
  const [authLista, setAuthLista] = useState(!supabaseConfigurado)
  const cargar = useStore((s) => s.cargar)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setAuthLista(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
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
    return <Login onModoLocal={() => setInvitado(true)} />
  }

  const usuario = sesion?.user?.email?.split('@')[0] ?? 'Invitado'

  return (
    <div className="bg-slate-100 min-h-screen flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col relative shadow-2xl overflow-x-hidden border-x border-slate-200/80">
        <Header
          titulo={TITULOS[pestana]}
          usuario={usuario}
          sincronizando={supabaseConfigurado && Boolean(sesion)}
        />
        <AvisoSync />

        <main className="flex-1 px-4 pt-4 pb-56">
          {pestana === 'flujo' ? <FlujoCaja /> : <Deudas />}
        </main>

        <TarjetaDisponible onVerPlan={() => setPestana('deudas')} />
        <BottomNav pestana={pestana} onCambiar={setPestana} />
      </div>
    </div>
  )
}
