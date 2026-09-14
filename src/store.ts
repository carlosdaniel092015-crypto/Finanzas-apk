import { create } from 'zustand'
import { repo } from '@/data/repo'
import { ESTADO_INICIAL, type EstadoFinanciero, type GastoFijo } from '@/data/tipos'
import type { Deuda, Estrategia } from '@/engine/tipos'
import type { Moneda } from '@/lib/format'

interface Store extends EstadoFinanciero {
  cargando: boolean
  errorSync: string | null
  descartarError: () => void
  cargar: () => Promise<void>
  setIngreso: (monto: number) => void
  setMoneda: (moneda: Moneda) => void
  setGasto: (id: string, monto: number) => void
  agregarGasto: (gasto: Omit<GastoFijo, 'id'>) => void
  eliminarGasto: (id: string) => void
  agregarDeuda: (deuda: Omit<Deuda, 'id'>) => void
  eliminarDeuda: (id: string) => void
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
    const { moneda, ingresoMensual, gastosFijos, deudas, estrategia } = get()
    guardarDiferido({ moneda, ingresoMensual, gastosFijos, deudas, estrategia })
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

    setIngreso: (ingresoMensual) => mutar({ ingresoMensual: Math.max(0, ingresoMensual) }),
    setMoneda: (moneda) => mutar({ moneda }),

    setGasto: (id, monto) =>
      mutar({
        gastosFijos: get().gastosFijos.map((g) =>
          g.id === id ? { ...g, monto: Math.max(0, monto) } : g,
        ),
      }),

    agregarGasto: (gasto) =>
      mutar({
        gastosFijos: [...get().gastosFijos, { ...gasto, id: crypto.randomUUID() }],
      }),

    eliminarGasto: (id) =>
      mutar({ gastosFijos: get().gastosFijos.filter((g) => g.id !== id) }),

    agregarDeuda: (deuda) =>
      mutar({ deudas: [{ ...deuda, id: crypto.randomUUID() }, ...get().deudas] }),

    eliminarDeuda: (id) => mutar({ deudas: get().deudas.filter((d) => d.id !== id) }),

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

/** Ingresos − gastos fijos. Es el motor de todo lo demas. */
export function useFlujoCaja() {
  const ingreso = useStore((s) => s.ingresoMensual)
  const gastos = useStore((s) => s.gastosFijos)
  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0)
  const disponible = Math.max(0, ingreso - totalGastos)
  const pctLibre = ingreso > 0 ? Math.max(0, Math.min(100, (disponible / ingreso) * 100)) : 0
  return { ingreso, totalGastos, disponible, pctLibre, pctGastos: 100 - pctLibre }
}
