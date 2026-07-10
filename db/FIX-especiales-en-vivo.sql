-- =====================================================================
-- FIX-especiales-en-vivo.sql
-- =====================================================================
-- Puntaje de predicciones ESPECIALES 100% AUTOMATICO + provisional hasta la
-- final. Reemplaza el flujo manual (admin cargaba TODOS los resultados reales
-- y apretaba "Recalcular").
--
--   1) Vista especiales_reales (1 fila): los resultados reales DERIVADOS solos:
--        - PAIS  : campeon / finalistas / 3er / semifinalistas salen de las
--                  llaves (partidos slots P101,P102,P103,P104).
--        - GOLEADOR / ASISTIDOR: del conteo de partido_eventos (empates en la
--                  cima -> todos los lideres cuentan, arrays).
--        - MEJOR JUGADOR/ARQUERO/JOVEN: siguen MANUALES (voto FIFA) desde
--                  configuracion (real_mejor_*).
--   2) Vista especiales_puntos: puntos por jugador EN VIVO usando lo anterior.
--   3) Ranking (tabla_posiciones / _live / _base): los puntos de especiales
--      SOLO se suman al total OFICIAL cuando la final (P104) esta 'final'
--      (provisional hasta ese momento). Se conserva el desempate y todo lo demas.
--
-- Idempotente. Cero cambios de esquema. La RPC recalcular_especiales y las
-- columnas predicciones_especiales.puntos_* quedan sin uso (inofensivas).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Resultados reales DERIVADOS (auto) + 3 distinciones manuales.
--    Devuelve valores normalizados (minusculas, trim) listos para comparar.
-- ---------------------------------------------------------------------
create or replace view especiales_reales as
with
gol_counts as (
  select normaliza_jugador(jugador) as jugador, count(*) as c
  from partido_eventos
  where tipo = 'gol' and coalesce(detalle,'') <> 'autogol'
    and normaliza_jugador(jugador) is not null
  group by normaliza_jugador(jugador)
),
gol_lideres as (
  select coalesce(array_agg(jugador), '{}') as arr
  from gol_counts
  where c = (select max(c) from gol_counts) and (select max(c) from gol_counts) > 0
),
asi_counts as (
  select normaliza_jugador(asistencia) as jugador, count(*) as c
  from partido_eventos
  where tipo = 'gol' and normaliza_jugador(asistencia) is not null
  group by normaliza_jugador(asistencia)
),
asi_lideres as (
  select coalesce(array_agg(jugador), '{}') as arr
  from asi_counts
  where c = (select max(c) from asi_counts) and (select max(c) from asi_counts) > 0
),
fin as (select * from partidos where slot = 'P104' limit 1),
ter as (select * from partidos where slot = 'P103' limit 1)
select
  -- PAIS derivado de las llaves.
  (select nullif(nullif(lower(trim(case
     when f.estado='final' and f.ganador_penales='local'  then f.equipo_local
     when f.estado='final' and f.ganador_penales='visita' then f.equipo_visita
     when f.estado='final' and coalesce(f.goles_local,0)+coalesce(f.alargue_local,0)
            > coalesce(f.goles_visita,0)+coalesce(f.alargue_visita,0) then f.equipo_local
     when f.estado='final' and coalesce(f.goles_visita,0)+coalesce(f.alargue_visita,0)
            > coalesce(f.goles_local,0)+coalesce(f.alargue_local,0) then f.equipo_visita
   end)),''),'por definir') from fin f) as campeon,
  (select nullif(nullif(lower(trim(case
     when t.estado='final' and t.ganador_penales='local'  then t.equipo_local
     when t.estado='final' and t.ganador_penales='visita' then t.equipo_visita
     when t.estado='final' and coalesce(t.goles_local,0)+coalesce(t.alargue_local,0)
            > coalesce(t.goles_visita,0)+coalesce(t.alargue_visita,0) then t.equipo_local
     when t.estado='final' and coalesce(t.goles_visita,0)+coalesce(t.alargue_visita,0)
            > coalesce(t.goles_local,0)+coalesce(t.alargue_local,0) then t.equipo_visita
   end)),''),'por definir') from ter t) as tercer,
  (select array_remove(array[
      (select nullif(nullif(lower(trim(f.equipo_local)),''),'por definir') from fin f),
      (select nullif(nullif(lower(trim(f.equipo_visita)),''),'por definir') from fin f)
    ], null)) as finalistas,
  (select coalesce(array_agg(x), '{}') from (
      select nullif(nullif(lower(trim(equipo_local)),''),'por definir')  as x
        from partidos where slot in ('P101','P102')
      union all
      select nullif(nullif(lower(trim(equipo_visita)),''),'por definir')
        from partidos where slot in ('P101','P102')
    ) s where x is not null) as semifinalistas,
  (select arr from gol_lideres) as goleadores,
  (select arr from asi_lideres) as asistidores,
  -- Distinciones subjetivas: MANUALES (configuracion).
  nullif(lower(trim((select max(valor) from configuracion where clave='real_mejor_jugador'))), '') as mejor_jugador,
  nullif(lower(trim((select max(valor) from configuracion where clave='real_mejor_arquero'))), '') as mejor_arquero,
  nullif(lower(trim((select max(valor) from configuracion where clave='real_mejor_joven'))),   '') as mejor_joven;

grant select on especiales_reales to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) Puntos de especiales por jugador (EN VIVO, provisional).
--    PAIS: dedup por equipo (ronda mas alta). Distinciones: fijas.
-- ---------------------------------------------------------------------
create or replace view especiales_puntos as
with r as (select * from especiales_reales)
select
  pe.jugador_id,
  coalesce((
    select sum(valor_equipo) from (
      select t.equipo,
        max(case
          when r.campeon is not null and t.equipo = r.campeon then 30
          when t.equipo = any(r.finalistas)                   then 12
          when r.tercer  is not null and t.equipo = r.tercer  then 8
          when t.equipo = any(r.semifinalistas)               then 6
          else 0 end) as valor_equipo
      from (
        select lower(trim(x)) as equipo from unnest(array[
          pe.campeon, pe.finalista_1, pe.finalista_2,
          pe.semifinalista_1, pe.semifinalista_2, pe.semifinalista_3, pe.semifinalista_4
        ]) as x
        where x is not null and trim(x) <> ''
      ) t
      group by t.equipo
    ) s
  ), 0) as puntos_pais,
  case when normaliza_jugador(canonico_jugador(pe.goleador))  = any(r.goleadores)  then 15 else 0 end as puntos_goleador,
  case when normaliza_jugador(canonico_jugador(pe.asistidor)) = any(r.asistidores) then 10 else 0 end as puntos_asistidor,
  case when r.mejor_jugador is not null and lower(trim(coalesce(pe.mejor_jugador,''))) = r.mejor_jugador then 10 else 0 end as puntos_mejor_jugador,
  case when r.mejor_arquero is not null and lower(trim(coalesce(pe.mejor_arquero,''))) = r.mejor_arquero then 10 else 0 end as puntos_mejor_arquero,
  case when r.mejor_joven   is not null and lower(trim(coalesce(pe.mejor_joven,'')))   = r.mejor_joven   then 10 else 0 end as puntos_mejor_joven,
  (
    coalesce((
      select sum(valor_equipo) from (
        select t.equipo,
          max(case
            when r.campeon is not null and t.equipo = r.campeon then 30
            when t.equipo = any(r.finalistas)                   then 12
            when r.tercer  is not null and t.equipo = r.tercer  then 8
            when t.equipo = any(r.semifinalistas)               then 6
            else 0 end) as valor_equipo
        from (
          select lower(trim(x)) as equipo from unnest(array[
            pe.campeon, pe.finalista_1, pe.finalista_2,
            pe.semifinalista_1, pe.semifinalista_2, pe.semifinalista_3, pe.semifinalista_4
          ]) as x
          where x is not null and trim(x) <> ''
        ) t
        group by t.equipo
      ) s
    ), 0)
    + case when normaliza_jugador(canonico_jugador(pe.goleador))  = any(r.goleadores)  then 15 else 0 end
    + case when normaliza_jugador(canonico_jugador(pe.asistidor)) = any(r.asistidores) then 10 else 0 end
    + case when r.mejor_jugador is not null and lower(trim(coalesce(pe.mejor_jugador,''))) = r.mejor_jugador then 10 else 0 end
    + case when r.mejor_arquero is not null and lower(trim(coalesce(pe.mejor_arquero,''))) = r.mejor_arquero then 10 else 0 end
    + case when r.mejor_joven   is not null and lower(trim(coalesce(pe.mejor_joven,'')))   = r.mejor_joven   then 10 else 0 end
  ) as puntos_total
from predicciones_especiales pe cross join r;

grant select on especiales_puntos to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2b) Nombres CANONICOS (oficial HL) de goleador/asistidor por jugador, para
--     mostrar en el desglose. 'Desconocido' si el pick no esta mapeado.
-- ---------------------------------------------------------------------
create or replace view especiales_resuelto as
select
  jugador_id,
  canonico_jugador(goleador)  as goleador,
  canonico_jugador(asistidor) as asistidor
from predicciones_especiales;

grant select on especiales_resuelto to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Ranking: especiales suman al total OFICIAL solo si la final (P104) ya
--    se jugo (provisional hasta entonces). Se conserva desempate.
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones as
with cerrado as (
  select exists(select 1 from partidos where slot='P104' and estado='final') as ok
),
tot as (
  select count(*) as jugados
  from partidos
  where estado = 'final' and goles_local is not null and not puntaje_anulado
),
base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(sum(calcular_puntos_definicion(
          pr.pred_definicion, pr.pred_clasificado, pr.pred_def_local, pr.pred_def_visita,
          p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita,
          contar_exactos_definicion(p.id))),0)
      + coalesce(j.ajuste_puntos, 0)
      + case when (select ok from cerrado)
             then coalesce((select ep.puntos_total from especiales_puntos ep
                            where ep.jugador_id = j.id), 0)
             else 0 end as puntos,
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
  where j.activo
  group by j.id
)
select
  jugador_id, nombre, alias, avatar_pos1, avatar_medio, avatar_pos8,
  puntos, exactos, aciertos, fallas,
  row_number() over (
    order by puntos desc, exactos desc, aciertos desc,
             (fallas + ((select jugados from tot) - (exactos + aciertos + fallas))) asc,
             jugador_id asc
  ) as posicion
from base;

create or replace view tabla_posiciones_live as
with cerrado as (
  select exists(select 1 from partidos where slot='P104' and estado='final') as ok
),
tot as (
  select count(*) as jugados
  from partidos
  where estado in ('en_vivo','entretiempo','alargue','penales','final')
    and goles_local is not null and not puntaje_anulado
),
base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(sum(calcular_puntos_definicion(
          pr.pred_definicion, pr.pred_clasificado, pr.pred_def_local, pr.pred_def_visita,
          p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita,
          contar_exactos_definicion(p.id))),0)
      + coalesce(j.ajuste_puntos, 0)
      + case when (select ok from cerrado)
             then coalesce((select ep.puntos_total from especiales_puntos ep
                            where ep.jugador_id = j.id), 0)
             else 0 end as puntos,
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
select
  jugador_id, nombre, alias, avatar_pos1, avatar_medio, avatar_pos8,
  puntos, exactos, aciertos, fallas,
  row_number() over (
    order by puntos desc, exactos desc, aciertos desc,
             (fallas + ((select jugados from tot) - (exactos + aciertos + fallas))) asc,
             jugador_id asc
  ) as posicion
from base;

create or replace view tabla_posiciones_base as
with cerrado as (
  select exists(select 1 from partidos where slot='P104' and estado='final'
                  and fecha < (select corte from corte_jornada)) as ok
),
tot as (
  select count(*) as jugados
  from partidos
  where estado='final' and goles_local is not null and not puntaje_anulado
    and fecha < (select corte from corte_jornada)
),
base as (
  select
    j.id as jugador_id,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(j.ajuste_puntos, 0)
      + case when (select ok from cerrado)
             then coalesce((select ep.puntos_total from especiales_puntos ep
                            where ep.jugador_id = j.id), 0)
             else 0 end as puntos,
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
    order by puntos desc, exactos desc, aciertos desc,
             (fallas + ((select jugados from tot) - (exactos + aciertos + fallas))) asc,
             jugador_id asc
  ) as posicion
from base;

-- ---------------------------------------------------------------------
-- Verificacion rapida (opcional):
--   select * from especiales_reales;                         -- resultados auto
--   select * from especiales_puntos order by puntos_total desc;
--   select jugador_id, puntos, posicion from tabla_posiciones order by posicion;
-- ---------------------------------------------------------------------
