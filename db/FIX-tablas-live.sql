-- =====================================================================
-- FIX: TABLAS EN VIVO (provisional) -- posiciones contando partidos en juego
-- =====================================================================
-- Crea DOS vistas nuevas, espejo de las oficiales, pero que ademas cuentan
-- los partidos EN CURSO (en_vivo / entretiempo / alargue / penales), no solo
-- los finalizados. Sirven para mostrar "como quedaria la tabla con el resultado
-- actual" mientras el partido se juega. Al finalizar, ese resultado ya entra en
-- la tabla OFICIAL (como siempre), asi que estas vistas convergen solas.
--
-- NO tocan nada existente: son vistas NUEVAS (_live). Reusan las funciones de
-- puntaje ya creadas (calcular_puntos_pronostico / contar_exactos) -> DRY.
--
-- Requisitos previos (ya corridos en esta base):
--   SNIPPET-nuevo-puntaje.sql  (define calcular_puntos_pronostico/contar_exactos
--                               y la vista tabla_posiciones)
--   FIX-anular-...             (agrega partidos.puntaje_anulado)
--
-- Idempotente. Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) tabla_posiciones_live: igual a tabla_posiciones, pero el join a partidos
--    incluye los estados EN CURSO (no solo 'final'). Excluye los anulados,
--    igual que la oficial. Las especiales y el ajuste manual se suman tal cual.
--    Exactos/Aciertos/Fallas aqui son PROVISIONALES (incluyen partidos en juego)
--    para que el desempate sea coherente con los puntos en vivo.
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones_live as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(j.ajuste_puntos, 0)
      + coalesce((
          select pe.puntos_pais + pe.puntos_goleador + pe.puntos_asistidor
               + pe.puntos_mejor_jugador + pe.puntos_mejor_arquero + pe.puntos_mejor_joven
          from predicciones_especiales pe where pe.jugador_id = j.id), 0) as puntos,
    count(*) filter (where
        pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita) as exactos,
    count(*) filter (where
        not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)=sign(p.goles_local-p.goles_visita)) as aciertos,
    count(*) filter (where
        not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)<>sign(p.goles_local-p.goles_visita)) as fallas
  from jugadores j
  left join pronosticos pr on pr.jugador_id = j.id
  left join partidos p on p.id = pr.partido_id
                      and p.estado in ('en_vivo','entretiempo','alargue','penales','final')
                      and p.goles_local is not null
                      and not p.puntaje_anulado
  where j.activo
  group by j.id
)
select *, row_number() over (
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- ---------------------------------------------------------------------
-- 2) tabla_grupos_live: igual a tabla_grupos, pero 'resultados' incluye los
--    partidos EN CURSO. (Los anulados SI cuentan para el grupo: el partido se
--    jugo; lo que se anula es el puntaje de los pronosticos, no el resultado
--    deportivo. Mismo criterio que la vista oficial.)
-- ---------------------------------------------------------------------
create or replace view tabla_grupos_live as
with equipos as (
  select grupo, equipo_local as equipo, pais_local as pais
    from partidos where grupo is not null and equipo_local <> 'Por definir'
  union
  select grupo, equipo_visita as equipo, pais_visita as pais
    from partidos where grupo is not null and equipo_visita <> 'Por definir'
),
resultados as (
  select grupo, equipo_local as equipo, goles_local as gf, goles_visita as gc
    from partidos
    where grupo is not null
      and estado in ('en_vivo','entretiempo','alargue','penales','final')
      and goles_local is not null
  union all
  select grupo, equipo_visita as equipo, goles_visita as gf, goles_local as gc
    from partidos
    where grupo is not null
      and estado in ('en_vivo','entretiempo','alargue','penales','final')
      and goles_local is not null
),
agg as (
  select e.grupo, e.equipo, e.pais,
    count(r.equipo)                                          as pj,
    count(*) filter (where r.gf > r.gc)                      as pg,
    count(*) filter (where r.gf = r.gc)                      as pe,
    count(*) filter (where r.gf < r.gc)                      as pp,
    coalesce(sum(r.gf),0)                                    as gf,
    coalesce(sum(r.gc),0)                                    as gc,
    coalesce(sum(r.gf - r.gc),0)                             as dg,
    coalesce(sum(case when r.gf>r.gc then 3
                      when r.gf=r.gc then 1 else 0 end),0)   as pts
  from equipos e
  left join resultados r on r.grupo = e.grupo and r.equipo = e.equipo
  group by e.grupo, e.equipo, e.pais
)
select *, rank() over (partition by grupo
                       order by pts desc, dg desc, gf desc, equipo) as pos
from agg;

-- ---------------------------------------------------------------------
-- 3) Permisos (mismas vistas de lectura que las oficiales).
-- ---------------------------------------------------------------------
grant select on tabla_posiciones_live, tabla_grupos_live to anon, authenticated;

-- Verificacion rapida:
-- select * from tabla_posiciones_live order by posicion;
-- select * from tabla_grupos_live order by grupo, pos;
