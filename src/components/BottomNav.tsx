import { PieChart, Target } from 'lucide-react'

export type Pestana = 'flujo' | 'deudas'

const activa =
  'flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 bg-emerald-50 text-emerald-800 font-bold'
const inactiva =
  'flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-700 font-medium'

export function BottomNav({
  pestana,
  onCambiar,
}: {
  pestana: Pestana
  onCambiar: (p: Pestana) => void
}) {
  const tabs = [
    { id: 'flujo' as const, Icono: PieChart, titulo: 'Flujo de Caja', sub: 'Ingresos & Gastos' },
    { id: 'deudas' as const, Icono: Target, titulo: 'Mis Deudas', sub: 'Estrategia de escape' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2.5"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-2 gap-2">
        {tabs.map(({ id, Icono, titulo, sub }) => {
          const esActiva = pestana === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onCambiar(id)}
              aria-current={esActiva ? 'page' : undefined}
              className={esActiva ? activa : inactiva}
            >
              <div className="flex items-center gap-1.5">
                <Icono className="w-4 h-4" />
                <span className="text-xs">{titulo}</span>
              </div>
              <span
                className={`text-[9px] font-medium mt-0.5 ${esActiva ? 'text-emerald-700' : 'text-slate-400'}`}
              >
                {sub}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
