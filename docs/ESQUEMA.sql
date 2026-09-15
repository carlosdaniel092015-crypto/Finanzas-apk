-- ============================================================================
--  Finanzas APK — esquema completo (Supabase / Postgres)
--  Pegar en:  Supabase → SQL Editor → New query → Run
--  Todo con RLS: cada usuario SOLO ve sus propias filas.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- ENUMS ----
create type tipo_movimiento   as enum ('ingreso','gasto');
create type tipo_cuenta       as enum ('efectivo','banco','tarjeta','ahorro','otro');
create type frecuencia        as enum ('semanal','quincenal','mensual','bimestral','trimestral','semestral','anual');
create type tipo_deuda        as enum ('tarjeta','prestamo_personal','prestamo_vehiculo','hipoteca','linea_credito','prestamo_informal','otro');
create type tipo_tasa         as enum ('fija','variable','mixta');
create type estado_deuda      as enum ('activa','pagada','en_mora','refinanciada');
create type estrategia_plan   as enum ('avalancha','bola_nieve','hibrida','personalizada');
create type tipo_servicio     as enum ('alquiler','agua','electricidad','gas','internet','telefono','streaming','seguro','educacion','gym','mantenimiento','otro');
create type canal_recordatorio as enum ('local','email','ambos');

-- ------------------------------------------------------------- PROFILES ----
create table perfiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  nombre            text,
  moneda            text not null default 'DOP',
  zona_horaria      text not null default 'America/Santo_Domingo',
  dia_corte_mes     smallint not null default 1 check (dia_corte_mes between 1 and 28),
  meta_fondo_emerg  numeric(14,2) default 0,   -- objetivo de fondo de emergencia
  creado_en         timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ------------------------------------------------------------ CATEGORIAS ---
create table categorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nombre      text not null,
  tipo        tipo_movimiento not null,
  icono       text,
  color       text,
  es_sistema  boolean not null default false,
  creado_en   timestamptz not null default now(),
  unique (user_id, nombre, tipo)
);

-- --------------------------------------------------------------- CUENTAS ---
create table cuentas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  nombre         text not null,
  tipo           tipo_cuenta not null default 'banco',
  moneda         text not null default 'DOP',
  saldo_inicial  numeric(14,2) not null default 0,
  banco          text,
  activa         boolean not null default true,
  creado_en      timestamptz not null default now()
);

-- ----------------------------------------------------------------- DEUDAS --
create table deudas (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  tipo                   tipo_deuda not null,
  nombre                 text not null,
  acreedor               text,                       -- Banco Popular, BHD, Banreservas...
  moneda                 text not null default 'DOP',

  monto_original         numeric(14,2),
  saldo_actual           numeric(14,2) not null default 0,

  -- Tasa
  tipo_tasa              tipo_tasa not null default 'fija',
  tasa_anual             numeric(7,4) not null default 0,   -- % anual efectiva vigente, ej 24.5000
  tasa_indice            text,                              -- 'TPM', 'TIPPP', 'prime'...
  tasa_spread            numeric(7,4),                      -- puntos sobre el índice
  tasa_piso              numeric(7,4),
  tasa_techo             numeric(7,4),
  revision_cada_meses    smallint,                          -- cada cuántos meses revisa la tasa
  fija_hasta             date,                              -- para tasa mixta: fija hasta esta fecha

  -- Plazo y cuota
  fecha_inicio           date,
  fecha_fin_estimada     date,
  plazo_meses_total      smallint,
  plazo_meses_restantes  smallint,
  -- Pago FIJO mensual. Es el campo principal tanto en tarjetas como en prestamos:
  -- estas tarjetas no cobran un porcentaje del saldo, cobran una cuota fija.
  cuota_mensual          numeric(14,2),
  dia_pago               smallint check (dia_pago between 1 and 31),   -- opcional
  fecha_ultimo_pago      date,                                          -- opcional
  -- Alta en la app: ancla del devengo cuando no hay ultimo pago ni inicio
  fecha_registro         date default current_date,

  -- Específico de tarjetas / líneas
  limite_credito         numeric(14,2),
  dia_corte              smallint check (dia_corte between 1 and 31),
  pago_minimo_pct        numeric(5,2),               -- ej 5.00 = 5% del saldo
  pago_minimo_piso       numeric(14,2),              -- mínimo absoluto
  cargo_anual            numeric(14,2),

  -- Específico de vehículo / hipoteca
  seguro_mensual         numeric(14,2),
  garantia               text,

  estado                 estado_deuda not null default 'activa',
  prioridad_manual       smallint,                   -- para estrategia personalizada
  notas                  text,
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now()
);
create index on deudas (user_id, estado);

-- Historial de tasa (para variables: se guarda cada cambio, no se pisa)
create table deuda_tasas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  deuda_id       uuid not null references deudas(id) on delete cascade,
  vigente_desde  date not null,
  tasa_anual     numeric(7,4) not null,
  nota           text,
  creado_en      timestamptz not null default now()
);
create index on deuda_tasas (deuda_id, vigente_desde desc);

-- ------------------------------------------------------------ MOVIMIENTOS --
create table movimientos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  tipo           tipo_movimiento not null,
  monto          numeric(14,2) not null check (monto > 0),
  moneda         text not null default 'DOP',
  fecha          date not null default current_date,
  descripcion    text,
  categoria_id   uuid references categorias(id) on delete set null,
  cuenta_id      uuid references cuentas(id) on delete set null,
  deuda_id       uuid references deudas(id) on delete set null,  -- si el gasto es pago de deuda
  recurrente_id  uuid,                                            -- si nace de un recurrente
  comprobante    text,                                            -- path en Storage
  etiquetas      text[],
  creado_en      timestamptz not null default now()
);
create index on movimientos (user_id, fecha desc);
create index on movimientos (user_id, tipo, fecha desc);
create index on movimientos (deuda_id);

-- ------------------------------------------------- RECURRENTES / SERVICIOS -
-- Alquiler, CAASD, electricidad, gas, internet, streaming, salario, etc.
create table recurrentes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  tipo              tipo_movimiento not null,
  nombre            text not null,
  proveedor         text,                       -- CAASD, EdeEste, Claro, Netflix...
  servicio          tipo_servicio,
  categoria_id      uuid references categorias(id) on delete set null,
  cuenta_id         uuid references cuentas(id) on delete set null,
  monto_estimado    numeric(14,2) not null default 0,
  monto_variable    boolean not null default false,  -- luz y agua varían cada mes
  moneda            text not null default 'DOP',
  frecuencia        frecuencia not null default 'mensual',
  dia_del_mes       smallint check (dia_del_mes between 1 and 31),
  proximo_venc      date,
  fecha_fin         date,                        -- contratos con fecha de término
  auto_registrar    boolean not null default false,
  activo            boolean not null default true,
  notas             text,
  creado_en         timestamptz not null default now()
);
create index on recurrentes (user_id, activo, proximo_venc);

-- ----------------------------------------------------------- PAGOS DEUDA ---
create table pagos_deuda (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  deuda_id      uuid not null references deudas(id) on delete cascade,
  movimiento_id uuid references movimientos(id) on delete set null,
  fecha         date not null default current_date,
  monto         numeric(14,2) not null check (monto > 0),
  capital       numeric(14,2),
  interes       numeric(14,2),
  mora          numeric(14,2) default 0,
  es_extra      boolean not null default false,   -- abono adicional al capital
  saldo_despues numeric(14,2),
  nota          text,
  creado_en     timestamptz not null default now()
);
create index on pagos_deuda (deuda_id, fecha desc);

-- ----------------------------------------------------------------- PLANES --
create table planes (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  nombre                 text,
  estrategia             estrategia_plan not null default 'avalancha',
  excedente_mensual      numeric(14,2) not null default 0,
  supuestos              jsonb not null default '{}'::jsonb,  -- escenario de tasa, inflación, etc.
  fecha_libre_deudas     date,
  meses_totales          smallint,
  interes_total          numeric(14,2),
  interes_ahorrado       numeric(14,2),           -- vs. pagar solo mínimos
  resumen                jsonb,
  activo                 boolean not null default false,
  creado_en              timestamptz not null default now()
);
create index on planes (user_id, creado_en desc);

-- Cronograma mes a mes del plan
create table plan_detalle (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan_id       uuid not null references planes(id) on delete cascade,
  deuda_id      uuid not null references deudas(id) on delete cascade,
  mes           smallint not null,          -- 1..N desde el inicio del plan
  fecha         date not null,
  orden_ataque  smallint,
  pago          numeric(14,2) not null,
  capital       numeric(14,2) not null,
  interes       numeric(14,2) not null,
  saldo_final   numeric(14,2) not null,
  es_objetivo   boolean not null default false
);
create index on plan_detalle (plan_id, mes);

-- ---------------------------------------------------------- RECORDATORIOS --
create table recordatorios (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  titulo         text not null,
  detalle        text,
  deuda_id       uuid references deudas(id) on delete cascade,
  recurrente_id  uuid references recurrentes(id) on delete cascade,
  fecha_hora     timestamptz not null,
  dias_antes     smallint not null default 3,
  repetir        frecuencia,
  canal          canal_recordatorio not null default 'local',
  monto          numeric(14,2),
  activo         boolean not null default true,
  ultima_notif   timestamptz,
  atendido       boolean not null default false,
  creado_en      timestamptz not null default now()
);
create index on recordatorios (user_id, activo, fecha_hora);

-- ------------------------------------------------------------ PRESUPUESTOS -
create table presupuestos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  categoria_id  uuid not null references categorias(id) on delete cascade,
  mes           date not null,                  -- siempre día 1 del mes
  limite        numeric(14,2) not null,
  creado_en     timestamptz not null default now(),
  unique (user_id, categoria_id, mes)
);

-- ------------------------------------------------------------------ METAS --
create table metas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nombre          text not null,
  tipo            text not null default 'ahorro',  -- ahorro | fondo_emergencia | pago_deuda
  monto_objetivo  numeric(14,2) not null,
  monto_actual    numeric(14,2) not null default 0,
  fecha_objetivo  date,
  activa          boolean not null default true,
  creado_en       timestamptz not null default now()
);

-- ============================================================================
--  RLS — cada usuario solo su data
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['perfiles','categorias','cuentas','deudas','deuda_tasas',
                           'movimientos','recurrentes','pagos_deuda','planes',
                           'plan_detalle','recordatorios','presupuestos','metas']
  loop
    execute format('alter table %I enable row level security', t);
    if t = 'perfiles' then
      execute format($f$create policy "propio" on %I for all
                        using (auth.uid() = id) with check (auth.uid() = id)$f$, t);
    else
      execute format($f$create policy "propio" on %I for all
                        using (auth.uid() = user_id) with check (auth.uid() = user_id)$f$, t);
    end if;
  end loop;
end $$;

-- ============================================================================
--  VISTAS de apoyo
-- ============================================================================
create or replace view v_resumen_mensual
with (security_invoker = true) as
select user_id,
       date_trunc('month', fecha)::date                                   as mes,
       sum(monto) filter (where tipo = 'ingreso')                         as ingresos,
       sum(monto) filter (where tipo = 'gasto')                           as gastos,
       coalesce(sum(monto) filter (where tipo='ingreso'),0)
         - coalesce(sum(monto) filter (where tipo='gasto'),0)             as flujo_neto
from movimientos
group by user_id, date_trunc('month', fecha);

create or replace view v_deudas_resumen
with (security_invoker = true) as
select d.user_id,
       count(*)                                                            as cantidad,
       sum(d.saldo_actual)                                                 as deuda_total,
       sum(d.cuota_mensual)                                                as cuotas_mensuales,
       sum(d.saldo_actual * d.tasa_anual) / nullif(sum(d.saldo_actual),0)  as tasa_promedio_ponderada,
       sum(d.saldo_actual) filter (where d.tipo = 'tarjeta')               as deuda_tarjetas,
       sum(d.limite_credito) filter (where d.tipo = 'tarjeta')             as limite_tarjetas
from deudas d
where d.estado = 'activa'
group by d.user_id;

-- ============================================================================
--  Storage: comprobantes (privado, una carpeta por usuario)
-- ============================================================================
insert into storage.buckets (id, name, public) values ('comprobantes','comprobantes', false)
  on conflict (id) do nothing;

create policy "comprobantes propios" on storage.objects for all
  to authenticated
  using  (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);
