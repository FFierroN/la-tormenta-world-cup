-- =====================================================================
-- SETUP-pronostico-sandbox.sql
--   Feature "Pronostico" (pestana sandbox de Copa): cada jugador arma su
--   propio cuadro "que pasaria si" de Cuartos en adelante y elige su PODIO.
--   NO suma puntos ni afecta nada del bolo. Lo unico que persistimos es el
--   PODIO elegido (campeon / subcampeon / 3er lugar) para poder mostrar las
--   3 cajitas de "mas elegido por todos" con barras de porcentaje.
--
--   1 fila por jugador (upsert): si vuelve a jugar, se REEMPLAZA su podio,
--   nunca se duplica. Si reinicia, se borra su fila.
--
--   ADITIVO respecto al bolo (no toca tablas ni funciones del juego real).
--   La tabla del sandbox se recrea limpia (es data de juego, no critica).
--   Correr en Supabase -> SQL Editor -> Run.
-- =====================================================================

begin;

-- Limpieza de la version anterior (solo-campeon) para recrear con el podio.
drop function if exists guardar_sandbox_campeon(int, text, text);
drop function if exists sandbox_campeones_agg();
drop table if exists pronostico_sandbox cascade;

-- ---------------------------------------------------------------------
-- 1) Tabla: 1 fila por jugador con su PODIO elegido en el sandbox.
--    campeon es obligatorio (si hay podio, la final esta resuelta);
--    subcampeon/tercero pueden faltar si aun no completo esos cruces.
-- ---------------------------------------------------------------------
create table pronostico_sandbox (
  jugador_id       int primary key references jugadores(id) on delete cascade,
  campeon          text not null,   -- nombre pais (ej. 'Argentina')
  campeon_pais     text,            -- codigo ISO-2 para la bandera (ej. 'AR')
  subcampeon       text,            -- pierde la final
  subcampeon_pais  text,
  tercero          text,            -- gana el partido por el 3er puesto
  tercero_pais     text,
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) Guardar / actualizar / borrar el PODIO del sandbox de un jugador.
--    Si p_campeon viene null o '' -> RESET (borra la fila, deja de contar).
--    security definer para escribir con la anon key (patron guardar_*).
-- ---------------------------------------------------------------------
create or replace function guardar_sandbox_podio(
  p_jugador_id int,
  p_campeon text,      p_campeon_pais text,
  p_subcampeon text,   p_subcampeon_pais text,
  p_tercero text,      p_tercero_pais text
) returns text language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_campeon is null or btrim(p_campeon) = '' then
    delete from pronostico_sandbox where jugador_id = p_jugador_id;
    return 'reset';
  end if;

  insert into pronostico_sandbox (
    jugador_id, campeon, campeon_pais,
    subcampeon, subcampeon_pais, tercero, tercero_pais, updated_at)
  values (
    p_jugador_id, btrim(p_campeon), nullif(btrim(p_campeon_pais), ''),
    nullif(btrim(p_subcampeon), ''), nullif(btrim(p_subcampeon_pais), ''),
    nullif(btrim(p_tercero), ''),    nullif(btrim(p_tercero_pais), ''), now())
  on conflict (jugador_id) do update set
    campeon         = excluded.campeon,
    campeon_pais    = excluded.campeon_pais,
    subcampeon      = excluded.subcampeon,
    subcampeon_pais = excluded.subcampeon_pais,
    tercero         = excluded.tercero,
    tercero_pais    = excluded.tercero_pais,
    updated_at      = now();
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Agregado para las cajitas: por cada POSICION del podio, cuantos
--    eligieron cada pais, de mas a menos votado. El % lo calcula el front.
--    posicion in ('campeon','subcampeon','tercero').
-- ---------------------------------------------------------------------
create or replace function sandbox_podio_agg()
returns table(posicion text, pais_nombre text, pais_iso text, votos int)
language sql stable security definer set search_path = public, extensions as $$
  with todos as (
    select 'campeon'::text    as posicion, campeon    as pais_nombre, campeon_pais    as pais_iso
      from pronostico_sandbox where campeon is not null
    union all
    select 'subcampeon', subcampeon, subcampeon_pais
      from pronostico_sandbox where subcampeon is not null
    union all
    select 'tercero', tercero, tercero_pais
      from pronostico_sandbox where tercero is not null
  )
  select posicion,
         pais_nombre,
         max(pais_iso)  as pais_iso,   -- todos comparten el mismo ISO
         count(*)::int  as votos
  from todos
  group by posicion, pais_nombre
  order by posicion, votos desc, pais_nombre asc;
$$;

-- ---------------------------------------------------------------------
-- 4) Permisos (anon = la app usa la anon key).
-- ---------------------------------------------------------------------
grant execute on function guardar_sandbox_podio(int, text, text, text, text, text, text) to anon, authenticated;
grant execute on function sandbox_podio_agg()                                              to anon, authenticated;

commit;

-- Refresca el cache de PostgREST para que el front vea las funciones YA.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- VERIFICACION (corre despues):
--   select guardar_sandbox_podio(1,'Argentina','AR','Francia','FR','Brasil','BR'); -- 'ok'
--   select * from sandbox_podio_agg();   -- 3 filas: campeon/subcampeon/tercero
--   select guardar_sandbox_podio(1,null,null,null,null,null,null);                 -- 'reset'
--   select * from sandbox_podio_agg();   -- (vacio)
-- ---------------------------------------------------------------------
