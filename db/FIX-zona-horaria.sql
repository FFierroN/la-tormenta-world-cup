-- =====================================================================
-- FIX puntual: corregir la zona horaria de los partidos YA cargados.
-- =====================================================================
-- Problema: el fixture se insesrto con horas en UTC-4 (Chile) pero SIN el
-- offset, asi que Supabase (sesion UTC) las guardo 4 horas ANTES de lo real.
-- Sintoma: la app mostraba 11:00 cuando el partido es a las 15:00 (Chile).
--
-- Esto SOLO hace falta en una base que YA tiene los partidos cargados.
-- (El SETUP-SUPABASE.sql nuevo ya inserta con '-04', asi que una base
--  recien creada NO necesita este fix.)
--
-- Es IDEMPOTENTE: corrige +4h una sola vez. Si lo corres de nuevo, detecta
-- que ya esta bien y no hace nada (no se vuelve a desplazar).
--
-- Como usarlo: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

do $$
declare
  v_opener timestamptz;
  v_hora_utc int;
begin
  -- Tomamos el partido inaugural como testigo: Mexico vs Sudafrica,
  -- que debe ser a las 15:00 Chile = 19:00 UTC.
  select fecha into v_opener
  from partidos
  where equipo_local = 'México' and equipo_visita = 'Sudáfrica'
  limit 1;

  if v_opener is null then
    raise notice 'No se encontro el partido inaugural. No hay nada que corregir.';
    return;
  end if;

  v_hora_utc := extract(hour from (v_opener at time zone 'UTC'))::int;

  if v_hora_utc = 19 then
    raise notice 'Las fechas YA estan correctas (opener a 19:00 UTC = 15:00 Chile). Sin cambios.';
  else
    update partidos set fecha = fecha + interval '4 hours';
    raise notice 'Fechas corregidas: +4 horas aplicadas a TODOS los partidos.';
  end if;
end $$;

-- Verificacion rapida (deberia mostrar 15:00 en hora de Chile):
select equipo_local, equipo_visita,
       fecha as fecha_utc,
       fecha at time zone 'America/Santiago' as fecha_chile
from partidos
where equipo_local = 'México' and equipo_visita = 'Sudáfrica';
