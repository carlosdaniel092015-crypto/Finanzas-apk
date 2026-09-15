#!/usr/bin/env node
/**
 * La Edge Function corre en Deno y no puede importar del bundle de la app, asi
 * que tiene su propia copia del parser. Esto la regenera desde el original,
 * para que no se separen en silencio: un parser distinto en el servidor que en
 * la app significa que lo que se prueba no es lo que se ejecuta.
 *
 *   npm run sync:correo
 */
import { readFileSync, writeFileSync } from 'node:fs'

const ORIGEN = 'src/engine/correo.ts'
const DESTINO = 'supabase/functions/correo-entrante/correo.ts'

const cabecera = `// GENERADO por scripts/sync-correo.mjs desde ${ORIGEN} — no editar a mano.
// La Edge Function corre en Deno y no puede importar del bundle de la app.
export type TipoMovimiento = 'pago' | 'consumo' | 'reenganche' | 'ajuste'
`

const fuente = readFileSync(ORIGEN, 'utf8').replace(
  /^import type \{ TipoMovimiento \} from '\.\/tipos'$/m,
  cabecera.trimEnd(),
)

writeFileSync(DESTINO, fuente)
console.log(`✓ ${DESTINO} regenerado desde ${ORIGEN}`)
