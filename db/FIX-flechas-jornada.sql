-- =====================================================================
-- FIX: FLECHAS DE MOVIMIENTO vs CIERRE DE LA JORNADA ANTERIOR
-- =====================================================================
-- ANTES: las flechas comparaban "en vivo vs oficial" -> solo se pintaban de
-- color mientras habia un partido EN CURSO. El resto del tiempo: todo gris.
--
-- AHORA: comparan la posicion ACTUAL contra la del CIERRE DE LA JORNADA
-- ANTERIOR. Asi las flechas PERSISTEN: muestran quien subio/bajo en la jornada
-- en curso, haya o no un partido jugandose. Cuando arranca una jornada nueva,
-- la referencia se corre sola (automatico, sin botones).
--
-- Crea TRES vistas nuevas (no toca nada existente):
--   corte_jornada          -> el instante de corte (inicio de la jornada activa)
--   tabla_posiciones_base  -> foto de posiciones de jugadores a ese corte
--   tabla_grupos_base      -> foto de posiciones de cada grupo a ese corte
--
-- El front compara:  actual (en vivo / oficial)  vs  base (cierre anterior).
--
-- Idempotente. Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
--
-- OJO (DRY entre capas): las fechas de las jornadas viven TAMBIEN en
-- app/src/pages/Partidos.tsx (const FECHAS). Si cambian alla, cambialas aca.
-- Para sumar las jornadas de eliminacion, agrega su 'desde' a la lista.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) corte_jornada: el instante contra el que se mide el movimiento.
--    = inicio (00:00 Chile) de la jornada ACTIVA (la ultima cuyo dia ya llego).
--    Si la jornada activa es la PRIMERA (no hay anterior con que comparar),
--    el corte es 'infinity' -> la base cuenta TODOS los partidos = igual a la
--    tabla actual -> flechas grises (correcto: aun no hay jornada previa).
-- ---------------------------------------------------------------------
create or replace view corte_jornada as
with jornadas(desde) as (
  values
    (timestamptz '2026-06-11 00:00:00-04'),  -- Fecha 1
    (timestamptz '2026-06-18 00:00:00-04'),  -- Fecha 2
    (timestamptz '2026-06-24 00:00:00-04')   -- Fecha 3
),
activa as (
  select max(desde) as inicio from jornadas where desde <= now()
)
select case
         when exists (select 1 from jornadas j, activa a where j.desde < a.inicio)
           then (select inicio from activa)
         else timestamptz 'infinity'
       end as corte;

-- ---------------------------------------------------------------------
-- 1) tabla_posiciones_base: igual a tabla_posiciones pero contando SOLO los
--    partidos finalizados ANTES del corte. Mismo puntaje y mismo desempate
--    (DRY: reusa calcular_puntos_pronostico / contar_exactos), asi las
--    posiciones son 100% comparables con las actuales.
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones_base as
with base as (
  select
    j.id as jugador_id,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(j.ajuste_puntos, 0)
      + coalesce((
          select pe.puntos_pais + pe.puntos_goleador + pe.puntos_asistidor
               + pe.puntos_mejor_jugador + pe.puntos_mejor_arquero + pe.puntos_mejor_joven
          from predicciones_especiales pe where pe.jugador_id = j.id), 0) as puntos,
    count(*) filter (where p.estado='final'
        and pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita) as exactos,
    count(*) filter (where p.estado='final'
        and not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)=sign(p.goles_local-p.goles_visita)) as aciertos,
    count(*) filter (where p.estado='final'
        and not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)<>sign(p.goles_local-p.goles_visita)) as fallas
  from jugadores j
  left join pronosticos pr on pr.jugador_id = j.id
  left join partidos p on p.id = pr.partido_id
                      and p.estado='final' and p.goles_local is not null
                      and not p.puntaje_anulado
                      and p.fecha < (select corte from corte_jornada)
  where j.activo
  group by j.id
)
select jugador_id, row_number() over (
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- ---------------------------------------------------------------------
-- 2) tabla_grupos_base: igual a tabla_grupos pero contando SOLO los partidos
--    finalizados ANTES del corte. Mismo rank() y desempate que la oficial.
-- ---------------------------------------------------------------------
create or replace view tabla_grupos_base as
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
    where grupo is not null and estado='final' and goles_local is not null
      and fecha < (select corte from corte_jornada)
  union all
  select grupo, equipo_visita as equipo, goles_visita as gf, goles_local as gc
    from partidos
    where grupo is not null and estado='final' and goles_local is not null
      and fecha < (select corte from corte_jornada)
),
agg as (
  select e.grupo, e.equipo,
    coalesce(sum(r.gf - r.gc),0)                            as dg,
    coalesce(sum(r.gf),0)                                   as gf,
    coalesce(sum(case when r.gf>r.gc then 3
                      when r.gf=r.gc then 1 else 0 end),0)  as pts
  from equipos e
  left join resultados r on r.grupo = e.grupo and r.equipo = e.equipo
  group by e.grupo, e.equipo
)
select grupo, equipo, rank() over (partition by grupo
                       order by pts desc, dg desc, gf desc, equipo) as pos
from agg;

-- ---------------------------------------------------------------------
-- 3) Permisos (mismas vistas de lectura que las oficiales).
-- ---------------------------------------------------------------------
grant select on tabla_posiciones_base, tabla_grupos_base to anon, authenticated;

-- Verificacion rapida:
-- select * from corte_jornada;                              -- el corte vigente
-- select * from tabla_posiciones_base order by posicion;    -- foto jugadores
-- -- Comparar movimiento jugadores (dif <> 0 = se movio en la jornada):
-- select a.posicion as actual, b.posicion as base, p.nombre
-- from tabla_posiciones a
-- join tabla_posiciones_base b on b.jugador_id = a.jugador_id
-- join jugadores p on p.id = a.jugador_id
-- order by a.posicion;
