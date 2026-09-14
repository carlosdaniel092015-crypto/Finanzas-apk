import type { Deuda } from './tipos'
import { pagoMinimo, simularPlan, tasaMensual } from './plan'
import { mesesDesde } from '@/lib/fechas'

export type NivelAlerta = 'critico' | 'atencion' | 'info'

export interface Alerta {
  nivel: NivelAlerta
  titulo: string
  detalle: string
  deudaId?: string
}

export interface ContextoFinanciero {
  ingresoMensual: number
  gastosFijos: number
  deudas: Deuda[]
}

/**
 * Reglas duras sobre la foto financiera. Son deterministas a proposito:
 * nada de esto depende de un modelo, para que el usuario pueda auditar el porque.
 */
export function analizar({
  ingresoMensual,
  gastosFijos,
  deudas,
}: ContextoFinanciero): Alerta[] {
  const alertas: Alerta[] = []
  const activas = deudas.filter((d) => d.saldo > 0)
  if (activas.length === 0) return alertas

  const cuotas = activas.reduce((s, d) => s + pagoMinimo(d, d.saldo), 0)

  // 1. Nivel de endeudamiento sobre ingresos
  if (ingresoMensual > 0) {
    const carga = (cuotas / ingresoMensual) * 100
    if (carga > 40) {
      alertas.push({
        nivel: 'critico',
        titulo: `Tus cuotas son el ${carga.toFixed(0)}% de tus ingresos`,
        detalle:
          'Por encima del 40% cualquier imprevisto te obliga a endeudarte otra vez. Prioriza liberar cuota antes que tomar deuda nueva.',
      })
    } else if (carga > 30) {
      alertas.push({
        nivel: 'atencion',
        titulo: `Tus cuotas son el ${carga.toFixed(0)}% de tus ingresos`,
        detalle: 'Zona apretada. Lo sano es mantenerlo por debajo del 30%.',
      })
    }
  }

  for (const d of activas) {
    // 2. Utilizacion de tarjetas
    if (d.limiteCredito && d.limiteCredito > 0) {
      const uso = (d.saldo / d.limiteCredito) * 100
      if (uso > 70) {
        alertas.push({
          nivel: 'critico',
          titulo: `${d.nombre} al ${uso.toFixed(0)}% de su limite`,
          detalle: 'Por encima del 70% te queda sin colchon y castiga tu historial de crédito.',
          deudaId: d.id,
        })
      } else if (uso > 30) {
        alertas.push({
          nivel: 'atencion',
          titulo: `${d.nombre} al ${uso.toFixed(0)}% de su limite`,
          detalle: 'Lo ideal es mantener el uso por debajo del 30%.',
          deudaId: d.id,
        })
      }
    }

    // 3. La deuda que nunca se paga: el minimo no cubre el interes
    const interesMes = d.saldo * tasaMensual(d)
    const minimo = pagoMinimo(d, d.saldo)
    if (minimo <= interesMes) {
      alertas.push({
        nivel: 'critico',
        titulo: `${d.nombre} no baja nunca con el pago actual`,
        detalle: `El interés del mes es ${interesMes.toFixed(2)} y estás pagando ${minimo.toFixed(2)}. El saldo crece cada mes.`,
        deudaId: d.id,
      })
      continue
    }

    // 4. Cuanto costaria pagando solo el minimo de esa deuda
    const solaConMinimo = simularPlan([d], {
      estrategia: 'avalancha',
      excedenteMensual: 0,
    })
    if (solaConMinimo.meses && solaConMinimo.meses > 60) {
      const anios = Math.floor(solaConMinimo.meses / 12)
      const meses = solaConMinimo.meses % 12
      alertas.push({
        nivel: 'atencion',
        titulo: `${d.nombre} te tomaría ${anios} años y ${meses} meses al mínimo`,
        detalle: `Pagarías ${solaConMinimo.interesTotal.toFixed(2)} solo en intereses. Es la candidata a recibir el excedente.`,
        deudaId: d.id,
      })
    }

    // 5. Meses sin pagar. Con interes corriendo desde el consumo, dos meses
    //    parados ya son un salto grande en el saldo.
    const sinPagar = mesesDesde(d.fechaUltimoPago)
    if (sinPagar !== null && sinPagar >= 2) {
      alertas.push({
        nivel: sinPagar >= 3 ? 'critico' : 'atencion',
        titulo: `${d.nombre}: ${sinPagar} meses sin pago registrado`,
        detalle:
          'El interés sigue corriendo. Si ya pagaste, actualiza la fecha; si no, esta deuda debería ser la prioridad.',
        deudaId: d.id,
      })
    }

    // 6. Exposicion a tasa variable
    if (d.tipoTasa === 'variable' && d.saldo > 0) {
      alertas.push({
        nivel: 'info',
        titulo: `${d.nombre} tiene tasa variable`,
        detalle: 'Si el índice sube, tu cuota y tu fecha de salida se mueven. Revisa el escenario de estrés.',
        deudaId: d.id,
      })
    }
  }

  // 7. Fondo de emergencia
  const disponible = ingresoMensual - gastosFijos - cuotas
  if (gastosFijos > 0 && disponible > 0 && disponible < gastosFijos * 0.1) {
    alertas.push({
      nivel: 'atencion',
      titulo: 'Tu margen mensual es muy delgado',
      detalle: 'Sin colchón, un imprevisto vuelve a la tarjeta. Aparta primero un mes de gastos.',
    })
  }

  const orden: Record<NivelAlerta, number> = { critico: 0, atencion: 1, info: 2 }
  return alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel])
}
