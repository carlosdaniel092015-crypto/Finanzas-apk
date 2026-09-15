-- ============================================================================
--  Migracion 003 — ingesta de notificaciones bancarias por correo
--
--  Aditiva: no borra ni modifica ningun dato existente.
--  Supabase -> SQL Editor -> New query -> pegar -> Run
-- ============================================================================

-- Ultimos 4 digitos, para casar solo un correo con la tarjeta correcta.
alter table deudas add column if not exists ultimos4 text
  check (ultimos4 is null or ultimos4 ~ '^\d{4}$');

comment on column deudas.ultimos4 is
  'Ultimos 4 digitos de la tarjeta. Es lo que permite que un correo del banco se asigne solo a esta deuda.';

-- ---------------------------------------------------------------------------
-- Buzon: la direccion unica a la que reenvias los correos del banco.
-- El token es la credencial: quien lo conozca puede inyectar movimientos, por
-- eso es largo, aleatorio y revocable.
-- ---------------------------------------------------------------------------
create table if not exists buzones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null unique,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  ultimo_uso  timestamptz
);

create index if not exists buzones_token on buzones (token) where activo;

-- ---------------------------------------------------------------------------
-- Reglas de extraccion POR BANCO. Viven aqui y no en el codigo porque los
-- bancos cambian sus plantillas sin avisar: hay que poder corregir el patron
-- sin recompilar ni publicar un APK nuevo.
-- Son COMUNES (user_id nulo = semilla para todos) o PROPIAS del usuario.
-- ---------------------------------------------------------------------------
create table if not exists reglas_correo (
  id                text primary key,
  user_id           uuid references auth.users(id) on delete cascade,
  banco             text not null,
  remitentes        text[] not null,
  asunto_contiene   text[],
  tipo              tipo_movimiento_deuda not null,
  patron_monto      text not null,
  patron_fecha      text,
  patron_comercio   text,
  patron_tarjeta    text,
  patrones_excluir  text[],
  activa            boolean not null default true,
  prioridad         smallint not null default 100,
  actualizado_en    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bandeja de movimientos DETECTADOS, pendientes de confirmar.
--
-- La app PROPONE, no aplica. Un correo puede ser un duplicado, una compra
-- declinada o un reverso; si eso entrara solo al saldo, quedaria corrompido y
-- nadie se enteraria hasta no cuadrar con el banco. Al confirmar, esto se
-- convierte en una fila de deuda_movimientos, que es lo que mueve el saldo.
-- ---------------------------------------------------------------------------
do $$ begin
  create type estado_deteccion as enum ('pendiente','confirmado','descartado');
exception when duplicate_object then null;
end $$;

create table if not exists movimientos_detectados (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  deuda_id      uuid references deudas(id) on delete set null,
  banco         text not null,
  tipo          tipo_movimiento_deuda not null,
  monto         numeric(14,2) not null,
  moneda        text not null default 'DOP',
  fecha         date not null,
  comercio      text,
  ultimos4      text,
  confianza     text not null default 'media',
  regla_id      text,
  -- Huella para no registrar dos veces la misma compra: los bancos mandan a
  -- veces un correo de autorizacion y otro de liquidacion.
  huella        text not null,
  extracto      text,
  estado        estado_deteccion not null default 'pendiente',
  creado_en     timestamptz not null default now(),
  unique (user_id, huella)
);

create index if not exists movimientos_detectados_pendientes
  on movimientos_detectados (user_id, creado_en desc) where estado = 'pendiente';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table buzones                enable row level security;
alter table reglas_correo          enable row level security;
alter table movimientos_detectados enable row level security;

do $$ begin
  create policy "propio" on buzones for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "propio" on movimientos_detectados for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Las reglas comunes (user_id nulo) las LEE cualquiera autenticado, pero solo
-- se pueden escribir las propias: nadie puede romperle el parser a los demas.
do $$ begin
  create policy "leer comunes y propias" on reglas_correo for select
    to authenticated using (user_id is null or auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "escribir solo propias" on reglas_correo for all
    to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
