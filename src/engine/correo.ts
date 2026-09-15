import type { TipoMovimiento } from './tipos'

/**
 * Regla de extraccion de un banco. Vive en la base de datos, NO en el codigo:
 * los bancos cambian sus plantillas de correo sin avisar y hay que poder
 * arreglar el patron sin recompilar ni publicar un APK nuevo.
 */
export interface ReglaCorreo {
  id: string
  banco: string
  /** Direcciones o dominios que identifican al banco */
  remitentes: string[]
  /** Si viene, el asunto debe contener alguno de estos (sin acentos ni mayusculas) */
  asuntoContiene?: string[]
  /** Que clase de movimiento genera este correo */
  tipo: TipoMovimiento
  patronMonto: string
  patronFecha?: string
  patronComercio?: string
  patronTarjeta?: string
  /** Patrones que DESCARTAN el correo (declinadas, reversos, avisos) */
  patronesExcluir?: string[]
  activa: boolean
}

export interface CorreoEntrante {
  de: string
  asunto: string
  /** Cuerpo en texto plano, ya sin HTML */
  texto: string
  recibidoEn: string
}

export interface MovimientoDetectado {
  banco: string
  tipo: TipoMovimiento
  monto: number
  moneda: 'DOP' | 'USD'
  fecha: string
  comercio?: string
  /** Ultimos 4 digitos de la tarjeta, para casarlo con la deuda correcta */
  ultimos4?: string
  confianza: 'alta' | 'media' | 'baja'
  reglaId: string
  /** Se guarda para poder auditar por que se extrajo esto */
  extracto: string
}

/** Quita acentos y pasa a minusculas, para comparar sin sorpresas. */
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Convierte el monto escrito de un correo a numero.
 *
 * El caso peligroso es "1.234": puede ser mil doscientos treinta y cuatro
 * (separador de miles) o uno con doscientos treinta y cuatro (decimal). La
 * regla que se aplica: el ULTIMO separador manda, y solo es decimal si le
 * siguen exactamente 1 o 2 digitos hasta el final. Equivocarse aqui mete un
 * error de mil veces en el saldo sin que nadie lo note.
 */
export function parsearMonto(crudo: string): number | null {
  if (!crudo) return null
  // Deja solo digitos y separadores
  const limpio = crudo.replace(/[^\d.,]/g, '')
  if (!limpio || !/\d/.test(limpio)) return null

  const ultimaComa = limpio.lastIndexOf(',')
  const ultimoPunto = limpio.lastIndexOf('.')
  const corte = Math.max(ultimaComa, ultimoPunto)

  let entero: string
  let decimales = ''

  if (corte === -1) {
    entero = limpio
  } else {
    const cola = limpio.slice(corte + 1)
    if (/^\d{1,2}$/.test(cola)) {
      // Decimal de verdad
      entero = limpio.slice(0, corte)
      decimales = cola
    } else {
      // Era separador de miles
      entero = limpio
    }
  }

  const n = Number(`${entero.replace(/[.,]/g, '')}.${decimales || '0'}`)
  return Number.isFinite(n) ? n : null
}

const MESES: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
}

const p2 = (n: number) => String(n).padStart(2, '0')

/**
 * Fecha de un correo a ISO. En RD se escribe DD/MM/AAAA, que es justo el
 * formato que un parser hecho en EE.UU. lee al reves: 05/09 seria el 9 de mayo
 * en vez del 5 de septiembre. Aqui DD va primero, siempre.
 */
export function parsearFecha(crudo: string, respaldo: string): string {
  if (!crudo) return respaldo
  const s = normalizar(crudo)

  // AAAA-MM-DD (ya viene bien)
  const iso = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) return `${iso[1]}-${p2(+iso[2])}-${p2(+iso[3])}`

  // DD/MM/AAAA o DD-MM-AA
  const dmy = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/)
  if (dmy) {
    const dia = +dmy[1]
    const mes = +dmy[2]
    let anio = +dmy[3]
    if (anio < 100) anio += 2000
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return `${anio}-${p2(mes)}-${p2(dia)}`
    }
  }

  // "14 de septiembre de 2026" / "14-sep-2026"
  const texto = s.match(/(\d{1,2})\s*(?:de\s+)?[-\s]?([a-z]{3,})[-\s]*(?:de\s+)?(\d{4})/)
  if (texto) {
    const mes = MESES[texto[2].slice(0, 3)]
    if (mes) return `${texto[3]}-${p2(mes)}-${p2(+texto[1])}`
  }

  return respaldo
}

function primerGrupo(texto: string, patron?: string): string | undefined {
  if (!patron) return undefined
  try {
    const m = texto.match(new RegExp(patron, 'i'))
    return m?.[1]?.trim() || undefined
  } catch {
    // Un patron mal escrito en la base de datos no puede tumbar la ingesta
    // entera: se ignora ese campo y el correo sigue su camino.
    return undefined
  }
}

const detectarMoneda = (texto: string): 'DOP' | 'USD' =>
  /\bus\$|\bUSD\b|\bd[oó]lares?\b/i.test(texto) ? 'USD' : 'DOP'

/** ¿Este correo lo manda el banco de esta regla? */
export function coincideRemitente(regla: ReglaCorreo, de: string): boolean {
  const d = normalizar(de)
  return regla.remitentes.some((r) => d.includes(normalizar(r)))
}

/**
 * Extrae el movimiento de un correo, o null si ninguna regla aplica.
 * Devolver null es un resultado valido y esperado: mejor no registrar nada
 * que registrar algo inventado.
 */
export function detectarMovimiento(
  correo: CorreoEntrante,
  reglas: ReglaCorreo[],
): MovimientoDetectado | null {
  const asunto = normalizar(correo.asunto)
  const cuerpo = correo.texto
  const todo = `${correo.asunto}\n${cuerpo}`

  for (const regla of reglas) {
    if (!regla.activa) continue
    if (!coincideRemitente(regla, correo.de)) continue
    if (regla.asuntoContiene?.length && !regla.asuntoContiene.some((a) => asunto.includes(normalizar(a)))) {
      continue
    }

    // Declinadas, reversos y avisos no son movimientos: si entran, corrompen
    // el saldo y nadie se entera hasta que no cuadra con el banco.
    const excluir = regla.patronesExcluir?.some((p) => {
      try {
        return new RegExp(p, 'i').test(todo)
      } catch {
        return false
      }
    })
    if (excluir) continue

    const montoCrudo = primerGrupo(todo, regla.patronMonto)
    const monto = parsearMonto(montoCrudo ?? '')
    if (monto === null || monto <= 0) continue

    const fecha = parsearFecha(primerGrupo(todo, regla.patronFecha) ?? '', correo.recibidoEn)
    const comercio = primerGrupo(todo, regla.patronComercio)
    const ultimos4 = primerGrupo(todo, regla.patronTarjeta)?.replace(/\D/g, '').slice(-4)

    // La confianza baja cuando faltan piezas: la UI lo usa para decidir qué
    // resaltar antes de que la persona confirme.
    const piezas = [comercio, ultimos4, primerGrupo(todo, regla.patronFecha)].filter(Boolean).length
    const confianza = piezas >= 2 ? 'alta' : piezas === 1 ? 'media' : 'baja'

    return {
      banco: regla.banco,
      tipo: regla.tipo,
      monto,
      moneda: detectarMoneda(todo),
      fecha,
      comercio,
      ultimos4: ultimos4 && ultimos4.length === 4 ? ultimos4 : undefined,
      confianza,
      reglaId: regla.id,
      extracto: cuerpo.slice(0, 400),
    }
  }

  return null
}

/**
 * Huella para descartar duplicados. Los bancos mandan a veces DOS correos por
 * la misma compra (autorizacion y luego liquidacion): sin esto, un consumo de
 * RD$2,450 entraria dos veces.
 */
export const huella = (m: Pick<MovimientoDetectado, 'banco' | 'monto' | 'fecha' | 'ultimos4'>) =>
  `${normalizar(m.banco)}|${m.monto.toFixed(2)}|${m.fecha}|${m.ultimos4 ?? ''}`

export function descartarDuplicados(movs: MovimientoDetectado[]): MovimientoDetectado[] {
  const vistos = new Set<string>()
  return movs.filter((m) => {
    const h = huella(m)
    if (vistos.has(h)) return false
    vistos.add(h)
    return true
  })
}
