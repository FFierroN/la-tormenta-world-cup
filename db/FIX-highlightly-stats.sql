-- =====================================================================
-- FIX: columna de estadisticas del partido (Highlightly, Fase 2).
-- =====================================================================
-- El robot enriquecer.py ya trae el detalle de Highlightly (1 sola llamada
-- que incluye events + statistics). Esta columna guarda las stats por equipo
-- para el panel del detalle del partido (posesion, xG, tiros, etc).
--
-- Se guarda como JSONB (flexible, una sola columna, sin tabla nueva). Forma:
--   {
--     "local":  { "Possession": 0.6, "Expected Goals": 1.41, ... },
--     "visita": { "Possession": 0.4, ... },
--     "top_players": [ ... ]   -- crudo, para una fase futura
--   }
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

alter table partidos add column if not exists estadisticas jsonb;

notify pgrst, 'reload schema';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'partidos'
  and column_name = 'estadisticas';
