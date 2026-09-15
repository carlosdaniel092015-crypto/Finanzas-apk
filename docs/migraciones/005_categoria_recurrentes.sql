-- ============================================================================
--  Migracion 005 — arreglar la sincronizacion de ingresos y gastos
--
--  Aditiva: no borra ni modifica ningun dato existente.
--  Supabase -> SQL Editor -> New query -> pegar -> Run
--
--  Por que hace falta: la app guarda su propia taxonomia de categorias
--  (vivienda, servicios, transporte, ocio...) y tipos de ingreso (sueldo,
--  incentivo, comision...). La columna `servicio` es un enum cerrado con otros
--  valores (alquiler, agua, electricidad...), asi que escribir ahi fallaba y
--  NADA de ingresos ni gastos llegaba a la nube.
-- ============================================================================

alter table recurrentes add column if not exists categoria text;

comment on column recurrentes.categoria is
  'Categoria de la app: vivienda/servicios/transporte/... en gastos, y sueldo/incentivo/comision/... en ingresos. Texto libre a proposito: agregar una categoria no debe exigir una migracion.';

-- Indice para el borrado por diferencia al sincronizar.
create index if not exists recurrentes_user_activo on recurrentes (user_id, activo);
