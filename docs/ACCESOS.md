# Lo que necesito de ti para arrancar

Ordenado por lo que bloquea más. **Nada de esto requiere que me des tu contraseña personal
de ninguna cuenta.** Todo son tokens revocables o valores públicos.

---

## 🟥 BLOQUEA LA FASE 0 — sin esto no puedo empezar

### 1. Supabase
Crea el proyecto (5 min): https://supabase.com → New project
- Nombre: `finanzas-apk`
- Región: **East US (North Virginia)** — la más cercana a RD
- Guarda bien la contraseña de la base de datos

Después pásame:

| Dato | Dónde sale | ¿Sensible? |
|---|---|---|
| `SUPABASE_URL` | Settings → API → Project URL | 🟢 No, es público |
| `SUPABASE_ANON_KEY` | Settings → API → anon/public | 🟢 No, va en la app (RLS protege) |
| `Project ref` | El código en la URL, ej. `abcdxyz123` | 🟢 No |

Y **una de estas dos** (elige la que te dé más confianza):

- **Opción A (más control tuyo):** tú corres el SQL. Abres SQL Editor, pegas
  `docs/ESQUEMA.sql` completo y le das Run. No me das nada más. Yo te paso cada
  migración como archivo y tú la aplicas.
- **Opción B (más rápido):** me das un **Personal Access Token** de Supabase
  (Account → Access Tokens → Generate new token). Con eso aplico migraciones y
  despliego las Edge Functions solo con el CLI. Lo puedes revocar cuando quieras.

> ⚠️ **NO me pases la `service_role` key.** No hace falta para nada de esto y
> salta todas las reglas de seguridad.

**Configura también el login** en Authentication → Providers:
- Email/Password: ✅ activado
- Google: opcional, pero recomendado (más cómodo en Android)
- Site URL: la URL de Vercel cuando la tengamos
- Redirect URLs: agrega `finanzasapk://auth` (para el APK)

---

### 2. GitHub
✅ Ya tengo acceso al repo `carlosdaniel092015-crypto/finanzas-apk` y estoy
trabajando en la rama `claude/finance-debt-plan-app-myxkwo`.

Solo necesito que **confirmes** que puedo crear los GitHub Secrets, o si prefieres
crearlos tú (Settings → Secrets and variables → Actions):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
ANDROID_KEYSTORE_BASE64      ← ver punto 4
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

---

### 3. Vercel
La forma más simple, **sin darme ningún token**:
1. Entra a https://vercel.com → Add New → Project
2. Importa el repo `finanzas-apk`
3. Framework: **Vite** · Build: `npm run build` · Output: `dist`
4. En Environment Variables pon `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
5. Deploy

Me pasas la URL final (`https://finanzas-apk.vercel.app` o el dominio tuyo).

> Si prefieres que yo maneje los deploys, necesitaría un `VERCEL_TOKEN`
> (Settings → Tokens). **No es necesario** — con el auto-deploy de GitHub basta.

---

## 🟨 BLOQUEA LA FASE 5 — el APK firmado

### 4. Keystore de firma de Android
Android no instala un APK sin firma. Hay dos caminos:

- **Tú lo generas** (recomendado, la llave nunca sale de tu máquina):
  ```bash
  keytool -genkey -v -keystore finanzas.keystore -alias finanzas \
          -keyalg RSA -keysize 2048 -validity 10000
  ```
  Luego: `base64 -w0 finanzas.keystore > keystore.txt` y **tú mismo** pegas ese
  contenido en el secret `ANDROID_KEYSTORE_BASE64`. A mí solo me dices "ya está".

- **Yo lo genero** en el CI y te entrego el archivo. Más cómodo, menos privado.

> 🔐 **Guarda el keystore y sus contraseñas en un lugar seguro.** Si lo pierdes,
> no puedes publicar actualizaciones de la misma app: Android las rechaza.

---

## 🟩 OPCIONAL — mejoran la app pero no bloquean

### 5. Google Stitch (el frontend)
Stitch necesita **tu cuenta de Google**, yo no puedo entrar por ti. El flujo es:

1. Entras a https://stitch.withgoogle.com
2. Copias y pegas los prompts de **`docs/STITCH_PROMPTS.md`** (uno por pantalla)
3. Ajustas lo que no te guste directo en Stitch
4. Me pasas, por cada pantalla, **una de estas**:
   - El **código exportado** (botón Copy code / Export → HTML+CSS) ← lo mejor
   - El link de **Export to Figma**
   - O simplemente **capturas de pantalla** ← con esto también trabajo bien

Yo convierto eso a componentes React + Tailwind reutilizables, conectados a Supabase.

> Si no quieres pasar por Stitch, te armo la UI directamente con shadcn/ui y queda
> bien igual. Stitch te da más control sobre el look.

### 6. Capa de IA (el asesor que explica el plan)
Una API key de Anthropic (https://console.anthropic.com) para la Edge Function
`asesor`. Va en **Supabase Secrets**, nunca en el APK. Si no la das, la app
funciona completa: solo pierdes las explicaciones en lenguaje natural y las
sugerencias de recorte. El cálculo del plan **no depende de la IA**.

### 7. Recordatorios por correo (además de los del teléfono)
Una API key de Resend (https://resend.com, gratis hasta 3.000 correos/mes).
Las notificaciones del teléfono funcionan sin esto.

---

## 📋 Datos tuyos para configurar la app (no son accesos)

Para que el motor calcule bien desde el día uno:

- **Moneda:** ¿DOP solamente, o también manejas USD?
- **Día de corte de tu mes:** ¿día 1, o el día que te pagan? (ej. día 25)
- **Ingresos:** ¿mensual, quincenal, variable?
- **Fondo de emergencia:** ¿quieres que el plan reserve algo antes de atacar las
  deudas? (recomiendo: 1 mes de gastos primero, luego a full contra las deudas)
- **Tus deudas actuales** (esto lo puedes cargar tú en la app, pero si me pasas
  un ejemplo real aunque sea con montos cambiados, puedo probar el motor de verdad):
  por cada una → tipo, acreedor, saldo, tasa, si es fija o variable, cuota, día de pago,
  meses restantes; y en tarjetas → límite y % de pago mínimo.

---

## ✅ Resumen: el mínimo para que yo arranque hoy

```
1. SUPABASE_URL          → me lo pasas
2. SUPABASE_ANON_KEY     → me lo pasas
3. Corriste ESQUEMA.sql  → me dices "listo"
4. Repo GitHub           → ya lo tengo ✅
```

Con esos 3 datos levanto Fase 0 + 1 + 3 (motor del plan) sin esperar nada más.
