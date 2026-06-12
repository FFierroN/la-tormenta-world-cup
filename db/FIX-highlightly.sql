-- =====================================================================
-- FIX: columnas para el robot de enriquecimiento (Highlightly).
-- =====================================================================
-- worldcup26.ir nos da marcador + goles en vivo. Highlightly (este robot
-- nuevo, enriquecer.py) rellena al FINAL del partido las asistencias y
-- tarjetas que worldcup26 no trae.
--
-- Agrega 2 columnas a 'partidos' (idempotente, no borra nada):
--   highlightly_id  -> id del partido en Highlightly (lo aprende el robot
--                      la 1ra vez y lo cachea, para no re-listar por fecha).
--   enriquecido_at  -> cuando enriquecimos el partido. Si es NULL, esta
--                      pendiente. Asi gastamos 1 sola request por partido.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

alter table partidos add column if not exists highlightly_id bigint;
alter table partidos add column if not exists enriquecido_at timestamptz;

-- Refresca el cache de PostgREST para que el robot vea las columnas YA.
notify pgrst, 'reload schema';

-- Verificacion: deberia listar las dos columnas nuevas.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'partidos'
  and column_name in ('highlightly_id', 'enriquecido_at')
order by column_name;
