import { supabase } from '@/lib/supabase'

/** Dominio donde recibe el servicio de correo entrante. Se configura al desplegar. */
export const DOMINIO_BUZON = import.meta.env.VITE_DOMINIO_BUZON ?? ''

function tokenAleatorio(): string {
  const b = new Uint8Array(12)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export async function leerBuzon(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('buzones')
    .select('token')
    .eq('activo', true)
    .maybeSingle()
  return data?.token ?? null
}

export async function crearBuzon(): Promise<string | null> {
  if (!supabase) return null
  const { data: sesion } = await supabase.auth.getUser()
  if (!sesion.user) return null

  const token = tokenAleatorio()
  const { error } = await supabase.from('buzones').insert({ user_id: sesion.user.id, token })
  return error ? null : token
}

/** Revocar: el token viejo deja de aceptar correo de inmediato. */
export async function revocarBuzon(): Promise<void> {
  if (!supabase) return
  await supabase.from('buzones').update({ activo: false }).eq('activo', true)
}

export const direccionBuzon = (token: string) =>
  DOMINIO_BUZON ? `${token}@${DOMINIO_BUZON}` : token
