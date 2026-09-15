# Leer los movimientos desde el correo del banco

## Por qué así y no conectando al banco

**No existe la vía directa.** La banca abierta en RD sigue en fase de desarrollo de
reglamento: la Superintendencia de Bancos, Adofintech y el Hub de Innovación Financiera
van por el III Foro de Open Banking, todavía levantando información del sector. Ningún
banco dominicano (BHD, Banreservas, Popular, Qik, Santa Cruz, Promerica) expone una API
para que una app de terceros lea tu cuenta. Los agregadores tampoco llegan: **Prometeo**
cubre 10 países de LatAm y RD está solo en planes de expansión; **Belvo** solo México,
Brasil y Colombia.

Si algún servicio ofrece "conectar tu banco dominicano", casi seguro hace scraping
pidiéndote tu usuario y clave del internet banking. **No lo uses.** Viola los términos
del banco, te deja sin cobertura ante un fraude, y guardar esa clave en una base de datos
es exactamente lo que no debe existir.

Lo que sí existe: **el banco ya te manda un correo por cada consumo y cada pago.** Ese
correo es la fuente de datos.

## El diseño: reenvío, no acceso a tu bandeja

```
Banco  ──correo──▶  Tu Gmail
                       │  (filtro: solo los del banco)
                       ▼
            <token>@tudominio.com          ← servicio de correo entrante
                       │  (webhook)
                       ▼
        Edge Function "correo-entrante"    ← parsea y guarda como PROPUESTA
                       │
                       ▼
            movimientos_detectados         ← bandeja pendiente de confirmar
                       │  (un toque en la app)
                       ▼
            deuda_movimientos              ← esto sí mueve el saldo
```

**La app nunca accede a tu bandeja.** Solo ve lo que tú reenvías. Si mañana alguien
compromete la base de datos, no hay un token que le abra tu correo completo. Y nunca
pasa por la revisión de Google: conectar Gmail con OAuth exigiría verificación con
auditoría **CASA Tier 2** para salir de modo prueba (máximo 100 usuarios sin ella).

**La app propone, no aplica.** Un correo puede ser un duplicado (los bancos mandan a
veces autorización y liquidación por la misma compra), una transacción declinada o un
reverso. Si eso entrara solo al saldo, quedaría corrompido y no te enterarías hasta no
cuadrar con el banco.

---

## Montaje

### 1. Las migraciones

En Supabase → SQL Editor, en orden:

```
docs/migraciones/003_correo_entrante.sql
docs/migraciones/004_reglas_semilla.sql
```

### 2. Un dominio

Necesitas uno para recibir correo (~US$12/año en Namecheap, Cloudflare o Porkbun).
Puede ser cualquiera; los correos llegarían a algo como `a7f3k9x2m4p8@tudominio.com`.

### 3. Servicio de correo entrante

Cualquiera de estos sirve y todos tienen capa gratuita:

| Servicio | Nota |
|---|---|
| **Cloudflare Email Routing** | Gratis e ilimitado si el dominio está en Cloudflare. El más simple. |
| **Mailgun** | Tiene subdominio sandbox para probar sin dominio propio. |
| **Postmark** | Inbound gratis, muy fiable. |
| **Resend** | Inbound en su plan gratuito. |

Configuras los registros MX que te indique el servicio y apuntas el webhook a:

```
https://sqskqdahlbgzjorpmmxe.supabase.co/functions/v1/correo-entrante
```

con la cabecera `x-inbound-secret: <el secreto que generes>`.

### 4. Desplegar la función

```bash
supabase secrets set INBOUND_SECRET="$(openssl rand -hex 32)"
supabase functions deploy correo-entrante --no-verify-jwt
```

`--no-verify-jwt` es necesario: quien llama es el servicio de correo, no un usuario con
sesión. La autenticación es el header secreto **más** el token del buzón, que va en la
propia dirección de destino.

### 5. Tu buzón

```sql
insert into buzones (user_id, token)
values (auth.uid(), encode(gen_random_bytes(12), 'hex'));

select token from buzones where user_id = auth.uid();
```

Tu dirección es `<ese token>@tudominio.com`.

### 6. El filtro en Gmail

Ajustes → Filtros → Crear filtro:

- **De:** `bhd.com.do OR banreservas.com OR popularenlinea.com OR qik.com.do OR bancosantacruz.com.do OR promerica.com.do`
- Acción: **Reenviar a** tu dirección del buzón

Gmail pide verificar la dirección de reenvío una vez. Reenvía **solo** lo que casa con
ese filtro: el resto de tu correo nunca sale de tu bandeja.

### 7. Los últimos 4 dígitos

En cada tarjeta dentro de la app, llena **Últimos 4 dígitos**. Es lo que hace que un
correo se asigne solo a la tarjeta correcta. Sin eso funciona igual, pero eliges la
deuda a mano cada vez.

---

## Los patrones son un punto de partida

Las reglas de `004_reglas_semilla.sql` están escritas a partir de la redacción **habitual**
de una notificación bancaria, no de correos reales de cada banco. Hasta que no se prueben
con un correo de verdad, trátalas como borrador.

Para verificar uno real, guárdalo en un archivo de texto (con sus líneas `De:` y `Asunto:`)
y corre:

```bash
npm run probar:correo -- correos/bhd-consumo.txt
```

Te dice exactamente qué extrajo y qué no:

```
✓ MOVIMIENTO DETECTADO
  Banco      BHD
  Tipo       consumo
  Monto      DOP 2,450.00
  Fecha      2026-09-14
  Comercio   SUPERMERCADO NACIONAL
  Tarjeta    ···1234
  Confianza  alta
```

Si algo sale mal, el patrón se corrige con un `UPDATE` sobre `reglas_correo` — **sin
recompilar ni publicar un APK nuevo**. Por eso las reglas viven en la base de datos: los
bancos cambian sus plantillas sin avisar.

## Dos cosas que el parser cuida a propósito

**El monto.** `"1.234"` son mil doscientos treinta y cuatro, no uno con doscientos. La
regla: el último separador manda, y solo es decimal si le siguen 1 o 2 dígitos hasta el
final. Equivocarse ahí mete un error de mil veces en el saldo sin que nadie lo note.

**La fecha.** En RD se escribe `05/09/2026` para el 5 de septiembre. Un parser hecho en
EE.UU. lo leería como 9 de mayo. Aquí el día va primero, siempre. Si no logra entender la
fecha, usa la de recepción en vez de inventar una.
