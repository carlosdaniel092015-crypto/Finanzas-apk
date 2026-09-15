/**
 * Prueba las reglas de extraccion contra un correo REAL de tu banco.
 *
 *   npm run probar:correo -- correos/bhd-consumo.txt
 *
 * El archivo es el correo pegado tal cual. Si trae lineas "De:" y "Asunto:"
 * al inicio las usa como cabeceras; si no, todo se trata como cuerpo.
 *
 * NO toca la base de datos ni envia nada: solo te dice que entiende, para
 * poder corregir el patron antes de confiar en el.
 */
import { readFileSync } from 'node:fs'
import { detectarMovimiento, type CorreoEntrante } from '../src/engine/correo'
import { REGLAS_SEMILLA } from '../src/engine/reglasBanco'

const archivo = process.argv[2]
if (!archivo) {
  console.error('Uso: npm run probar:correo -- <archivo-con-el-correo.txt>')
  process.exit(1)
}

const crudo = readFileSync(archivo, 'utf8')

const leerCabecera = (etiquetas: string[]) => {
  for (const linea of crudo.split('\n').slice(0, 25)) {
    for (const e of etiquetas) {
      const m = linea.match(new RegExp(`^\\s*${e}\\s*:\\s*(.+)$`, 'i'))
      if (m) return m[1].trim()
    }
  }
  return ''
}

const correo: CorreoEntrante = {
  de: leerCabecera(['de', 'from', 'remitente']),
  asunto: leerCabecera(['asunto', 'subject']),
  texto: crudo,
  recibidoEn: new Date().toISOString().slice(0, 10),
}

console.log('\n─── Lo que leí del correo ───')
console.log('  De     :', correo.de || '(no encontré cabecera "De:")')
console.log('  Asunto :', correo.asunto || '(no encontré cabecera "Asunto:")')
console.log('  Cuerpo :', crudo.length, 'caracteres')

const m = detectarMovimiento(correo, REGLAS_SEMILLA)

if (!m) {
  console.log('\n✗ NINGUNA REGLA EXTRAJO NADA\n')
  console.log('Causas posibles, en orden de probabilidad:')
  if (!correo.de) {
    console.log('  1. El archivo no trae una línea "De:" — sin remitente ninguna regla puede casar.')
  } else {
    const bancos = [...new Set(REGLAS_SEMILLA.map((r) => `${r.banco} (${r.remitentes.join(', ')})`))]
    console.log(`  1. El remitente "${correo.de}" no coincide con ningún banco conocido:`)
    bancos.forEach((b) => console.log(`       - ${b}`))
  }
  console.log('  2. El asunto no contiene ninguna palabra esperada (consumo, compra, pago, cargo...).')
  console.log('  3. El patrón del monto no encaja con cómo lo escribe este banco.')
  console.log('  4. El correo cayó en un patrón de exclusión (declinada, reverso, anulada).')
  console.log('\nPégame el correo y te ajusto la regla.\n')
  process.exit(1)
}

console.log('\n✓ MOVIMIENTO DETECTADO\n')
const fila = (k: string, v: unknown, aviso?: string) =>
  console.log(`  ${k.padEnd(10)} ${v ?? '—'}${aviso ? `   ← ${aviso}` : ''}`)

fila('Banco', m.banco)
fila('Tipo', m.tipo)
fila('Monto', `${m.moneda} ${m.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
fila('Fecha', m.fecha, m.fecha === correo.recibidoEn ? 'usó la fecha de HOY, no la encontró en el correo' : undefined)
fila('Comercio', m.comercio, m.comercio ? undefined : 'no extraído')
fila('Tarjeta', m.ultimos4 ? `···${m.ultimos4}` : undefined, m.ultimos4 ? undefined : 'no extraída: no se podrá casar sola con la deuda')
fila('Confianza', m.confianza)
fila('Regla', m.reglaId)

console.log('\n─── Revisa esto antes de confiar en la regla ───')
const problemas: string[] = []
if (m.fecha === correo.recibidoEn) problemas.push('La fecha no se extrajo del correo.')
if (!m.ultimos4) problemas.push('Sin los últimos 4 dígitos hay que elegir la tarjeta a mano cada vez.')
if (!m.comercio && m.tipo === 'consumo') problemas.push('Sin comercio, el movimiento queda sin descripción.')
if (m.confianza !== 'alta') problemas.push(`Confianza ${m.confianza}: faltan piezas.`)

if (problemas.length === 0) {
  console.log('  Todo extraído. Esta regla sirve tal cual.\n')
} else {
  problemas.forEach((p) => console.log(`  • ${p}`))
  console.log('\n  Pégame el correo y ajusto el patrón.\n')
}
