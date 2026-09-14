import type { EstadoFinanciero } from './tipos'
import { supabaseConfigurado } from '@/lib/supabase'
import { repoLocal } from './repoLocal'
import { repoSupabase } from './repoSupabase'

export interface Repo {
  readonly modo: 'local' | 'supabase'
  cargar(): Promise<EstadoFinanciero | null>
  guardar(estado: EstadoFinanciero): Promise<void>
}

export const repo: Repo = supabaseConfigurado ? repoSupabase : repoLocal
