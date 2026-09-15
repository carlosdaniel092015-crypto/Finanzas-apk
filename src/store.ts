import { create } from 'zustand'
import { repo } from '@/data/repo'
import {
  ESTADO_INICIAL, type EstadoFinanciero, type Gasto, type Ingreso,
} from '@/data/tipos'
import { totalMensual } from '@/engine/frecuencia'
import type { Deuda, Estrategia } from '@/engine/tipos'
import { aplicarMovimiento, hoyISO, type NuevoMovimiento } from '@/engine/movimientos'
import type { Moneda } from '@/lib/format'

interface Store extends EstadoFinanciero {
  cargando: boolean
  errorSync: string | null
  descartarError: () => void
  cargar: () => Promise<void>
  setMoneda: (moneda: Moneda) => void
  setNotificaciones: (activas: boolean) => void
  agregarIngreso: (ingreso: Omit<Ingreso, 'id'>) => void
  editarIngreso: (id: string, cambios: Partial<Ingreso>) => void
  eliminarIngreso: (id: string) => void
  agregarGasto: (gasto: Omit<Gasto, 'id'>) => void
  editarGasto: (id: string, cambios: Partial<Gasto>) => void
  eliminarGasto: (id: string) => void
  agregarDeuda: (deuda: Omit<Deuda, 'id'>) => void
  editarDeuda: (id: string, cambios: Partial<Deuda>) => void
  eliminarDeuda: (id: string) => void
  registrarMovimiento: (deudaId: string, mov: NuevoMovimiento) => void
  deshacerMovimiento: (movimientoId: string) => void
  setEstrategia: (e: Estrategia) => void
}

/** Escribir en cada tecla pegaria a la red sin razon; agrupamos. */
let temporizador: ReturnType<typeof setTimeout> | undefined
let onError: ((mensaje: string) => void) | undefined
function guardarDiferido(estado: EstadoFinanciero) {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    void repo
      .guardar(estado)
      .then(({ error }) => {
        if (error) onError?.(error)
      })
      .catch(() => {
        /* sin red: ya quedo la copia local */
      })
  }, 600)
}

export const useStore = create<Store>((set, get) => {
  const persistir = () => {
    const { moneda, ingresos, gastos, deudas, movimientos, estrategia, notificaciones } = get()
    guardarDiferido({ moneda, ingresos, gastos, deudas, movimientos, estrategia, notificaciones })
  }

  const mutar = (cambio: Partial<EstadoFinanciero>) => {
    set(cambio)
    persistir()
  }

  return {
    ...ESTADO_INICIAL,
    cargando: true,
    errorSync: null,

    descartarError: () => set({ errorSync: null }),

    async cargar() {
      onError = (mensaje) => set({ errorSync: mensaje })
      const { estado, error } = await repo.cargar()
      set({ ...(estado ?? ESTADO_INICIAL), cargando: false, errorSync: error ?? null })
    },

    setMoneda: (moneda) => mutar({ moneda }),
    setNotificaciones: (notificaciones) => mutar({ notificaciones }),

    agregarIngreso: (ingreso) =>
      mutar({ ingresos: [...get().ingresos, { ...ingreso, id: crypto.randomUUID() }] }),

    editarIngreso: (id, cambios) =>
      mutar({
        ingresos: get().ingresos.map((i) =>
          i.id === id ? { ...i, ...cambios, id, monto: Math.max(0, cambios.monto ?? i.monto) } : i,
        ),
      }),

    eliminarIngreso: (id) => mutar({ ingresos: get().ingresos.filter((i) => i.id !== id) }),

    agregarGasto: (gasto) =>
      mutar({ gastos: [...get().gastos, { ...gasto, id: crypto.randomUUID() }] }),

    editarGasto: (id, cambios) =>
      mutar({
        gastos: get().gastos.map((g) =>
          g.id === id ? { ...g, ...cambios, id, monto: Math.max(0, cambios.monto ?? g.monto) } : g,
        ),
      }),

    eliminarGasto: (id) => mutar({ gastos: get().gastos.filter((g) => g.id !== id) }),

    agregarDeuda: (deuda) =>
      mutar({
        deudas: [
          {
            ...deuda,
            id: crypto.randomUUID(),
            montoOriginal: deuda.montoOriginal ?? deuda.saldo,
            fechaRegistro: deuda.fechaRegistro ?? hoyISO(),
          },
          ...get().deudas,
        ],
      }),

    editarDeuda: (id, cambios) =>
      mutar({
        deudas: get().deudas.map((d) => (d.id === id ? { ...d, ...cambios, id } : d)),
      }),

    eliminarDeuda: (id) =>
      mutar({
        deudas: get().deudas.filter((d) => d.id !== id),
        // El historial de una deuda borrada no debe quedar huerfano.
        movimientos: get().movimientos.filter((m) => m.deudaId !== id),
      }),

    registrarMovimiento: (deudaId, mov) => {
      const actual = get().deudas.find((d) => d.id === deudaId)
      if (!actual) return
      const { deuda, movimiento } = aplicarMovimiento(actual, mov)
      mutar({
        deudas: get().deudas.map((d) => (d.id === deudaId ? deuda : d)),
        movimientos: [movimiento, ...get().movimientos],
      })
    },

    /**
     * Deshacer recalcula la deuda desde cero reaplicando el historial que queda.
     * Revertir "al reves" acumularia error de redondeo y dejaria saldos que no
     * cuadran con lo que muestra el historial.
     */
    deshacerMovimiento: (movimientoId) => {
      const mov = get().movimientos.find((m) => m.id === movimientoId)
      if (!mov) return
      const restantes = get().movimientos.filter((m) => m.id !== movimientoId)
      const deuda = get().deudas.find((d) => d.id === mov.deudaId)
      if (!deuda) return

      const delaDeuda = restantes
        .filter((m) => m.deudaId === deuda.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))

      const ultimo = delaDeuda.at(-1)
      const ultimoPago = [...delaDeuda].reverse().find((m) => m.tipo === 'pago')

      mutar({
        movimientos: restantes,
        deudas: get().deudas.map((d) =>
          d.id === deuda.id
            ? {
                ...d,
                saldo: ultimo?.saldoDespues ?? d.montoOriginal ?? d.saldo,
                fechaUltimoPago: ultimoPago?.fecha,
              }
            : d,
        ),
      })
    },

    setEstrategia: (estrategia) => mutar({ estrategia }),
  }
})

/**
 * Estado de interfaz, separado del financiero a proposito: no se persiste.
 * La tarjeta flotante de "dinero disponible" se esconde mientras hay un
 * formulario abierto, porque tapa justo donde aparecen los avisos de validacion.
 */
export const useUI = create<{ formAbierto: boolean; setFormAbierto: (v: boolean) => void }>(
  (set) => ({
    formAbierto: false,
    setFormAbierto: (formAbierto) => set({ formAbierto }),
  }),
)

/**
 * Ingresos − gastos, ambos llevados a su equivalente MENSUAL. Es el motor de
 * todo lo demas: lo que sobra aqui es lo que ataca las deudas.
 */
export function useFlujoCaja() {
  const ingresos = useStore((s) => s.ingresos)
  const gastos = useStore((s) => s.gastos)
  const ingreso = totalMensual(ingresos)
  const totalGastos = totalMensual(gastos)
  const disponible = Math.max(0, ingreso - totalGastos)
  const pctLibre = ingreso > 0 ? Math.max(0, Math.min(100, (disponible / ingreso) * 100)) : 0
  return { ingreso, totalGastos, disponible, pctLibre, pctGastos: 100 - pctLibre }
}
