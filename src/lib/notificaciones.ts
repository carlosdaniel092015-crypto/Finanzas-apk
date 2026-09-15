import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const esNativo = () => Capacitor.isNativePlatform()

export type EstadoPermiso = 'concedido' | 'denegado' | 'sin-pedir' | 'no-soportado'

export async function estadoPermiso(): Promise<EstadoPermiso> {
  if (esNativo()) {
    const { display } = await LocalNotifications.checkPermissions()
    return display === 'granted' ? 'concedido' : display === 'denied' ? 'denegado' : 'sin-pedir'
  }
  if (typeof Notification === 'undefined') return 'no-soportado'
  return Notification.permission === 'granted'
    ? 'concedido'
    : Notification.permission === 'denied'
      ? 'denegado'
      : 'sin-pedir'
}

export async function pedirPermiso(): Promise<boolean> {
  if (esNativo()) {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  }
  if (typeof Notification === 'undefined') return false
  return (await Notification.requestPermission()) === 'granted'
}

export interface Recordatorio {
  /** Identificador estable: reprogramar no debe duplicar avisos */
  clave: string
  titulo: string
  cuerpo: string
  cuando: Date
}

/**
 * Capacitor exige un id numerico de 32 bits. Se deriva de la clave para que
 * reprogramar el mismo recordatorio lo REEMPLACE en vez de apilar otro aviso.
 */
function idNumerico(clave: string): number {
  let h = 0
  for (let i = 0; i < clave.length; i++) {
    h = (h << 5) - h + clave.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) % 2_000_000_000
}

/**
 * Programa los avisos en el dispositivo.
 *
 * En el APK quedan agendados en el sistema y suenan aunque la app esté cerrada.
 * En el navegador NO: sin un service worker con Push, el navegador no despierta
 * nada por su cuenta, así que solo se avisa de lo vencido al abrir la app. La
 * UI lo dice en vez de prometer algo que no ocurre.
 */
export async function programar(recordatorios: Recordatorio[]): Promise<number> {
  const futuros = recordatorios.filter((r) => r.cuando.getTime() > Date.now())
  if (futuros.length === 0) return 0

  if (!esNativo()) {
    if ((await estadoPermiso()) !== 'concedido') return 0
    const hoy = new Date().toDateString()
    const deHoy = futuros.filter((r) => r.cuando.toDateString() === hoy)
    for (const r of deHoy.slice(0, 3)) {
      new Notification(r.titulo, { body: r.cuerpo, tag: r.clave })
    }
    return deHoy.length
  }

  await LocalNotifications.schedule({
    notifications: futuros.slice(0, 60).map((r) => ({
      id: idNumerico(r.clave),
      title: r.titulo,
      body: r.cuerpo,
      schedule: { at: r.cuando, allowWhileIdle: true },
      smallIcon: 'ic_stat_icon',
    })),
  })
  return futuros.length
}

export async function cancelarTodos(): Promise<void> {
  if (!esNativo()) return
  const { notifications } = await LocalNotifications.getPending()
  if (notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) })
  }
}
