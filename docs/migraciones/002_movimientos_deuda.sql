-- ============================================================================
--  Migracion 002 — plazo de los prestamos e historial de movimientos
--
--  Aditiva: no borra ni modifica ningun dato existente.
--  Supabase -> SQL Editor -> New query -> pegar -> Run
-- ============================================================================

-- Alta en la app. Es el ancla del devengo de interes cuando la deuda no tiene
-- ni ultimo pago ni fecha de inicio: sin ella el interes entre pagos saldria
-- siempre cero y el historial de "cuanto te ganan" quedaria en cero para siempre.
alter table deudas add column if not exists fecha_registro date default current_date;

comment on column deudas.fecha_fin_estimada is
  'Cuando termina el prestamo. Se deduce del plazo si no se da, y viceversa.';

-- ---------------------------------------------------------------------------
-- Historial de hechos sobre una deuda. El saldo NO se edita a mano: se mueve
-- solo a traves de estos registros, para poder responder siempre "por que debo
-- esto". pagos_deuda sigue existiendo para el detalle contable de los pagos.
-- ---------------------------------------------------------------------------
do $$ begin
  create type tipo_movimiento_deuda as enum ('pago','consumo','reenganche','ajuste');
exception when duplicate_object then null;
end $$;

create table if not exists deuda_movimientos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  deuda_id       uuid not null references deudas(id) on delete cascade,
  tipo           tipo_movimiento_deuda not null,
  fecha          date not null default current_date,
  monto          numeric(14,2) not null,
  -- Solo en 'pago': como se repartio
  interes        numeric(14,2),
  capital        numeric(14,2),
  saldo_despues  numeric(14,2) not null,
  nota           text,
  creado_en      timestamptz not null default now()
);

create index if not exists deuda_movimientos_deuda_fecha
  on deuda_movimientos (deuda_id, fecha desc);

alter table deuda_movimientos enable row level security;

do $$ begin
  create policy "propio" on deuda_movimientos for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
