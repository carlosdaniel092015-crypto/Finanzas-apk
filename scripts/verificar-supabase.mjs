#!/usr/bin/env node
/**
 * Comprueba contra el proyecto real que el esquema este aplicado y que el RLS
 * este activo. Se corre con:  npm run verificar:supabase
 *
 * Lee .env (o las variables del entorno). No escribe nada en la base.
 */
import { readFileSync } from 'node:fs'

function leerEnv() {
  const env = { ...process.env }
  for (const archivo of ['.env.production', '.env']) {
    try {
      for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
        const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
        if (m && !env[m[1]]) env[m[1]] = m[2].trim()
      }
    } catch {
      /* el archivo puede no existir */
    }
  }
  return env
}

const env = leerEnv()
const URL_BASE = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY

if (!URL_BASE || !KEY) {
  console.error('✗ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY (mira .env.example)')
  process.exit(1)
}

// La anon key nunca debe ser la service_role: esa salta el RLS y no puede
// viajar en el bundle de la app.
try {
  const payload = JSON.parse(Buffer.from(KEY.split('.')[1], 'base64url').toString())
  if (payload.role !== 'anon') {
    console.error(`✗ PELIGRO: la clave configurada tiene rol "${payload.role}", no "anon".`)
    console.error('  Una service_role en el frontend expone TODOS los datos. Cámbiala ya.')
    process.exit(1)
  }
  console.log(`✓ Clave con rol "anon" · proyecto ${payload.ref}`)
} catch {
  console.error('✗ La clave no parece un JWT de Supabase válido')
  process.exit(1)
}

const cabeceras = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const TABLAS = [
  'perfiles', 'categorias', 'cuentas', 'deudas', 'deuda_tasas', 'movimientos',
  'recurrentes', 'pagos_deuda', 'planes', 'plan_detalle', 'recordatorios',
  'presupuestos', 'metas',
]

console.log(`\nProbando ${URL_BASE}\n`)

let fallos = 0

// 1. ¿Responde Auth?
try {
  const r = await fetch(`${URL_BASE}/auth/v1/settings`, { headers: cabeceras })
  if (r.ok) {
    const s = await r.json()
    console.log(`✓ Auth responde · email habilitado: ${s.external?.email ?? 'n/d'}`)
  } else {
    console.error(`✗ Auth respondió HTTP ${r.status}`)
    console.error(
      r.status === 403 || r.status === 407
        ? '  Un 403 aquí casi siempre es la red (proxy/firewall), no Supabase.\n' +
          '  Corre este comando desde tu máquina, fuera de una red corporativa.'
        : '  Revisa que la URL y la anon key correspondan al mismo proyecto.',
    )
    process.exit(1)
  }
} catch (e) {
  console.error(`✗ No se pudo contactar el proyecto: ${e.message}`)
  process.exit(1)
}

// 2. Tablas + RLS. Sin sesión, una tabla con RLS bien puesto devuelve [].
//    Si devuelve filas, el RLS NO está protegiendo esa tabla.
console.log('\nTablas del esquema:')
for (const tabla of TABLAS) {
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?select=*&limit=1`, { headers: cabeceras })
    const cuerpo = await r.text()

    if (r.status === 404 || cuerpo.includes('42P01') || cuerpo.includes('Could not find the table')) {
      console.log(`  ✗ ${tabla.padEnd(14)} NO EXISTE — falta correr docs/ESQUEMA.sql`)
      fallos++
    } else if (r.ok && cuerpo.trim() === '[]') {
      console.log(`  ✓ ${tabla.padEnd(14)} existe · RLS bloquea al anónimo`)
    } else if (r.ok) {
      console.log(`  ⚠ ${tabla.padEnd(14)} DEVUELVE DATOS SIN LOGIN — revisa el RLS de esta tabla`)
      fallos++
    } else {
      // 401/403 tambien significa que el RLS esta haciendo su trabajo
      console.log(`  ✓ ${tabla.padEnd(14)} existe · acceso denegado (HTTP ${r.status})`)
    }
  } catch (e) {
    console.log(`  ✗ ${tabla.padEnd(14)} error de red: ${e.message}`)
    fallos++
  }
}

console.log(
  fallos === 0
    ? '\n✓ Todo en orden. La app puede sincronizar.'
    : `\n✗ ${fallos} problema(s). Corre docs/ESQUEMA.sql en el SQL Editor de Supabase y vuelve a probar.`,
)
process.exit(fallos === 0 ? 0 : 1)
