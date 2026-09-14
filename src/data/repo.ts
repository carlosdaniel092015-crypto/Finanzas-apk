import type { EstadoFinanciero } from './tipos'
import { supabaseConfigurado } from '@/lib/supabase'
import { repoLocal } from './repoLocal'
import { repoSupabase } from './repoSupabase'

export interface ResultadoCarga {
  estado: EstadoFinanciero | null
  /**
   * Mensaje legible cuando la sincronizacion fallo. La app sigue funcionando
   * con la copia local, pero el usuario TIENE que enterarse: creer que tus
   * datos estan en la nube cuando no lo estan es peor que no tenerla.
   */
  error?: string
}

export interface Repo {
  readonly modo: 'local' | 'supabase'
  cargar(): Promise<ResultadoCarga>
  guardar(estado: EstadoFinanciero): Promise<{ error?: string }>
}

export const repo: Repo = supabaseConfigurado ? repoSupabase : repoLocal
