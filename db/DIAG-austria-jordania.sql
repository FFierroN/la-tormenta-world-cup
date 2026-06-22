-- =====================================================================
-- DIAGNOSTICO: ver los goles cargados de Austria vs Jordania.
-- =====================================================================
-- Sirve para confirmar que falta el penal del 90+12 antes de insertarlo.
-- worldcup26 (feed gratis) solo trajo 3 de los 4 goles -> ese gol no esta
-- en la fuente, hay que meterlo a mano (sin gastar Highlightly).
--
-- Uso: Supabase -> SQL Editor -> pega -> Run.
-- =====================================================================

select p.id            as partido_id,
       p.equipo_local,
       p.equipo_visita,
       p.goles_local,
       p.goles_visita,
       e.equipo,
       e.minuto,
       e.minuto_adicional,
       e.jugador,
       e.detalle
from partidos p
left join partido_eventos e
  on e.partido_id = p.id and e.tipo = 'gol'
where p.equipo_local = 'Austria' and p.equipo_visita = 'Jordania'
order by e.minuto nulls last, e.minuto_adicional nulls first;
