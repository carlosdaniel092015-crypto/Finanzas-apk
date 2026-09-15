import type { Deuda } from './tipos'
import { proximoPago } from '@/lib/fechas'

export interface ItemRecordatorio {
  clave: string
  titulo: string
  cuerpo: string
  cuando: Date
}

export interface FuenteRecordatorio {
  id: string
  nombre: string
  monto: number
  diaPago?: number
}

const A_LAS_9 = (d: Date) => {
  const x = new Date(d)
  x.setHours(9, 0, 0, 0)
  return x
}

/**
 * Genera los avisos de los proximos meses a partir de los dias de pago.
 *
 * Se avisa ANTES y el mismo dia: el aviso del propio dia llega tarde para
 * quien tiene que ir al banco o mover dinero entre cuentas.
 */
export function generarRecordatorios(
  fuentes: FuenteRecordatorio[],
  opciones: { diasAntes?: number; meses?: number; formatoMonto: (n: number) => string; hoy?: Date } ,
): ItemRecordatorio[] {
  const { diasAntes = 3, meses = 3, formatoMonto, hoy = new Date() } = opciones
  const items: ItemRecordatorio[] = []

  for (const f of fuentes) {
    if (!f.diaPago || f.monto <= 0) continue

    let base = proximoPago(f.diaPago, hoy)
    for (let m = 0; m < meses && base; m++) {
      const vence = new Date(base)

      const previo = new Date(vence)
      previo.setDate(previo.getDate() - diasAntes)
      if (previo.getTime() > hoy.getTime()) {
        items.push({
          clave: `${f.id}-previo-${vence.toISOString().slice(0, 10)}`,
          titulo: `${f.nombre} vence en ${diasAntes} días`,
          cuerpo: `${formatoMonto(f.monto)} · día ${f.diaPago}`,
          cuando: A_LAS_9(previo),
        })
      }

      items.push({
        clave: `${f.id}-dia-${vence.toISOString().slice(0, 10)}`,
        titulo: `Hoy toca ${f.nombre}`,
        cuerpo: `${formatoMonto(f.monto)}. Al registrarlo se actualiza tu plan.`,
        cuando: A_LAS_9(vence),
      })

      const siguiente = new Date(vence)
      siguiente.setMonth(siguiente.getMonth() + 1)
      base = proximoPago(f.diaPago, siguiente)
    }
  }

  return items.sort((a, b) => a.cuando.getTime() - b.cuando.getTime())
}

export const deudasComoFuentes = (deudas: Deuda[]): FuenteRecordatorio[] =>
  deudas
    .filter((d) => d.saldo > 0)
    .map((d) => ({ id: `deuda-${d.id}`, nombre: d.nombre, monto: d.cuotaMensual, diaPago: d.diaPago }))
