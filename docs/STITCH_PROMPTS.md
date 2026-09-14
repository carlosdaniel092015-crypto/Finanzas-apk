# Prompts para Google Stitch

https://stitch.withgoogle.com → pega **un prompt por pantalla**, en orden.
Están en inglés (Stitch responde mejor) pero **todo el texto de la interfaz va en
español**, tal cual lo pide cada prompt.

---

## 0. Primero: fija el sistema de diseño

Pega esto **una sola vez** al inicio del proyecto en Stitch. Todas las pantallas
siguientes heredan este estilo:

```
Create a mobile app design system for a personal finance and debt-payoff app
called "Finanzas". Target: Android phone, 390x844.

Style: modern fintech, clean, calm, high contrast, generous whitespace, soft
rounded cards (16px radius), subtle elevation, no gradients on text.
Dark mode as the primary theme, with a light theme variant.

Colors:
- Background dark #0E1116, surface #171B22, elevated surface #1F242D
- Primary / accent: teal #14B8A6
- Positive (income, progress): green #22C55E
- Negative (expense, debt): coral red #F43F5E
- Warning (due soon): amber #F59E0B
- Text primary #F2F5F9, secondary #9AA4B2

Typography: Inter. Numbers in tabular figures. Money amounts are the loudest
element on every screen.

Navigation: bottom tab bar with 5 items, Spanish labels and outline icons:
"Inicio" (home), "Movimientos" (arrows), "Deudas" (credit card),
"Plan" (target), "Ajustes" (gear). Center a floating "+" action button above
the bar for quick entry.

All currency shown as "RD$ 12,450.00". All interface text in Spanish.
```

---

## 1. Login / Registro

```
Design the sign-in screen. Centered app logo (a simple teal shield with an
upward arrow) and the name "Finanzas". Tagline in Spanish: "Tus finanzas claras.
Tu salida de deudas, con fecha."
Fields: "Correo", "Contraseña" with show/hide eye icon. Primary full-width
button "Entrar". Secondary outline button with Google logo: "Continuar con Google".
Text links: "¿Olvidaste tu contraseña?" and "Crear cuenta".
Below, three tiny reassurance items in a row with icons: "Cifrado", "Tus datos
son solo tuyos", "Funciona sin internet".
```

---

## 2. Inicio (Dashboard)

```
Design the home dashboard screen.

Top: greeting "Hola, Carlos" and a bell icon with a red dot badge.

Hero card (large, teal accent border): label "Deuda total", amount
"RD$ 487,200.00" in very large tabular numbers, and below it a highlighted line:
"Libre de deudas: Mar 2028 · faltan 30 meses". A thin horizontal progress bar
showing 22% paid, with the label "22% pagado".

Row of two compact cards:
- "Ingresos del mes" RD$ 95,000 in green with a small up arrow
- "Gastos del mes" RD$ 71,400 in coral with a small down arrow

Card "Disponible para atacar deuda": RD$ 12,600 with a small teal donut chart.

Section "Próximos pagos" — a vertical list of 4 rows, each with a colored
leading icon, name, due date and amount, and a right-side chip:
- "Tarjeta Popular" · "Vence en 2 días" · RD$ 8,500 · amber chip "Pronto"
- "Préstamo vehículo" · "Vence el 15" · RD$ 18,900 · neutral chip
- "EdeEste (luz)" · "Vence el 18" · RD$ 4,200 · neutral chip
- "CAASD (agua)" · "Vencido hace 1 día" · RD$ 850 · red chip "Vencido"

Section "Salud financiera" — three small metric tiles in a row:
"Endeudamiento 38%" (amber), "Uso de tarjetas 61%" (amber),
"Fondo de emergencia 0.4 meses" (red).

Bottom tab bar with "Inicio" active. Floating "+" button.
```

---

## 3. Registro rápido (bottom sheet)

```
Design a bottom sheet for adding a transaction, sliding over a dimmed dashboard.
At the top, a two-option segmented control: "Gasto" (selected, coral) and
"Ingreso" (green).
A very large numeric amount display "RD$ 0.00" with a custom numeric keypad
below it (digits, a decimal point, and a backspace key).
Above the keypad, a horizontally scrollable row of category chips with emoji
icons: "Comida", "Transporte", "Servicios", "Salud", "Hogar", "Ocio",
"Pago de deuda".
Compact rows for: "Cuenta" (shows "Banco Popular"), "Fecha" (shows "Hoy"),
"Nota" (placeholder "Opcional"), and "Adjuntar recibo" with a camera icon.
Full-width primary button "Guardar".
```

---

## 4. Movimientos (ingresos y gastos)

```
Design the transactions list screen.
Header "Movimientos" with a month selector "Septiembre 2026" (chevrons on both
sides), a search icon, and a filter icon.
A summary strip with three values: "Ingresos RD$ 95,000" (green),
"Gastos RD$ 71,400" (coral), "Balance +RD$ 23,600" (teal).
A horizontal bar chart showing spending by category, top 5 categories, each bar
labeled with the category name and amount.
Below, transactions grouped by day with sticky date headers ("Hoy",
"Ayer", "12 de septiembre"). Each row: circular category icon, title, small
subtitle with the account name, and the amount right-aligned (coral for
expenses, green for income). Show 8 example rows with realistic Dominican
context: "Supermercado Nacional", "Gasolina", "Pago tarjeta Popular",
"Salario quincena", "Netflix", "Uber".
Swipe-to-delete revealed on one row.
```

---

## 5. Servicios y pagos recurrentes

```
Design a screen titled "Servicios y recurrentes".
Top summary card: "Total fijo mensual" RD$ 42,300, with a subtitle "11 servicios
activos".
Two filter tabs: "Gastos fijos" (active) and "Ingresos fijos".
A list of service cards, each showing: provider logo placeholder circle, name,
category label, the amount, the due day ("Día 15"), and a small badge "Fijo" or
"Variable" for amounts that change monthly.
Items to show: "Alquiler RD$ 25,000 · Día 1 · Fijo", "EdeEste (electricidad)
RD$ 4,200 · Día 18 · Variable", "CAASD (agua) RD$ 850 · Día 20 · Variable",
"Gas RD$ 1,600 · Variable", "Claro internet RD$ 2,400 · Día 5 · Fijo",
"Netflix RD$ 690 · Día 8", "Spotify RD$ 460 · Día 8",
"HBO Max RD$ 550 · Día 12", "Seguro vehículo RD$ 3,100 · Día 22".
On the streaming items, group them under a small collapsible header
"Streaming · RD$ 1,700/mes" with a subtle teal hint text:
"Podrías liberar RD$ 1,700 al mes".
Floating "+" button labeled "Agregar servicio".
```

---

## 6. Deudas (lista)

```
Design the debts module main screen, titled "Deudas".

Top card: "Deuda total" RD$ 487,200 with a stacked horizontal bar broken into
segments by debt type, and a legend below: "Tarjetas 31%", "Vehículo 42%",
"Personal 27%".
Second line inside the card: "Tasa promedio 21.4% · Cuotas RD$ 34,700/mes".

Filter chips: "Todas", "Tarjetas", "Préstamos", "En mora".

A list of debt cards. Each card contains:
- Left: type icon in a colored circle
- Name and creditor ("Tarjeta Visa · Banco Popular")
- The outstanding balance in large numbers
- A thin progress bar showing how much is paid off, with "%" label
- A row of three tiny stats: "Tasa 34.9% Fija", "Cuota RD$ 8,500", "Día 5"
- A right-edge colored status strip: green (al día), amber (vence pronto),
  red (en mora)
- On cards with variable rates, show the tag "Variable" in amber next to the rate

Show 5 cards: "Tarjeta Visa · Banco Popular" RD$ 92,400 / 34.9% fija;
"Tarjeta BHD" RD$ 58,900 / 32.5% variable; "Préstamo vehículo · Banreservas"
RD$ 205,000 / 14.2% fija; "Préstamo personal · Asociación Popular" RD$ 118,000 /
18.9% variable; "Préstamo familiar" RD$ 12,900 / 0%.

Floating "+" button "Agregar deuda".
```

---

## 7. Detalle de deuda — tarjeta de crédito

```
Design the credit card debt detail screen for "Tarjeta Visa · Banco Popular".

Hero: a credit-card-shaped card showing the balance RD$ 92,400, the credit limit
RD$ 150,000, and a utilization ring at 61% colored amber, with the caption
"Uso del crédito 61% · lo ideal es menos de 30%".

A row of four key stats in small boxes: "Tasa 34.9% Fija", "Pago mínimo
RD$ 4,620 (5%)", "Corte día 28", "Pago día 5".

A warning banner in amber: "Pagando solo el mínimo, esta tarjeta te tomaría
9 años y 2 meses y RD$ 118,400 en intereses."
Right under it, a teal contrast line: "Con el plan: 14 meses y RD$ 19,700 en
intereses."

A line chart showing the balance trend over the last 6 months.

Section "Movimientos de la deuda" listing payments with date, amount, and a
split of "capital / interés" per payment.

Two bottom buttons side by side: outline "Editar" and filled "Registrar pago".
```

---

## 8. Detalle de deuda — préstamo

```
Design the loan detail screen for "Préstamo vehículo · Banreservas".
Hero card: remaining balance RD$ 205,000, original amount RD$ 420,000, and a
progress bar "51% pagado · 34 de 60 cuotas".
Stats grid (2x3): "Tasa 14.2%", "Tipo: Fija", "Cuota RD$ 18,900",
"Restan 26 meses", "Termina Nov 2028", "Pagado a capital RD$ 215,000".
A stacked area chart titled "Capital vs interés por cuota" showing how the
interest portion shrinks over time.
A collapsible "Tabla de amortización" section previewing 4 rows with columns:
"Cuota", "Fecha", "Capital", "Interés", "Saldo".
An informational teal card: "Si abonas RD$ 5,000 extra al mes, terminas 7 meses
antes y ahorras RD$ 24,100 en intereses." with a button "Simular abono".
```

---

## 9. Agregar / editar deuda (formulario)

```
Design a multi-step form screen titled "Nueva deuda", with a 3-dot step
indicator at the top.

Step 1 shown: "Tipo de deuda" as a 2-column grid of selectable tiles with icons
and Spanish labels: "Tarjeta de crédito", "Préstamo personal",
"Préstamo de vehículo", "Hipoteca", "Línea de crédito", "Préstamo informal".
"Tarjeta de crédito" is selected with a teal border.

Below, the fields for that type:
"Nombre de la deuda", "Acreedor / banco", "Saldo actual", "Límite de crédito",
"Tasa de interés anual (%)".

Then a highlighted sub-block titled "Tipo de tasa" with a segmented control:
"Fija" | "Variable" | "Mixta". With "Variable" selected, reveal three extra
fields: "Índice de referencia", "Puntos sobre el índice", and
"Se revisa cada (meses)", plus an amber helper text: "Con tasa variable el plan
se calcula en 3 escenarios."

Then: "Pago mínimo (%)", "Día de corte", "Día de pago".
A toggle row: "Recordarme antes del pago" with a stepper "3 días antes".

Sticky bottom bar with "Atrás" (outline) and "Siguiente" (filled).
```

---

## 10. Plan de salida de deudas ⭐ (la pantalla clave)

```
Design the debt-payoff plan screen, titled "Tu plan de salida".

Hero block on a deep teal surface: a big label "Libre de deudas", a huge date
"Marzo 2028", and below it "30 meses · Ahorras RD$ 84,300 en intereses".
Under it a horizontal timeline with 5 milestone dots, each labeled with a debt
name and the month it disappears: "Préstamo familiar · Nov 2026",
"Tarjeta BHD · Abr 2027", "Tarjeta Popular · Ago 2027",
"Préstamo personal · Jun 2028", "Vehículo · Mar 2028". Completed ones filled
teal, future ones outlined.

Card "Tu capacidad de pago" showing a small waterfall breakdown:
"Ingresos RD$ 95,000" → "− Gastos fijos RD$ 42,300" → "− Gastos variables
RD$ 29,100" → "− Pagos mínimos RD$ 11,000" → "= Para atacar deuda RD$ 12,600"
with a slider below labeled "Ajustar aporte mensual" currently at RD$ 12,600.

Section "Estrategia" — a horizontally scrollable set of 3 comparison cards.
Each card shows the strategy name, a one-line explanation in Spanish, the
payoff date, total interest, and a "Elegir" button. The selected one has a teal
border and a "Recomendada" badge:
- "Avalancha" · "Ataca primero la tasa más alta" · Mar 2028 · RD$ 96,100 ·
  badge "Recomendada · ahorras más"
- "Bola de nieve" · "Ataca primero la deuda más pequeña" · Jun 2028 ·
  RD$ 108,400 · "Más motivadora"
- "Híbrida" · "Equilibra tasa y tamaño" · Abr 2028 · RD$ 99,800

Section "Orden de ataque" — a numbered vertical list of the debts in priority
order, each row draggable (show a drag handle), with the debt name, rate, and
the monthly amount assigned to it. Row 1 is highlighted teal with the tag
"Objetivo actual".

Section "Recomendaciones" — 3 insight cards with a small sparkle icon:
- "Cancela 2 de 4 streamings → adelantas tu salida 2 meses"
- "Tu tarjeta BHD tiene tasa variable: si sube 2 puntos, tu plan se atrasa
  1 mes"
- "Antes de acelerar, arma RD$ 71,000 de fondo de emergencia (1 mes de gastos)"

Bottom buttons: outline "Ver mes a mes" and filled "Activar este plan".
```

---

## 11. Cronograma mes a mes

```
Design the plan schedule screen, titled "Mes a mes".
A sticky month navigator at the top: "Mes 1 · Octubre 2026" with chevrons and a
compact scrollable month strip.
A summary line: "Pagas RD$ 47,300 · Capital RD$ 38,100 · Interés RD$ 9,200".
A table-like list, one row per debt, each showing: debt name, the assigned
payment, and two small values underneath "capital" and "interés", plus the
"Saldo final". The current target debt row has a teal left border and a small
"Objetivo" tag.
Below the table, a stacked bar chart titled "Evolución de la deuda total"
covering 30 months, descending to zero, with a teal marker at the final bar
labeled "Libre".
A small footer note: "Proyección con tasas actuales. Las deudas a tasa variable
pueden mover esta fecha."
```

---

## 12. Recordatorios

```
Design the reminders screen, titled "Recordatorios".
Top: a compact month calendar where days with payments due have a small colored
dot underneath (red = vencido, amber = próximo, teal = pagado). Day 15 is
selected.
Below the calendar, a section for the selected day listing its reminders as
cards with: an icon, the title ("Préstamo vehículo"), the amount, the time,
and two quick actions: a check button "Marcar pagado" and a snooze button
"Posponer".
Then a section "Esta semana" listing the upcoming reminders in a compact list
with colored leading bars.
A settings strip at the bottom with toggles: "Avisarme 3 días antes",
"Avisarme el mismo día", "Avisarme si se vence".
```

---

## 13. Reportes

```
Design the reports screen, titled "Reportes".
A period selector with chips: "Mes", "3 meses", "6 meses", "Año".
Card 1: a line chart "Ingresos vs Gastos" with two lines (green and coral) over
6 months and a legend.
Card 2: a donut chart "Gastos por categoría" with the top category highlighted
in the center ("Servicios 32%") and a 6-item legend with amounts.
Card 3: a descending line chart "Tu deuda en el tiempo", with a dashed
projection segment continuing to zero and a label "Proyección".
Card 4: "Cumplimiento del plan" showing a big "92%" with a progress ring and the
text "Has cumplido 11 de 12 pagos planificados".
A bottom outline button "Exportar CSV".
```

---

## 14. Ajustes

```
Design the settings screen, titled "Ajustes".
A profile header with an avatar circle, name "Carlos Jiménez" and the email.
Grouped list sections with icons and chevrons, all in Spanish:
- Cuenta: "Editar perfil", "Cambiar contraseña"
- Preferencias: "Moneda (DOP)", "Día de corte del mes (25)", "Tema (Oscuro)",
  "Idioma (Español)"
- Seguridad: "Bloqueo con PIN" (toggle on), "Huella / Face ID" (toggle on)
- Datos: "Exportar CSV", "Respaldo", "Borrar todos mis datos" (in red)
- Notificaciones: "Recordatorios de pago" (toggle), "Resumen semanal" (toggle)
- Acerca de: "Versión 1.0.0"
Bottom text link in coral: "Cerrar sesión".
```

---

## Qué hacer cuando termines en Stitch

Por cada pantalla mándame **una** de estas tres cosas (en orden de preferencia):

1. **Código exportado** (Copy code / Export → HTML + CSS) — es lo que mejor
   preserva tus ajustes
2. **Link de Export to Figma**
3. **Captura de pantalla** — con esto también reconstruyo fiel

No hace falta que mandes las 14 de una vez. Con las de **Inicio, Deudas y Plan**
ya puedo arrancar la Fase 1 y las demás se van sumando.
