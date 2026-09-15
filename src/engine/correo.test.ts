import { describe, expect, it } from 'vitest'
import {
  coincideRemitente, descartarDuplicados, detectarMovimiento, huella,
  parsearFecha, parsearMonto, type CorreoEntrante, type ReglaCorreo,
} from './correo'
import { REGLAS_SEMILLA } from './reglasBanco'

describe('parsearMonto', () => {
  it('formato dominicano: coma miles, punto decimal', () => {
    expect(parsearMonto('RD$2,450.00')).toBe(2450)
    expect(parsearMonto('RD$ 1,234.56')).toBe(1234.56)
    expect(parsearMonto('12,500')).toBe(12500)
  })

  it('formato europeo: punto miles, coma decimal', () => {
    expect(parsearMonto('2.450,00')).toBe(2450)
    expect(parsearMonto('1.234,56')).toBe(1234.56)
  })

  it('el caso peligroso: "1.234" son mil doscientos, no uno con doscientos', () => {
    // Tres digitos despues del separador = miles. Leerlo como decimal
    // metería un error de mil veces en el saldo sin que nadie lo note.
    expect(parsearMonto('1.234')).toBe(1234)
    expect(parsearMonto('1,234')).toBe(1234)
  })

  it('pero "1.23" sí es decimal', () => {
    expect(parsearMonto('1.23')).toBe(1.23)
    expect(parsearMonto('1,2')).toBe(1.2)
  })

  it('millones con doble separador', () => {
    expect(parsearMonto('1,234,567.89')).toBe(1234567.89)
    expect(parsearMonto('1.234.567,89')).toBe(1234567.89)
  })

  it('sin decimales ni separadores', () => {
    expect(parsearMonto('50000')).toBe(50000)
    expect(parsearMonto('US$ 120')).toBe(120)
  })

  it('devuelve null con basura, no cero', () => {
    // Un cero se guardaria como movimiento valido de RD$0. null no.
    expect(parsearMonto('')).toBeNull()
    expect(parsearMonto('no hay monto')).toBeNull()
    expect(parsearMonto('RD$')).toBeNull()
  })
})

describe('parsearFecha', () => {
  const hoy = '2026-09-15'

  it('DD/MM/AAAA como se escribe en RD, no al reves', () => {
    // 05/09 es 5 de septiembre. Un parser gringo lo leeria como 9 de mayo.
    expect(parsearFecha('05/09/2026', hoy)).toBe('2026-09-05')
    expect(parsearFecha('14/09/2026', hoy)).toBe('2026-09-14')
  })

  it('acepta guiones y año de dos digitos', () => {
    expect(parsearFecha('14-09-2026', hoy)).toBe('2026-09-14')
    expect(parsearFecha('14/09/26', hoy)).toBe('2026-09-14')
  })

  it('acepta ISO', () => {
    expect(parsearFecha('2026-09-14', hoy)).toBe('2026-09-14')
  })

  it('acepta mes escrito', () => {
    expect(parsearFecha('14 de septiembre de 2026', hoy)).toBe('2026-09-14')
    expect(parsearFecha('14-sep-2026', hoy)).toBe('2026-09-14')
    expect(parsearFecha('2 de enero de 2027', hoy)).toBe('2027-01-02')
  })

  it('si no entiende, usa la fecha de recepcion en vez de inventar', () => {
    expect(parsearFecha('', hoy)).toBe(hoy)
    expect(parsearFecha('ayer por la tarde', hoy)).toBe(hoy)
    expect(parsearFecha('45/99/2026', hoy)).toBe(hoy)
  })
})

describe('coincideRemitente', () => {
  const regla = { remitentes: ['bhd.com.do', 'notificaciones@bhd'] } as ReglaCorreo

  it('casa por dominio', () => {
    expect(coincideRemitente(regla, 'Notificaciones BHD <alertas@bhd.com.do>')).toBe(true)
  })

  it('no casa con otro banco', () => {
    expect(coincideRemitente(regla, 'alertas@banreservas.com')).toBe(false)
  })

  it('ignora mayusculas', () => {
    expect(coincideRemitente(regla, 'ALERTAS@BHD.COM.DO')).toBe(true)
  })
})

describe('detectarMovimiento', () => {
  const correo = (p: Partial<CorreoEntrante>): CorreoEntrante => ({
    de: 'notificaciones@bhd.com.do',
    asunto: 'Notificación de consumo',
    texto: '',
    recibidoEn: '2026-09-15',
    ...p,
  })

  it('extrae un consumo de tarjeta completo', () => {
    const m = detectarMovimiento(
      correo({
        texto: 'Estimado cliente, se realizó un consumo por RD$2,450.00 en SUPERMERCADO NACIONAL el 14/09/2026 con su tarjeta terminada en 1234.',
      }),
      REGLAS_SEMILLA,
    )
    expect(m).not.toBeNull()
    expect(m!.monto).toBe(2450)
    expect(m!.moneda).toBe('DOP')
    expect(m!.fecha).toBe('2026-09-14')
    expect(m!.ultimos4).toBe('1234')
    expect(m!.tipo).toBe('consumo')
    expect(m!.confianza).toBe('alta')
  })

  it('detecta dolares', () => {
    const m = detectarMovimiento(
      correo({ texto: 'Consumo por US$120.50 en AMAZON el 14/09/2026 tarjeta terminada en 9876' }),
      REGLAS_SEMILLA,
    )
    expect(m!.moneda).toBe('USD')
    expect(m!.monto).toBe(120.5)
  })

  it('IGNORA una transaccion declinada', () => {
    const m = detectarMovimiento(
      correo({
        asunto: 'Transacción declinada',
        texto: 'Su transacción por RD$2,450.00 fue declinada por fondos insuficientes.',
      }),
      REGLAS_SEMILLA,
    )
    expect(m).toBeNull()
  })

  it('IGNORA un reverso', () => {
    const m = detectarMovimiento(
      correo({ texto: 'Se ha procesado un reverso por RD$2,450.00 en su tarjeta terminada en 1234' }),
      REGLAS_SEMILLA,
    )
    expect(m).toBeNull()
  })

  it('devuelve null si el remitente no es de ningun banco conocido', () => {
    const m = detectarMovimiento(
      correo({ de: 'promociones@tienda.com', texto: 'Oferta de RD$2,450.00' }),
      REGLAS_SEMILLA,
    )
    expect(m).toBeNull()
  })

  it('devuelve null si no hay monto: mejor nada que un movimiento inventado', () => {
    const m = detectarMovimiento(
      correo({ texto: 'Su estado de cuenta ya está disponible en la banca en línea.' }),
      REGLAS_SEMILLA,
    )
    expect(m).toBeNull()
  })

  it('sin fecha en el cuerpo, usa la de recepcion', () => {
    const m = detectarMovimiento(
      correo({ texto: 'Consumo por RD$800.00 en COLMADO tarjeta terminada en 1234' }),
      REGLAS_SEMILLA,
    )
    expect(m!.fecha).toBe('2026-09-15')
  })

  it('baja la confianza cuando faltan piezas', () => {
    const m = detectarMovimiento(
      correo({ texto: 'Consumo por RD$800.00 realizado.' }),
      REGLAS_SEMILLA,
    )
    expect(m!.confianza).toBe('baja')
  })

  it('un patron roto en la base de datos no tumba la ingesta', () => {
    const rota: ReglaCorreo = {
      id: 'rota', banco: 'X', remitentes: ['bhd.com.do'], tipo: 'consumo',
      patronMonto: 'RD\\$([\\d,.]+)', patronComercio: '([unclosed', activa: true,
    }
    const m = detectarMovimiento(correo({ texto: 'Consumo RD$500.00' }), [rota])
    expect(m).not.toBeNull()
    expect(m!.monto).toBe(500)
    expect(m!.comercio).toBeUndefined()
  })

  it('una regla desactivada no aplica', () => {
    const apagadas = REGLAS_SEMILLA.map((r) => ({ ...r, activa: false }))
    expect(detectarMovimiento(correo({ texto: 'Consumo por RD$800.00' }), apagadas)).toBeNull()
  })

  it('reconoce un pago recibido, no solo consumos', () => {
    const m = detectarMovimiento(
      correo({
        asunto: 'Pago recibido',
        texto: 'Hemos recibido su pago por RD$5,000.00 el 14/09/2026 a su tarjeta terminada en 1234.',
      }),
      REGLAS_SEMILLA,
    )
    expect(m!.tipo).toBe('pago')
    expect(m!.monto).toBe(5000)
  })
})

describe('duplicados', () => {
  const base = { banco: 'BHD', monto: 2450, fecha: '2026-09-14', ultimos4: '1234' }

  it('misma compra = misma huella', () => {
    expect(huella(base)).toBe(huella({ ...base }))
  })

  it('distinto monto = distinta huella', () => {
    expect(huella(base)).not.toBe(huella({ ...base, monto: 2451 }))
  })

  it('descarta el segundo correo de la misma compra', () => {
    // Los bancos mandan a veces autorizacion y luego liquidacion.
    const movs = [
      { ...base, tipo: 'consumo', moneda: 'DOP', confianza: 'alta', reglaId: 'r', extracto: '' },
      { ...base, tipo: 'consumo', moneda: 'DOP', confianza: 'alta', reglaId: 'r', extracto: '' },
      { ...base, monto: 300, tipo: 'consumo', moneda: 'DOP', confianza: 'alta', reglaId: 'r', extracto: '' },
    ] as Parameters<typeof descartarDuplicados>[0]
    expect(descartarDuplicados(movs)).toHaveLength(2)
  })
})
