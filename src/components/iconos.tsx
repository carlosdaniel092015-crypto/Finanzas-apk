import {
  Banknote, Briefcase, Car, CircleDollarSign, CreditCard, Droplets, Flame, Fuel,
  Gift, GraduationCap, HeartPulse, Home, Landmark, Percent, Receipt, Shield,
  ShoppingBag, Smartphone, Store, Tv, Wifi, Zap, type LucideIcon,
} from 'lucide-react'
import type { TipoDeuda } from '@/engine/tipos'

const MAPA: Record<string, LucideIcon> = {
  home: Home, zap: Zap, droplets: Droplets, flame: Flame, fuel: Fuel,
  smartphone: Smartphone, tv: Tv, wifi: Wifi, 'credit-card': CreditCard,
  landmark: Landmark, car: Car, 'shopping-bag': ShoppingBag, receipt: Receipt,
  banknote: Banknote,
  gift: Gift, percent: Percent, briefcase: Briefcase, store: Store,
  'circle-dollar': CircleDollarSign, 'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap, shield: Shield,
}

export function Icono({ nombre, className }: { nombre: string; className?: string }) {
  const Cmp = MAPA[nombre] ?? Receipt
  return <Cmp className={className} />
}

export const ICONO_POR_TIPO: Record<TipoDeuda, string> = {
  tarjeta: 'credit-card',
  prestamo_personal: 'landmark',
  prestamo_vehiculo: 'car',
  hipoteca: 'home',
  linea_credito: 'banknote',
  prestamo_informal: 'receipt',
  otro: 'receipt',
}

export const ETIQUETA_TIPO: Record<TipoDeuda, string> = {
  tarjeta: 'Tarjeta de crédito',
  prestamo_personal: 'Préstamo personal',
  prestamo_vehiculo: 'Préstamo de vehículo',
  hipoteca: 'Hipoteca',
  linea_credito: 'Línea de crédito',
  prestamo_informal: 'Préstamo informal',
  otro: 'Otra deuda',
}
