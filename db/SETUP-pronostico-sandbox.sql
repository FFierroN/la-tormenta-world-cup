-- =====================================================================
-- SETUP-pronostico-sandbox.sql
--   Feature "Pronostico" (pestana sandbox de Copa): cada jugador arma su
--   propio cuadro "que pasaria si" de Cuartos en adelante y elige campeon.
--   NO suma puntos ni afecta nada del bolo. Lo unico que persistimos es el
--   CAMPEON elegido por cada jugador, para poder mostrar la cajita de
--   "pais mas seleccionado por todos" con barras de porcentaje.
--
--   100% ADITIVO: crea 1 tabla nueva + 2 RPCs. No toca tablas ni funciones
--   existentes. Idempotente. Correr en Supabase -> SQL Editor -> Run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Tabla: 1 fila por jugador con su campeon elegido en el sandbox.
--    Se sobreescribe cada vez que cambia. Si reinicia, se borra la fila.
-- ---------------------------------------------------------------------
create table if not exists pronostico_sandbox (
  jugador_id   int primary key references jugadores(id) on delete cascade,
  campeon      text not null,        -- nombre del pais (ej. 'Argentina')
  campeon_pais text,                 -- codigo ISO-2 para la bandera (ej. 'AR')
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) Guardar / actualizar / borrar el campeon del sandbox de un jugador.
--    Si p_campeon viene null o '' -> se interpreta como RESET y borra la
--    fila (para que no siga contando en el agregado). security definer
--    para poder escribir con la anon key (mismo patron que guardar_*).
-- ---------------------------------------------------------------------
create or replace function guardar_sandbox_campeon(
  p_jugador_id int, p_campeon text, p_campeon_pais text
) returns text language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_campeon is null or btrim(p_campeon) = '' then
    delete from pronostico_sandbox where jugador_id = p_jugador_id;
    return 'reset';
  end if;

  insert into pronostico_sandbox (jugador_id, campeon, campeon_pais, updated_at)
  values (p_jugador_id, btrim(p_campeon), nullif(btrim(p_campeon_pais), ''), now())
  on conflict (jugador_id) do update set
    campeon      = excluded.campeon,
    campeon_pais = excluded.campeon_pais,
    updated_at   = now();
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Agregado para la cajita: cuantos eligieron cada pais como campeon,
--    ordenado de mas a menos. 'total' global lo calcula el front para el %.
-- ---------------------------------------------------------------------
create or replace function sandbox_campeones_agg()
returns table(campeon text, campeon_pais text, votos int)
language sql stable security definer set search_path = public, extensions as $$
  select campeon,
         max(campeon_pais) as campeon_pais,  -- todos comparten el mismo ISO
         count(*)::int     as votos
  from pronostico_sandbox
  group by campeon
  order by votos desc, campeon asc;
$$;

-- ---------------------------------------------------------------------
-- 4) Permisos (anon = la app usa la anon key).
-- ---------------------------------------------------------------------
grant execute on function guardar_sandbox_campeon(int, text, text) to anon, authenticated;
grant execute on function sandbox_campeones_agg()                  to anon, authenticated;

commit;

-- Refresca el cache de PostgREST para que el front vea las funciones YA.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- VERIFICACION (corre despues):
--   select guardar_sandbox_campeon(1, 'Argentina', 'AR');  -- 'ok'
--   select * from sandbox_campeones_agg();                 -- Argentina | AR | 1
--   select guardar_sandbox_campeon(1, null, null);         -- 'reset'
--   select * from sandbox_campeones_agg();                 -- (vacio)
-- ---------------------------------------------------------------------
