-- =====================================================================
-- SETUP-pronostico-sandbox.sql
--   Feature "Llaves" (sandbox "que pasaria si"), ahora dentro de
--   Tabla > Predicciones > Llaves. Cada jugador arma su cuadro de Cuartos
--   en adelante; se guarda su BRACKET COMPLETO (picks) + su PODIO para que:
--     - el propio jugador lo retome desde cualquier dispositivo,
--     - los demas puedan VER su cuadro (solo lectura),
--     - salgan las 3 cajitas de "podio mas elegido por todos".
--   NO suma puntos ni afecta el bolo. 1 fila por jugador (upsert).
--
--   IDEMPOTENTE: respeta la tabla ya creada; agrega la columna 'picks' y
--   recrea las funciones. Correr en Supabase -> SQL Editor -> Run.
-- =====================================================================

begin;

-- Tabla base (por si se corre limpio). Si ya existe, no se toca aqui.
create table if not exists pronostico_sandbox (
  jugador_id       int primary key references jugadores(id) on delete cascade,
  campeon          text,
  campeon_pais     text,
  subcampeon       text,
  subcampeon_pais  text,
  tercero          text,
  tercero_pais     text,
  updated_at       timestamptz not null default now()
);

-- Migraciones idempotentes sobre la tabla existente:
alter table pronostico_sandbox add column if not exists picks jsonb;         -- bracket completo
alter table pronostico_sandbox alter column campeon drop not null;           -- brackets parciales

-- Funciones viejas (solo-podio) fuera; recreamos con picks.
drop function if exists guardar_sandbox_podio(int, text, text, text, text, text, text);

-- ---------------------------------------------------------------------
-- Guardar / actualizar / borrar el sandbox de un jugador.
--   p_picks = objeto JSON { "P97":"local", ... }. Si viene null o '{}' -> RESET
--   (borra la fila; deja de contar y sale de la lista). Si hay picks, se
--   upsertea el bracket + el podio (campeon puede ir null si aun no completo).
-- ---------------------------------------------------------------------
create or replace function guardar_sandbox(
  p_jugador_id int,
  p_campeon text,      p_campeon_pais text,
  p_subcampeon text,   p_subcampeon_pais text,
  p_tercero text,      p_tercero_pais text,
  p_picks jsonb
) returns text language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_picks is null or p_picks = '{}'::jsonb then
    delete from pronostico_sandbox where jugador_id = p_jugador_id;
    return 'reset';
  end if;

  insert into pronostico_sandbox (
    jugador_id, campeon, campeon_pais,
    subcampeon, subcampeon_pais, tercero, tercero_pais, picks, updated_at)
  values (
    p_jugador_id, nullif(btrim(p_campeon), ''), nullif(btrim(p_campeon_pais), ''),
    nullif(btrim(p_subcampeon), ''), nullif(btrim(p_subcampeon_pais), ''),
    nullif(btrim(p_tercero), ''),    nullif(btrim(p_tercero_pais), ''),
    p_picks, now())
  on conflict (jugador_id) do update set
    campeon         = excluded.campeon,
    campeon_pais    = excluded.campeon_pais,
    subcampeon      = excluded.subcampeon,
    subcampeon_pais = excluded.subcampeon_pais,
    tercero         = excluded.tercero,
    tercero_pais    = excluded.tercero_pais,
    picks           = excluded.picks,
    updated_at      = now();
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------
-- Lista de participantes que YA definieron un campeon (para la lista de
-- Llaves): jugador + su campeon (nombre + ISO para la bandera).
-- ---------------------------------------------------------------------
create or replace function sandbox_participantes()
returns table(jugador_id int, campeon text, campeon_pais text)
language sql stable security definer set search_path = public, extensions as $$
  select jugador_id, campeon, campeon_pais
  from pronostico_sandbox
  where campeon is not null
  order by updated_at desc;
$$;

-- ---------------------------------------------------------------------
-- Bracket (picks) de un jugador, para reconstruir su cuadro (solo lectura).
-- ---------------------------------------------------------------------
create or replace function sandbox_de_jugador(p_jugador_id int)
returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select picks from pronostico_sandbox where jugador_id = p_jugador_id;
$$;

-- ---------------------------------------------------------------------
-- Agregado del podio (para las 3 cajitas de "mas elegido por todos").
-- ---------------------------------------------------------------------
create or replace function sandbox_podio_agg()
returns table(posicion text, pais_nombre text, pais_iso text, votos int)
language sql stable security definer set search_path = public, extensions as $$
  with todos as (
    select 'campeon'::text as posicion, campeon as pais_nombre, campeon_pais as pais_iso
      from pronostico_sandbox where campeon is not null
    union all
    select 'subcampeon', subcampeon, subcampeon_pais
      from pronostico_sandbox where subcampeon is not null
    union all
    select 'tercero', tercero, tercero_pais
      from pronostico_sandbox where tercero is not null
  )
  select posicion, pais_nombre, max(pais_iso) as pais_iso, count(*)::int as votos
  from todos
  group by posicion, pais_nombre
  order by posicion, votos desc, pais_nombre asc;
$$;

-- Permisos (anon = la app usa la anon key).
grant execute on function guardar_sandbox(int, text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function sandbox_participantes()      to anon, authenticated;
grant execute on function sandbox_de_jugador(int)      to anon, authenticated;
grant execute on function sandbox_podio_agg()          to anon, authenticated;

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- VERIFICACION (corre despues):
--   select guardar_sandbox(1,'Argentina','AR','Francia','FR','Brasil','BR','{"P104":"local"}'::jsonb); -- 'ok'
--   select * from sandbox_participantes();   -- jugador 1 con Argentina/AR
--   select sandbox_de_jugador(1);            -- {"P104":"local"}
--   select * from sandbox_podio_agg();       -- 3 filas
--   select guardar_sandbox(1,null,null,null,null,null,null,'{}'::jsonb);  -- 'reset'
-- ---------------------------------------------------------------------
