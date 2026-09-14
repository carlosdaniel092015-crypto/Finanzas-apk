# Finanzas APK — App de finanzas personales y plan de salida de deudas

App móvil (APK instalable en Android) + web, para registrar ingresos/gastos, llevar el
inventario completo de deudas (tarjetas, préstamos, vehículo, hipoteca) y servicios
recurrentes (alquiler, CAASD, electricidad, gas, internet, streaming), y generar un
**plan inteligente de salida de deudas** con recordatorios de pago.

Moneda base: **DOP** (multimoneda soportada). Pensada para República Dominicana.

---

## 1. Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  UI diseñada en Google Stitch → exportada a HTML/Figma       │
│  → convertida a componentes React + Tailwind                 │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │   App: Vite + React 18 + TypeScript   │
        │   Tailwind + shadcn/ui + Recharts     │
        │   TanStack Query + Zustand            │
        └───────┬───────────────────────┬───────┘
                │                       │
      ┌─────────▼─────────┐   ┌─────────▼──────────────────┐
      │  VERCEL (web/PWA) │   │  CAPACITOR → APK firmado   │
      │  deploy en push   │   │  build en GitHub Actions   │
      └─────────┬─────────┘   └─────────┬──────────────────┘
                │                       │
                └───────────┬───────────┘
                            │
            ┌───────────────▼────────────────┐
            │          SUPABASE              │
            │  Postgres + RLS (1 fila = 1    │
            │  usuario), Auth, Storage,      │
            │  Edge Functions, pg_cron       │
            └────────────────────────────────┘
```

### Por qué esta pila

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Vite SPA** (no Next.js) | Next.js | Capacitor necesita un bundle 100% estático. Todo el backend lo pone Supabase, así que no hace falta servidor Node. Menos fricción. |
| **Capacitor** | React Native / Expo | Un solo código corre en Vercel (web) y dentro del APK. Stitch exporta HTML/CSS → encaja directo en React web, no en RN. |
| **APK real** | Solo PWA | Pediste instalable. Capacitor produce un `.apk` firmado descargable desde GitHub Releases. La versión web queda igual en Vercel como PWA. |
| **Notificaciones locales** | Push (Firebase) | Los recordatorios de pago son fechas conocidas: se programan en el dispositivo. Cero infraestructura, funciona sin internet. Push queda como fase 2. |
| **Lógica de deudas en TypeScript puro** | Todo con IA | El cálculo debe ser **determinista y auditable** (intereses, amortización). La IA solo explica el plan y sugiere recortes; nunca calcula el dinero. |

---

## 2. Módulos

| # | Módulo | Contenido |
|---|---|---|
| 01 | **Inicio / Dashboard** | Patrimonio neto, flujo del mes, semáforo de deuda, próximos vencimientos, "fecha libre de deudas". |
| 02 | **Ingresos** | Salario, quincenas, freelance, alquileres cobrados, extras. Fijos y variables. |
| 03 | **Gastos** | Registro rápido, categorías, adjuntar foto del recibo, presupuesto por categoría. |
| 04 | **Servicios y recurrentes** | Alquiler, CAASD (agua), electricidad (EDE), gas, internet, teléfono, streaming, seguros, gym. Con día de vencimiento y monto estimado. |
| 05 | **Deudas** | Módulo separado: tarjetas de crédito, préstamos personales, préstamo de vehículo, hipoteca, línea de crédito, préstamos informales. Cada una con tasa (fija/variable), plazo restante, cuota, día de pago. |
| 06 | **Plan de salida** | Motor de simulación: avalancha, bola de nieve, híbrido y personalizado. Comparador, cronograma mes a mes, interés ahorrado. |
| 07 | **Recordatorios** | Calendario de pagos + notificaciones locales (X días antes, el día, y si se venció). |
| 08 | **Reportes** | Tendencias, gasto por categoría, evolución de la deuda total, cumplimiento del plan. |
| 09 | **Ajustes** | Moneda, día de corte del mes, respaldo/exportación CSV, seguridad (PIN/biometría). |

---

## 3. El motor del plan de salida (lo importante)

Archivo: `src/engine/` — funciones **puras**, sin red, 100% testeadas.

### 3.1 Capacidad de pago
```
Ingresos netos del mes
  − gastos recurrentes fijos (alquiler, servicios, streaming…)
  − promedio de gastos variables (últimos 3 meses)
  − aporte al fondo de emergencia
  − suma de pagos mínimos de todas las deudas
= EXCEDENTE mensual de ataque
```

### 3.2 Simulación mes a mes
Para cada mes, por cada deuda:
```
interés  = saldo × (tasa_anual_vigente / 12)
mínimo   = cuota fija  ó  max(pct × saldo, piso)      // tarjetas
saldo    = saldo + interés − pago
```
- Se pagan **todos los mínimos**, y el **excedente completo** va a la deuda objetivo.
- Cuando una deuda muere, su cuota se suma al excedente → efecto bola de nieve real.
- **Tasa variable**: se proyecta en 3 escenarios (base, +2 pp, +4 pp) y se marca en la UI cuál deuda es sensible a subidas.
- **Tasa fija**: se respeta hasta el fin del plazo; si hay período fijo y luego variable, se modela el cambio en la fecha de revisión.

### 3.3 Estrategias comparadas
| Estrategia | Orden de ataque | Gana en |
|---|---|---|
| **Avalancha** | Mayor tasa efectiva primero | Menos interés total (matemáticamente óptima) |
| **Bola de nieve** | Menor saldo primero | Victorias rápidas, motivación |
| **Híbrida** | 70% tasa + 30% saldo | Equilibrio |
| **Personalizada** | El orden que tú definas | Deudas con presión social/legal |

La app muestra las 4 lado a lado: **fecha libre de deudas**, **interés total**, **interés ahorrado vs. pagar solo mínimos**.

### 3.4 Alertas que el motor levanta solo
- Tarjeta con utilización > 30% (y > 70% = crítico).
- Deuda que **nunca se paga** con el mínimo actual (el interés supera el abono).
- Tasa por encima del promedio de tu cartera → candidata #1.
- Cuotas > 40% de tus ingresos (nivel de endeudamiento peligroso).
- Sin fondo de emergencia mínimo (1 mes de gastos) → se recomienda antes de acelerar deuda.

### 3.5 Capa "inteligente" (IA)
Edge Function `asesor` en Supabase. Recibe el resumen financiero + el plan **ya calculado** y devuelve:
1. Explicación del plan en lenguaje llano.
2. 3 recortes concretos con impacto medido sobre tus gastos reales
   (ej: *"Cancelar 2 de 4 streamings = RD$1,150/mes = 2 meses menos de deuda y RD$8,400 menos de interés"*).
3. Respuestas a preguntas tipo *"¿me conviene refinanciar la tarjeta con un préstamo al 18%?"*.

La API key vive **solo** en Supabase Secrets, nunca en el APK.

---

## 4. Fases de entrega

| Fase | Entregable | Depende de |
|---|---|---|
| **0** | Repo, esquema SQL, RLS, CI, deploy vacío en Vercel | Accesos (§ `docs/ACCESOS.md`) |
| **1** | Auth + Ingresos + Gastos + Categorías + Dashboard básico | Diseños Stitch de esas pantallas |
| **2** | Módulo Deudas completo + Servicios recurrentes | Diseños Stitch |
| **3** | Motor del plan + comparador + cronograma | — (es lógica pura, se puede hacer en paralelo) |
| **4** | Recordatorios + notificaciones locales | — |
| **5** | Build del APK firmado en GitHub Actions + Release | Keystore |
| **6** | Reportes, exportación CSV, PIN/biometría, capa IA | Opcional |

---

## 5. Costos
Todo entra en capa gratuita: Vercel Hobby, Supabase Free (500 MB DB, 1 GB storage),
GitHub Actions (2.000 min/mes, el build de APK toma ~5 min). La IA es lo único con
costo por uso, y es opcional.

---

## Documentos
- **`docs/ACCESOS.md`** — qué necesito de ti para arrancar.
- **`docs/ESQUEMA.sql`** — base de datos completa con RLS, lista para pegar en Supabase.
- **`docs/STITCH_PROMPTS.md`** — los prompts exactos para Google Stitch, pantalla por pantalla.
