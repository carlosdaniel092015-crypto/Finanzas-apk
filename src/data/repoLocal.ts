import type { Repo } from './repo'
import { ESTADO_INICIAL, type EstadoFinanciero } from './tipos'

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
      if (!crudo) return null
      const datos = JSON.parse(crudo) as Partial<EstadoFinanciero>
      // Mezcla defensiva: un estado guardado por una version vieja no debe
      // dejar la app sin gastos ni moneda.
      return { ...ESTADO_INICIAL, ...datos } as EstadoFinanciero
    } catch {
      return null
    }
  },

  async guardar(estado) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado))
    } catch {
      // Cuota llena o modo privado: no vale la pena tumbar la UI por esto.
    }
  },
}
