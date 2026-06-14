-- =====================================================================
-- FIX: cronometro -> etiqueta de TRAMO (1er Tiempo / Entretiempo / 2do Tiempo)
-- =====================================================================
-- Sacamos el cronometro en vivo (worldcup26 no da el minuto real ni el
-- entretiempo, quedaba desfasado). En su lugar guardamos el 'tramo' del
-- partido, que el worker setea cruzando worldcup26 (vivo/final) con
-- Highlightly (state.description = "Half time" / "In Progress").
--
--   tramo = '1T' -> Primer tiempo   (punto rojo pulsante en el front)
--   tramo = 'ET' -> Entretiempo     (punto amarillo pulsante)
--   tramo = '2T' -> Segundo tiempo  (punto rojo pulsante)
--   tramo = null -> no aplica (programado / final)
--
-- Idempotente. Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- =====================================================================

alter table partidos add column if not exists tramo text;

-- Limpieza: cualquier partido que no este en vivo no deberia tener tramo.
update partidos set tramo = null
 where estado not in ('en_vivo', 'entretiempo') and tramo is not null;

-- Verificacion:
select id, equipo_local, equipo_visita, estado, tramo
from partidos
where estado in ('en_vivo','entretiempo');
