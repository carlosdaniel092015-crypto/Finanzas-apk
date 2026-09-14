import { CloudOff, X } from 'lucide-react'
import { useStore } from '@/store'

/**
 * Banda de aviso cuando Supabase esta configurado pero la sincronizacion falla.
 * Los datos NO se pierden (queda la copia local), pero el usuario tiene que
 * saber que no estan en la nube.
 */
export function AvisoSync() {
  const error = useStore((s) => s.errorSync)
  const descartar = useStore((s) => s.descartarError)
  if (!error) return null

  return (
    <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
      <CloudOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-amber-900">Guardado solo en este teléfono</p>
        <p className="text-[11px] text-amber-800/90 leading-relaxed mt-0.5">{error}</p>
      </div>
      <button
        type="button"
        onClick={descartar}
        aria-label="Descartar aviso"
        className="text-amber-600 hover:text-amber-800 p-0.5 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
