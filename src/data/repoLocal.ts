import type { Repo } from './repo'
import { migrarEstado } from './tipos'

const CLAVE = 'deudacero:estado:v1'

/**
 * Persistencia en el dispositivo. Es el modo por defecto mientras no haya
 * Supabase configurado, y tambien el respaldo si la red falla dentro del APK.
 */
export const repoLocal: Repo = {
  modo: 'local',

  async cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE)
      if (!crudo) return { estado: null }
      // Un estado guardado por una version anterior se trae al formato de hoy
      // en vez de descartarse: nadie debe perder lo que ya habia llenado.
      return { estado: migrarEstado(JSON.parse(crudo) as Record<string, unknown>) }
    } catch {
      return { estado: null }
    }
  },

  async guardar(estado) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado))
      return {}
    } catch {
      // Cuota llena o modo privado: no vale la pena tumbar la UI por esto.
      return {}
    }
  },
}
