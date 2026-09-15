import type { ReglaCorreo } from './correo'

/**
 * Reglas iniciales para los bancos dominicanos.
 *
 * AVISO IMPORTANTE: estos patrones estan escritos a partir de la redaccion
 * habitual de las notificaciones bancarias, NO a partir de correos reales de
 * cada banco. Hasta que no se pruebe con un correo de verdad de cada entidad,
 * hay que tratarlos como un punto de partida.
 *
 * Por eso viven en la base de datos (tabla reglas_correo): se corrigen desde
 * el panel sin recompilar ni publicar un APK nuevo. `npm run probar:correo`
 * deja pegar un correo real y ver que extrae.
 */

// Cosas que NUNCA son un movimiento, por mucho que traigan un monto.
const EXCLUIR_SIEMPRE = [
  'declinad',
  'rechazad',
  'no (?:fue |se )?(?:proces|autoriz|complet)',
  'revers',
  'anulad',
  'cancelad',
  'intento (?:de )?(?:compra|transacci)',
  'sospechos',
  'fraude',
  'saldo disponible es',
  'limite de credito es',
]

const MONTO = '(?:RD\\$|US\\$|DOP|USD|\\$)\\s*([\\d.,]+)'
const FECHA = '(\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s+de\\s+[a-zA-Záéíóú]+\\s+de\\s+\\d{4})'
const TARJETA = '(?:termina(?:da|ci[oó]n)?\\s*(?:en|:)?|final(?:izada)?\\s*(?:en|:)?|\\*{2,}|x{2,})\\s*(\\d{4})'
const COMERCIO = '(?:en|comercio|establecimiento|afiliado)[:\\s]+([A-Z0-9][A-Z0-9 ._&\'-]{2,40}?)(?:\\s+(?:el|por|con|the|la fecha)\\b|[,.\\n])'

interface Semilla {
  banco: string
  remitentes: string[]
}

const BANCOS: Semilla[] = [
  { banco: 'BHD',         remitentes: ['bhd.com.do', 'bhdleon.com.do'] },
  { banco: 'Banreservas', remitentes: ['banreservas.com', 'banreservas.com.do'] },
  { banco: 'Popular',     remitentes: ['popularenlinea.com', 'bpd.com.do'] },
  { banco: 'Qik',         remitentes: ['qik.com.do', 'qikbanco.com'] },
  { banco: 'Santa Cruz',  remitentes: ['bancosantacruz.com.do', 'bsc.com.do'] },
  { banco: 'Promerica',   remitentes: ['promerica.com.do'] },
  { banco: 'Scotiabank',  remitentes: ['scotiabank.com.do'] },
  { banco: 'APAP',        remitentes: ['apap.com.do'] },
]

/** Palabras que distinguen un consumo de un pago recibido. */
const ASUNTO_CONSUMO = ['consumo', 'compra', 'transaccion', 'transacción', 'cargo', 'debito', 'débito', 'retiro', 'avance']
const ASUNTO_PAGO = ['pago', 'abono', 'deposito', 'depósito', 'credito aplicado', 'pago recibido']

export const REGLAS_SEMILLA: ReglaCorreo[] = BANCOS.flatMap(({ banco, remitentes }) => [
  // El PAGO va primero a proposito: "pago recibido" tambien contiene la
  // palabra "transaccion" en muchos correos, y la primera regla que casa gana.
  {
    id: `${banco.toLowerCase().replace(/\s+/g, '-')}-pago`,
    banco,
    remitentes,
    asuntoContiene: ASUNTO_PAGO,
    tipo: 'pago' as const,
    patronMonto: MONTO,
    patronFecha: FECHA,
    patronTarjeta: TARJETA,
    patronesExcluir: EXCLUIR_SIEMPRE,
    activa: true,
  },
  {
    id: `${banco.toLowerCase().replace(/\s+/g, '-')}-consumo`,
    banco,
    remitentes,
    asuntoContiene: ASUNTO_CONSUMO,
    tipo: 'consumo' as const,
    patronMonto: MONTO,
    patronFecha: FECHA,
    patronComercio: COMERCIO,
    patronTarjeta: TARJETA,
    patronesExcluir: EXCLUIR_SIEMPRE,
    activa: true,
  },
])
