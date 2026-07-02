-- DIAG-puntajes-movidos.sql
-- Diagnostico: por que se movieron los puntajes sin partidos nuevos.
-- HIPOTESIS: el bot HL escribio en goles_local/visita el marcador TOTAL (con
-- alargue) en vez del reglamentario de 90'. Eso disparo el recalculo de puntos.
-- Estas queries SOLO LEEN. No modifican nada. Correr en Supabase SQL Editor.

-- ============================================================================
-- QUERY 1) Marcador GUARDADO vs marcador RECONSTRUIDO desde los eventos (90').
--   Los goles tienen 'minuto', asi que podemos separar 90' de alargue (>90).
--   OJO: no ajusta autogoles (cuentan al equipo que anota el evento); si un
--   partido tuvo autogol, revisarlo a mano. Sirve igual para detectar el bug.
-- ============================================================================
select
  p.id,
  p.fase,
  p.equipo_local || ' vs ' || p.equipo_visita                as partido,
  p.estado,
  to_char(p.fecha, 'YYYY-MM-DD HH24:MI')                     as fecha,
  p.goles_local  || '-' || p.goles_visita                    as guardado,
  -- goles hasta el 90' (incl. descuento) reconstruidos de eventos:
  count(*) filter (where e.equipo = 'local'  and e.minuto <= 90) as gl_90,
  count(*) filter (where e.equipo = 'visita' and e.minuto <= 90) as gv_90,
  -- goles en alargue (91'-120'):
  count(*) filter (where e.equipo = 'local'  and e.minuto > 90)  as gl_alargue,
  count(*) filter (where e.equipo = 'visita' and e.minuto > 90)  as gv_alargue,
  -- columnas de definicion tal como estan hoy:
  p.alargue_local  || '-' || p.alargue_visita                as alargue_guardado,
  p.penales_local  || '-' || p.penales_visita                as penales_guardado,
  -- BANDERA: el guardado NO coincide con el 90' reconstruido => corrupto.
  case
    when p.goles_local  = count(*) filter (where e.equipo='local'  and e.minuto <= 90)
     and p.goles_visita = count(*) filter (where e.equipo='visita' and e.minuto <= 90)
      then 'OK'
    else '>> SOSPECHOSO (guardado != 90 reconstruido)'
  end                                                        as veredicto
from partidos p
left join partido_eventos e on e.partido_id = p.id and e.tipo = 'gol'
where p.estado = 'final'
  and p.fecha >= '2026-06-28'          -- ultima semana; ampliar si hace falta
group by p.id
order by p.fecha;

-- ============================================================================
-- QUERY 2) Cuanto CAMBIARIA tu puntaje si el marcador fuera el de 90' correcto.
--   Compara los puntos con el marcador GUARDADO (hoy) vs con el 90' reconstruido,
--   por jugador, SOLO en los partidos sospechosos. Reemplaza <IDS> abajo con los
--   ids que la QUERY 1 marco como SOSPECHOSO (ej: 123,124).
-- ============================================================================
with rec as (
  select
    p.id as partido_id, p.fase,
    count(*) filter (where e.equipo='local'  and e.minuto <= 90)::int as gl_90,
    count(*) filter (where e.equipo='visita' and e.minuto <= 90)::int as gv_90
  from partidos p
  left join partido_eventos e on e.partido_id = p.id and e.tipo='gol'
  where p.id in (/* <IDS> */ -1)
  group by p.id
)
select
  j.nombre,
  p.equipo_local || ' vs ' || p.equipo_visita           as partido,
  pr.pred_local || '-' || pr.pred_visita                as tu_pronostico,
  p.goles_local || '-' || p.goles_visita                as marcador_hoy,
  r.gl_90 || '-' || r.gv_90                             as marcador_90_real,
  calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
    p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos_hoy,
  calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
    r.gl_90, r.gv_90, p.fase, contar_exactos(p.id))    as puntos_si_90
from rec r
join partidos p    on p.id = r.partido_id
join pronosticos pr on pr.partido_id = p.id
join jugadores j    on j.id = pr.jugador_id
where j.activo
order by partido, j.nombre;
