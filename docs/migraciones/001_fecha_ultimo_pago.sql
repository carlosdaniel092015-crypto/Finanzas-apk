-- ============================================================================
--  Migracion 001 — fecha del ultimo pago por deuda
--
--  Aplicar SOLO si ya corriste docs/ESQUEMA.sql antes de este cambio.
--  Si vas a instalar desde cero, ESQUEMA.sql ya la incluye y no hace falta esto.
--
--  Es aditiva: no borra ni modifica ningun dato existente.
--  Supabase -> SQL Editor -> New query -> pegar -> Run
-- ============================================================================

alter table deudas add column if not exists fecha_ultimo_pago date;

comment on column deudas.fecha_ultimo_pago is
  'Ultimo pago registrado. Opcional: sirve para avisar "sin pagar hace N meses".';

-- Las tarjetas de esta cartera cobran una CUOTA FIJA mensual, no un porcentaje
-- del saldo. pago_minimo_pct / pago_minimo_piso quedan disponibles para tarjetas
-- que si funcionen por porcentaje, pero la app no los pide.
comment on column deudas.cuota_mensual is
  'Pago FIJO mensual. Es el campo principal en tarjetas y en prestamos por igual.';

comment on column deudas.dia_corte is
  'Dia de corte del estado de cuenta (tarjetas). Opcional.';

comment on column deudas.dia_pago is
  'Dia del mes en que se paga. Opcional: alimenta los recordatorios.';
