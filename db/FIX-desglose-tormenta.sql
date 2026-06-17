-- =====================================================================
-- VISTA: desglose_tormenta  (pestana "LaTormenta" del detalle de partido)
-- =====================================================================
-- Por cada jugador ACTIVO, cuenta sus pronosticos de partidos FINALIZADOS
-- separados en 4 categorias mutuamente excluyentes (suman 'total'):
--
--   exacto          -> clavo el marcador identico.
--   diferencia      -> no exacto, NO empate, misma diferencia de goles.
--   acierto         -> no exacto, no diferencia, pero acerto ganador/empate.
--   falla           -> erro el resultado (signo distinto).
--   no_pronosticado -> partido final que el jugador NO pronostico (gris).
--
-- 'total' = TODOS los partidos finalizados (mismo para todos): asi los 5
-- buckets suman exactamente 'total' y la barra llena el 100%.
--
-- Misma logica que el sistema de puntaje (calcular_puntos_pronostico):
--   la 'diferencia' no existe en empates (ahi cae en 'acierto').
--
-- Incluye a TODOS los activos (aunque tengan 0 pronosticos) via left join,
-- y trae 'posicion' desde tabla_posiciones para ordenar por ranking.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

create or replace view desglose_tormenta as
with universo as (
  -- Cantidad GLOBAL de partidos ya finalizados (con resultado). Misma condicion
  -- que el left join de abajo => garantiza que los buckets sumen 'total'.
  select count(*) as n_finales
  from partidos
  where estado = 'final' and goles_local is not null
),
clasif as (
  select
    j.id as jugador_id,
    count(*) filter (
      where p.id is not null
        and pr.pred_local = p.goles_local
        and pr.pred_visita = p.goles_visita
    ) as exactos,
    count(*) filter (
      where p.id is not null
        and not (pr.pred_local = p.goles_local and pr.pred_visita = p.goles_visita)
        and p.goles_local <> p.goles_visita
        and (pr.pred_local - pr.pred_visita) = (p.goles_local - p.goles_visita)
    ) as diferencias,
    count(*) filter (
      where p.id is not null
        and not (pr.pred_local = p.goles_local and pr.pred_visita = p.goles_visita)
        and sign(pr.pred_local - pr.pred_visita) = sign(p.goles_local - p.goles_visita)
        and not (
          p.goles_local <> p.goles_visita
          and (pr.pred_local - pr.pred_visita) = (p.goles_local - p.goles_visita)
        )
    ) as aciertos,
    count(*) filter (
      where p.id is not null
        and sign(pr.pred_local - pr.pred_visita) <> sign(p.goles_local - p.goles_visita)
    ) as fallas,
    count(*) filter (where p.id is not null) as predichos
  from jugadores j
  left join pronosticos pr on pr.jugador_id = j.id
  left join partidos p on p.id = pr.partido_id
                      and p.estado = 'final' and p.goles_local is not null
  where j.activo
  group by j.id
)
select
  tp.posicion,
  c.jugador_id,
  j.nombre,
  j.alias,
  c.exactos,
  c.diferencias,
  c.aciertos,
  c.fallas,
  -- Partidos finalizados que este jugador NO pronostico (gris, al final).
  greatest(u.n_finales - c.predichos, 0) as no_pronosticados,
  u.n_finales as total
from clasif c
join jugadores j on j.id = c.jugador_id
join tabla_posiciones tp on tp.jugador_id = c.jugador_id
cross join universo u
order by tp.posicion;

grant select on desglose_tormenta to anon, authenticated;

notify pgrst, 'reload schema';

-- Verificacion: los 5 buckets deben sumar 'total' en cada fila.
select posicion, nombre, exactos, diferencias, aciertos, fallas,
       no_pronosticados, total
from desglose_tormenta order by posicion;
