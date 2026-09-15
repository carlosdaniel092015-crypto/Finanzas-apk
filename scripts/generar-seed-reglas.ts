/**
 * Genera el INSERT de las reglas semilla desde reglasBanco.ts, para que el SQL
 * y el codigo no se separen. Se regenera con:  npm run seed:reglas
 */
import { writeFileSync } from 'node:fs'
import { REGLAS_SEMILLA } from '../src/engine/reglasBanco'

const q = (s: string) => `'${s.replace(/'/g, "''")}'`
const arr = (a?: string[]) => (a?.length ? `array[${a.map(q).join(',')}]` : 'null')

const filas = REGLAS_SEMILLA.map(
  (r, i) =>
    `  (${q(r.id)}, null, ${q(r.banco)}, ${arr(r.remitentes)}, ${arr(r.asuntoContiene)}, ` +
    `${q(r.tipo)}::tipo_movimiento_deuda, ${q(r.patronMonto)}, ${q(r.patronFecha ?? '')} , ` +
    `${r.patronComercio ? q(r.patronComercio) : 'null'}, ${r.patronTarjeta ? q(r.patronTarjeta) : 'null'}, ` +
    `${arr(r.patronesExcluir)}, true, ${i})`,
).join(',\n')

const sql = `-- ============================================================================
--  Migracion 004 — reglas semilla de los bancos dominicanos
--
--  GENERADO por scripts/generar-seed-reglas.ts — no editar a mano.
--  Regenerar con:  npm run seed:reglas
--
--  AVISO: estos patrones estan escritos a partir de la redaccion HABITUAL de
--  una notificacion bancaria, no de correos reales de cada banco. Trátalos
--  como punto de partida: corre "npm run probar:correo" con un correo de
--  verdad y ajusta el patron que falle. Se corrigen con un UPDATE aqui, sin
--  recompilar ni publicar un APK nuevo.
--
--  Requiere la migracion 003.
-- ============================================================================

insert into reglas_correo
  (id, user_id, banco, remitentes, asunto_contiene, tipo, patron_monto, patron_fecha,
   patron_comercio, patron_tarjeta, patrones_excluir, activa, prioridad)
values
${filas}
on conflict (id) do update set
  remitentes       = excluded.remitentes,
  asunto_contiene  = excluded.asunto_contiene,
  patron_monto     = excluded.patron_monto,
  patron_fecha     = excluded.patron_fecha,
  patron_comercio  = excluded.patron_comercio,
  patron_tarjeta   = excluded.patron_tarjeta,
  patrones_excluir = excluded.patrones_excluir,
  actualizado_en   = now()
-- Solo se pisan las reglas COMUNES: si ya corregiste una regla tuya, se respeta.
where reglas_correo.user_id is null;
`

writeFileSync('docs/migraciones/004_reglas_semilla.sql', sql)
console.log(`✓ docs/migraciones/004_reglas_semilla.sql — ${REGLAS_SEMILLA.length} reglas`)
