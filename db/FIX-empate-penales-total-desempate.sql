-- =====================================================================
-- FIX-empate-penales-total-desempate.sql
-- =====================================================================
-- Dos cambios pedidos por Felipe (2026-07-10):
--
--  1) En "Mis predicciones" (pantalla que se abre al tocar a un jugador en la
--     tabla de avatares) el numero grande de "puntos" solo sumaba los puntos de
--     PRONOSTICO y dejaba fuera los de la definicion del empate (empate/penales).
--     -> Exponemos puntos_definicion por partido en las RPC que alimentan esa
--        pantalla, para que el front lo sume al total y muestre "+X pts
--        empate/penales" debajo del numero.
--     (La tabla de posiciones YA sumaba estos puntos al total; esto solo arregla
--      el resumen por jugador, que leia otra fuente.)
--
--  2) Desempate de la tabla: hasta ahora los empates de PUNTOS se rompian por
--     puntos -> exactos -> aciertos -> fallas asc. Ese "fallas asc" premiaba a
--     quien pronosticaba MENOS (menos fallas). Ahora los partidos ya jugados que
--     un jugador NO pronostico cuentan como falla SOLO para el desempate:
--     usamos (fallas + sin_pronostico) asc. El numero de Fallas que se MUESTRA
--     no cambia (sigue siendo solo los pronosticados y errados).
--
-- Todo con CREATE OR REPLACE / DROP+CREATE de RPC (cambia el tipo de retorno).
-- Idempotente: se puede correr varias veces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) RPC mis_predicciones_detalle: + columna puntos_definicion.
--    Cambia el tipo de retorno -> hay que DROP + CREATE.
-- ---------------------------------------------------------------------
drop function if exists mis_predicciones_detalle(int);
create or replace function mis_predicciones_detalle(p_jugador_id int)
returns table(
  partido_id int, fase text, grupo text, fecha timestamptz, estado text,
  equipo_local text, equipo_visita text, pais_local text, pais_visita text,
  goles_local int, goles_visita int,
  pred_local int, pred_visita int,
  puntos int, resultado text, puntos_definicion int
)
language sql security definer set search_path = public, extensions as $$
  select
    p.id, p.fase, p.grupo, p.fecha, p.estado,
    p.equipo_local, p.equipo_visita, p.pais_local, p.pais_visita,
    p.goles_local, p.goles_visita,
    pr.pred_local, pr.pred_visita,
    calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
      p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos,
    case
      when p.estado <> 'final'
        or p.goles_local is null or p.goles_visita is null then null
      when pr.pred_local = p.goles_local
        and pr.pred_visita = p.goles_visita then 'exacto'
      when p.goles_local <> p.goles_visita
        and (p.goles_local - p.goles_visita)
          = (pr.pred_local - pr.pred_visita) then 'diferencia'
      when (p.goles_local > p.goles_visita and pr.pred_local > pr.pred_visita)
        or (p.goles_local < p.goles_visita and pr.pred_local < pr.pred_visita)
        or (p.goles_local = p.goles_visita and pr.pred_local = pr.pred_visita)
        then 'acierto'
      else 'falla'
    end as resultado,
    calcular_puntos_definicion(pr.pred_definicion, pr.pred_clasificado,
      pr.pred_def_local, pr.pred_def_visita,
      p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita,
      contar_exactos_definicion(p.id)) as puntos_definicion
  from pronosticos pr
  join partidos p on p.id = pr.partido_id
  where pr.jugador_id = p_jugador_id
    and not p.puntaje_anulado            -- no mostrar/sumar anulados
  order by p.fecha desc;
$$;
grant execute on function mis_predicciones_detalle(int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) RPC predicciones_jugadas_todas: + columna puntos_definicion.
--    (Comparte el mapeo aMiPrediccion en el front -> misma forma.)
-- ---------------------------------------------------------------------
drop function if exists predicciones_jugadas_todas();
create or replace function predicciones_jugadas_todas()
returns table(
  jugador_id int,
  partido_id int, fase text, grupo text, fecha timestamptz, estado text,
  equipo_local text, equipo_visita text, pais_local text, pais_visita text,
  goles_local int, goles_visita int,
  pred_local int, pred_visita int,
  puntos int, resultado text, puntos_definicion int
)
language sql security definer set search_path = public, extensions as $$
  select
    pr.jugador_id,
    p.id, p.fase, p.grupo, p.fecha, p.estado,
    p.equipo_local, p.equipo_visita, p.pais_local, p.pais_visita,
    p.goles_local, p.goles_visita,
    pr.pred_local, pr.pred_visita,
    calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
      p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos,
    case
      when pr.pred_local = p.goles_local
        and pr.pred_visita = p.goles_visita then 'exacto'
      when p.goles_local <> p.goles_visita
        and (p.goles_local - p.goles_visita)
          = (pr.pred_local - pr.pred_visita) then 'diferencia'
      when (p.goles_local > p.goles_visita and pr.pred_local > pr.pred_visita)
        or (p.goles_local < p.goles_visita and pr.pred_local < pr.pred_visita)
        or (p.goles_local = p.goles_visita and pr.pred_local = pr.pred_visita)
        then 'acierto'
      else 'falla'
    end as resultado,
    calcular_puntos_definicion(pr.pred_definicion, pr.pred_clasificado,
      pr.pred_def_local, pr.pred_def_visita,
      p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita,
      contar_exactos_definicion(p.id)) as puntos_definicion
  from pronosticos pr
  join partidos p on p.id = pr.partido_id
  where p.estado = 'final'
    and p.goles_local is not null
    and p.goles_visita is not null
    and not p.puntaje_anulado            -- no contar anulados
  order by p.fecha desc;
$$;
grant execute on function predicciones_jugadas_todas() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) tabla_posiciones: desempate con (fallas + sin_pronostico) asc.
--    sin_pronostico = partidos jugados del torneo que el jugador NO pronostico.
--    Como cada pronostico de un partido final cae en exactamente una de
--    exactos/aciertos/fallas, sin_pronostico = jugados_torneo - (ex+ac+fa).
--    Las columnas EXPUESTAS por la vista NO cambian (mismo orden y nombres):
--    solo cambia el order by del row_number. El numero de Fallas visible queda
--    intacto (solo pronosticados errados).
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones as
with tot as (
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

-- ---------------------------------------------------------------------
-- 4) tabla_posiciones_live: mismo desempate (sin_pronostico sobre los partidos
--    en curso o finalizados que cuenta la vista live).
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones_live as
with tot as (
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
select
  jugador_id, nombre, alias, avatar_pos1, avatar_medio, avatar_pos8,
  puntos, exactos, aciertos, fallas,
  row_number() over (
    order by puntos desc, exactos desc, aciertos desc,
             (fallas + ((select jugados from tot) - (exactos + aciertos + fallas))) asc,
             jugador_id asc
  ) as posicion
from base;

-- ---------------------------------------------------------------------
-- 5) tabla_posiciones_base: foto al cierre de la jornada anterior (flechas).
--    Mismo desempate para que las posiciones sean comparables. Aca el universo
--    de "jugados" es SOLO los finalizados ANTES del corte de jornada.
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones_base as
with tot as (
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
    order by puntos desc, exactos desc, aciertos desc,
             (fallas + ((select jugados from tot) - (exactos + aciertos + fallas))) asc,
             jugador_id asc
  ) as posicion
from base;

-- ---------------------------------------------------------------------
-- Verificacion rapida (opcional):
--   select * from mis_predicciones_detalle(1);            -- debe traer puntos_definicion
--   select jugador_id, puntos, exactos, aciertos, fallas, posicion
--     from tabla_posiciones order by posicion;
-- ---------------------------------------------------------------------
