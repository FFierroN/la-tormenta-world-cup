-- =====================================================================
-- DIAGNOSTICO: por que Mbappe (Francia) no aparece en goleadores.
-- =====================================================================
-- La tabla de goleadores se arma agregando partido_eventos tipo='gol' por el
-- campo 'jugador' (excluyendo autogoles). Si Mbappe no figura es porque:
--   (a) falta su fila de gol (el feed gratis no lo trajo, como Arnautovic), o
--   (b) el enriquecedor de Highlightly piso los eventos sin ese gol, o
--   (c) su nombre quedo en 2 grafias distintas y se reparte.
--
-- Corre las 3 consultas (Supabase -> SQL Editor) y pega los 3 resultados.
-- Uso: pega TODO y Run; se ven 3 grillas.
-- =====================================================================

-- 1) Partidos de Francia: marcador, estado y si ya fue enriquecido.
select id            as partido_id,
       equipo_local,
       equipo_visita,
       goles_local,
       goles_visita,
       estado,
       (estadisticas is not null) as tiene_stats,
       (alineaciones is not null) as tiene_alineaciones
from partidos
where equipo_local = 'Francia' or equipo_visita = 'Francia'
order by fecha;

-- 2) TODOS los eventos de gol de los partidos de Francia (con nombre y detalle).
--    Aca se ve si el gol de Mbappe esta, con que nombre, o si falta.
select p.id            as partido_id,
       p.equipo_local || ' vs ' || p.equipo_visita as partido,
       e.equipo,
       e.minuto,
       e.minuto_adicional,
       e.jugador,
       e.asistencia,
       e.detalle
from partidos p
join partido_eventos e
  on e.partido_id = p.id and e.tipo = 'gol'
where p.equipo_local = 'Francia' or p.equipo_visita = 'Francia'
order by p.fecha, e.minuto nulls last, e.minuto_adicional nulls first;

-- 3) Ranking completo de goleadores tal como lo calcula la app (group by jugador,
--    sin autogoles). Sirve para ver si Mbappe aparece con alguna grafia rara.
select e.jugador,
       count(*) as goles
from partido_eventos e
where e.tipo = 'gol'
  and coalesce(e.detalle, 'normal') <> 'autogol'
  and e.jugador is not null
group by e.jugador
order by goles desc, e.jugador;
