import { ShieldCheck } from 'lucide-react'
import { supabaseConfigurado } from '@/lib/supabase'

export function Header({ titulo, usuario }: { titulo: string; usuario: string }) {
  const iniciales =
    usuario
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'TÚ'

  return (
    <header className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md px-5 pt-4 pb-3 border-b border-slate-200/70 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/25">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700">
            Libertad Financiera
          </span>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">{titulo}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-semibold text-slate-500">{usuario}</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {supabaseConfigurado ? 'Sincronizado' : 'Modo local'}
          </span>
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-200/80 border border-slate-300/80 flex items-center justify-center text-slate-700 font-bold text-xs">
          {iniciales}
        </div>
      </div>
    </header>
  )
}
