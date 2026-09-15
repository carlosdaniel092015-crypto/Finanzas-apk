import { describe, expect, it } from 'vitest'
import {
  deudaAFila, esUuid, filasRecurrentes, FRECUENCIAS_VALIDAS, gastoAFila, idValido,
  ingresoAFila, mensajeDeError, TIPOS_DEUDA_VALIDOS,
} from './filas'
import {
  ESTADO_INICIAL, ETIQUETA_GASTO, ETIQUETA_INGRESO, migrarEstado,
  type CategoriaGasto, type EstadoFinanciero, type TipoIngreso,
} from './tipos'
import { FRECUENCIAS } from '@/engine/frecuencia'
import type { Deuda, TipoDeuda } from '@/engine/tipos'

const USER = '11111111-2222-3333-4444-555555555555'
const uuid = () => crypto.randomUUID()

describe('idValido', () => {
  it('deja pasar un uuid', () => {
    const id = uuid()
    expect(idValido(id)).toBe(id)
  })

  it('reemplaza un id que NO es uuid', () => {
    // Un id como "migrado-gasto-0" contra una columna uuid revienta el INSERT
    // entero y la sincronizacion falla completa, no solo esa fila.
    const nuevo = idValido('migrado-gasto-0')
    expect(nuevo).not.toBe('migrado-gasto-0')
    expect(esUuid(nuevo)).toBe(true)
  })
})

describe('lo que se escribe cabe en lo que la base acepta', () => {
  // Estos tests recorren TODOS los valores posibles, no ejemplos: el bug que
  // rompio la sincronizacion fue escribir 'vivienda' en un enum que solo
  // aceptaba 'alquiler', 'agua', 'electricidad'...

  it('toda frecuencia de la app es un valor valido del enum', () => {
    for (const f of FRECUENCIAS) {
      expect(FRECUENCIAS_VALIDAS).toContain(f)
    }
  })

  it('todo tipo de ingreso produce una fila escribible', () => {
    for (const tipo of Object.keys(ETIQUETA_INGRESO) as TipoIngreso[]) {
      const fila = ingresoAFila(
        { id: uuid(), descripcion: 'X', tipo, monto: 100, frecuencia: 'mensual' },
        USER,
      )
      expect(esUuid(fila.id)).toBe(true)
      expect(fila.tipo).toBe('ingreso')
      expect(fila.categoria).toBe(tipo)
      expect(FRECUENCIAS_VALIDAS).toContain(fila.frecuencia as never)
    }
  })

  it('toda categoria de gasto produce una fila escribible', () => {
    for (const categoria of Object.keys(ETIQUETA_GASTO) as CategoriaGasto[]) {
      const fila = gastoAFila(
        { id: uuid(), descripcion: 'X', categoria, monto: 100, frecuencia: 'anual' },
        USER,
      )
      expect(esUuid(fila.id)).toBe(true)
      expect(fila.tipo).toBe('gasto')
      expect(fila.categoria).toBe(categoria)
    }
  })

  it('todo tipo de deuda es un valor valido del enum', () => {
    for (const tipo of TIPOS_DEUDA_VALIDOS) {
      const d: Deuda = {
        id: uuid(), nombre: 'X', tipo: tipo as TipoDeuda, saldo: 1000,
        tasaAnual: 30, tipoTasa: 'variable', cuotaMensual: 500,
      }
      const fila = deudaAFila(d, USER)
      expect(TIPOS_DEUDA_VALIDOS).toContain(fila.tipo as never)
      expect(esUuid(fila.id)).toBe(true)
    }
  })

  it('los campos vacios van como null, no como undefined', () => {
    // undefined desaparece del JSON y la columna conserva su valor anterior;
    // null sí la limpia. Borrar el dia de pago tiene que borrarlo de verdad.
    const fila = deudaAFila(
      { id: uuid(), nombre: 'X', tipo: 'tarjeta', saldo: 1000, tasaAnual: 30,
        tipoTasa: 'fija', cuotaMensual: 500 },
      USER,
    )
    expect(fila.dia_pago).toBeNull()
    expect(fila.ultimos4).toBeNull()
    expect(fila.fecha_fin_estimada).toBeNull()
    expect(Object.values(fila).every((v) => v !== undefined)).toBe(true)
  })
})

describe('filasRecurrentes', () => {
  const estado = (p: Partial<EstadoFinanciero>): EstadoFinanciero => ({ ...ESTADO_INICIAL, ...p })

  it('junta ingresos y gastos en una sola tanda', () => {
    const filas = filasRecurrentes(
      estado({
        ingresos: [{ id: uuid(), descripcion: 'Sueldo', tipo: 'sueldo', monto: 42000, frecuencia: 'quincenal' }],
        gastos: [{ id: uuid(), descripcion: 'Alquiler', categoria: 'vivienda', monto: 25000, frecuencia: 'mensual' }],
      }),
      USER,
    )
    expect(filas).toHaveLength(2)
    expect(filas.filter((f) => f.tipo === 'ingreso')).toHaveLength(1)
    expect(filas.filter((f) => f.tipo === 'gasto')).toHaveLength(1)
  })

  it('descarta los renglones sin descripcion', () => {
    // El boton "Agregar" crea un renglon vacio que se edita en el sitio; si se
    // abandona no debe viajar a la base con nombre en blanco.
    const filas = filasRecurrentes(
      estado({
        ingresos: [
          { id: uuid(), descripcion: '', tipo: 'sueldo', monto: 0, frecuencia: 'mensual' },
          { id: uuid(), descripcion: 'Sueldo', tipo: 'sueldo', monto: 100, frecuencia: 'mensual' },
        ],
      }),
      USER,
    )
    expect(filas).toHaveLength(1)
  })

  it('todos los ids salen como uuid aunque vengan de la migracion vieja', () => {
    const migrado = migrarEstado({
      ingresoMensual: 95000,
      gastosFijos: [{ nombre: 'Alquiler', icono: 'home', monto: 25000 }],
    })
    const filas = filasRecurrentes(migrado, USER)
    expect(filas).toHaveLength(2)
    expect(filas.every((f) => esUuid(f.id))).toBe(true)
  })

  it('cada fila lleva el user_id: sin el, el RLS la rechaza', () => {
    const filas = filasRecurrentes(
      estado({ gastos: [{ id: uuid(), descripcion: 'Luz', categoria: 'servicios', monto: 4200, frecuencia: 'mensual' }] }),
      USER,
    )
    expect(filas.every((f) => f.user_id === USER)).toBe(true)
  })
})

describe('mensajeDeError', () => {
  it('traduce el ON CONFLICT a la migracion que falta', () => {
    expect(
      mensajeDeError({
        message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification',
      }),
    ).toMatch(/migraci[oó]n/i)
  })

  it('traduce tabla inexistente', () => {
    expect(mensajeDeError({ message: 'relation "deudas" does not exist', code: '42P01' }))
      .toMatch(/ESQUEMA\.sql/)
  })

  it('traduce columna inexistente', () => {
    expect(mensajeDeError({ message: "Could not find the 'categoria' column", code: '42703' }))
      .toMatch(/migraciones/)
  })

  it('traduce enum invalido', () => {
    expect(mensajeDeError({ message: 'invalid input value for enum tipo_servicio: "vivienda"', code: '22P02' }))
      .toMatch(/migraciones/)
  })

  it('la falta de red no se presenta como error de datos', () => {
    expect(mensajeDeError({ message: 'Failed to fetch' })).toMatch(/Sin conexión/)
  })

  it('un error desconocido se muestra tal cual, no se traga', () => {
    expect(mensajeDeError({ message: 'algo raro' })).toContain('algo raro')
  })
})
