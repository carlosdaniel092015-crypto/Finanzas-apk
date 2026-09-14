import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * La app corre sin Supabase: si faltan las variables entra en MODO LOCAL y
 * guarda todo en el dispositivo. Asi se puede probar (y demostrar) el APK
 * antes de tener el backend configurado.
 */
export const supabaseConfigurado = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
