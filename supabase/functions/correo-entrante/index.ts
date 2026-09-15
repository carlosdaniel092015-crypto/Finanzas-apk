/**
 * Recibe una notificacion bancaria reenviada y la deja PROPUESTA en la bandeja.
 *
 * Nunca mueve un saldo: escribe en movimientos_detectados, que la persona
 * confirma de un toque desde la app. Un correo puede ser un duplicado, una
 * compra declinada o un reverso.
 *
 * Desplegar:  supabase functions deploy correo-entrante --no-verify-jwt
 * Secretos:   supabase secrets set INBOUND_SECRET=...
 *
 * --no-verify-jwt es necesario porque quien llama es el servicio de correo
 * entrante, no un usuario con sesion. La autenticacion es el header secreto
 * MAS el token del buzon, que va en la propia direccion de destino.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { detectarMovimiento, huella, type CorreoEntrante, type ReglaCorreo } from './correo.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const INBOUND_SECRET = Deno.env.get('INBOUND_SECRET') ?? ''

/** Comparacion en tiempo constante: un == filtra el secreto por temporizacion. */
function secretoValido(recibido: string): boolean {
  if (!INBOUND_SECRET || recibido.length !== INBOUND_SECRET.length) return false
  let dif = 0
  for (let i = 0; i < INBOUND_SECRET.length; i++) {
    dif |= INBOUND_SECRET.charCodeAt(i) ^ recibido.charCodeAt(i)
  }
  return dif === 0
}

/** Normaliza el cuerpo de los distintos servicios de correo entrante. */
function normalizarCarga(c: Record<string, unknown>): {
  de: string; para: string; asunto: string; texto: string
} {
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  const primero = (...vs: unknown[]) => vs.map(s).find((v) => v.length > 0) ?? ''

  const para = primero(c.to, c.To, c.recipient, c.envelope && (c.envelope as any).to)
  return {
    de: primero(c.from, c.From, c.sender),
    para: Array.isArray(para) ? s(para[0]) : para,
    asunto: primero(c.subject, c.Subject, c['Subject']),
    // Preferimos texto plano; si solo hay HTML, se le quitan las etiquetas.
    texto:
      primero(c.text, c.TextBody, c['body-plain'], c.plain) ||
      quitarHtml(primero(c.html, c.HtmlBody, c['body-html'])),
  }
}

function quitarHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** El token del buzon va en la parte local del destino: <token>@dominio */
const tokenDe = (para: string) => (para.match(/([A-Za-z0-9_-]{16,})@/)?.[1] ?? '').trim()

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!secretoValido(req.headers.get('x-inbound-secret') ?? '')) {
    return new Response('No autorizado', { status: 401 })
  }

  let carga: Record<string, unknown>
  try {
    const ct = req.headers.get('content-type') ?? ''
    carga = ct.includes('application/json')
      ? await req.json()
      : Object.fromEntries(await req.formData())
  } catch {
    return new Response('Cuerpo ilegible', { status: 400 })
  }

  const correo = normalizarCarga(carga)
  const token = tokenDe(correo.para)
  if (!token) return new Response('Sin token de buzón', { status: 400 })

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: buzon } = await db
    .from('buzones')
    .select('user_id')
    .eq('token', token)
    .eq('activo', true)
    .maybeSingle()

  // Un token desconocido se responde 200 a proposito: un 404 le confirmaria a
  // quien esté probando direcciones cuáles existen.
  if (!buzon) return new Response(JSON.stringify({ ok: true }), { status: 200 })

  const { data: reglas } = await db
    .from('reglas_correo')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${buzon.user_id}`)
    .eq('activa', true)
    .order('prioridad', { ascending: true })

  const entrante: CorreoEntrante = {
    de: correo.de,
    asunto: correo.asunto,
    texto: correo.texto,
    recibidoEn: new Date().toISOString().slice(0, 10),
  }

  const mov = detectarMovimiento(
    entrante,
    (reglas ?? []).map(
      (r): ReglaCorreo => ({
        id: r.id,
        banco: r.banco,
        remitentes: r.remitentes,
        asuntoContiene: r.asunto_contiene ?? undefined,
        tipo: r.tipo,
        patronMonto: r.patron_monto,
        patronFecha: r.patron_fecha ?? undefined,
        patronComercio: r.patron_comercio ?? undefined,
        patronTarjeta: r.patron_tarjeta ?? undefined,
        patronesExcluir: r.patrones_excluir ?? undefined,
        activa: r.activa,
      }),
    ),
  )

  await db.from('buzones').update({ ultimo_uso: new Date().toISOString() }).eq('token', token)

  if (!mov) {
    // No se reconocio: se responde 200 para que el servicio no reintente en
    // bucle. Muchos correos del banco no son movimientos (promociones, avisos).
    return new Response(JSON.stringify({ ok: true, detectado: false }), { status: 200 })
  }

  // Casar con la tarjeta por los ultimos 4 digitos. Si no se puede, queda sin
  // asignar y la persona elige al confirmar.
  let deudaId: string | null = null
  if (mov.ultimos4) {
    const { data: deuda } = await db
      .from('deudas')
      .select('id')
      .eq('user_id', buzon.user_id)
      .eq('ultimos4', mov.ultimos4)
      .eq('estado', 'activa')
      .maybeSingle()
    deudaId = deuda?.id ?? null
  }

  // upsert por (user_id, huella): el segundo correo de la misma compra no
  // crea una segunda propuesta.
  const { error } = await db.from('movimientos_detectados').upsert(
    {
      user_id: buzon.user_id,
      deuda_id: deudaId,
      banco: mov.banco,
      tipo: mov.tipo,
      monto: mov.monto,
      moneda: mov.moneda,
      fecha: mov.fecha,
      comercio: mov.comercio ?? null,
      ultimos4: mov.ultimos4 ?? null,
      confianza: mov.confianza,
      regla_id: mov.reglaId,
      huella: huella(mov),
      extracto: mov.extracto,
    },
    { onConflict: 'user_id,huella', ignoreDuplicates: true },
  )

  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ ok: true, detectado: true, banco: mov.banco }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})
