-- =====================================================================
-- AUDIT-puntos.sql  ·  Auditoria del misterio del "+4"
-- =====================================================================
-- OBJETIVO: responder con certeza que paso con esos 4 puntos.
--
-- CONTEXTO (lo que sabemos del codigo):
--   * La TABLA OFICIAL (vista tabla_posiciones) calcula EN VIVO:
--        base = SUM(calcular_puntos_pronostico(...))  [EXCLUYE anulados]
--        total = base + ajuste_puntos + puntos_especiales
--   * Las METRICAS de la app (RPC mis_predicciones_detalle) calculan:
--        SUM(calcular_puntos_pronostico(...))  [pero NO excluye anulados]
--        (sin ajuste, sin especiales)
--   * Australia vs Turquia esta marcado puntaje_anulado = true.
--
-- HIPOTESIS: el "+4" de las metricas son los puntos del partido ANULADO
-- (que la tabla ignora). Y si ademas se resto -4 a mano, hay DOBLE descuento.
--
-- Uso: Supabase -> SQL Editor -> corre cada bloque y pegame el resultado.
-- Solo LEE datos. No modifica nada.
-- =====================================================================


-- QUERY A) Ajustes manuales vigentes (aca deberia estar tu -4) --------
select id, nombre, ajuste_puntos, ajuste_motivo
from jugadores
where ajuste_puntos <> 0
order by nombre;


-- QUERY B) Partidos con puntaje anulado (los que la tabla NO cuenta) --
select id, fase, equipo_local, equipo_visita, estado,
       goles_local, goles_visita, puntaje_anulado
from partidos
where puntaje_anulado
order by fecha;


-- QUERY C) Cuantos puntos "esconde" cada partido anulado por jugador --
--   = exactamente lo que las metricas suman de MAS respecto a la tabla.
select j.id, j.nombre,
       p.equipo_local || ' vs ' || p.equipo_visita as partido,
       pr.pred_local || '-' || pr.pred_visita       as pronostico,
       p.goles_local || '-' || p.goles_visita       as resultado,
       calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
         p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos_anulados
from jugadores j
join pronosticos pr on pr.jugador_id = j.id
join partidos p     on p.id = pr.partido_id
where p.puntaje_anulado
  and p.estado = 'final'
  and p.goles_local is not null
  and calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
        p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) <> 0
order by j.nombre;


-- QUERY D) *** RECONCILIACION MAESTRA (la que resuelve todo) *** -------
--   Para cada jugador con ajuste o con puntos en anulados, muestra:
--     validos   = puntos de partidos que SI cuentan (base de la tabla)
--     anulados  = puntos que las metricas suman de mas (partidos anulados)
--     ajuste    = tu ajuste manual
--   y DIAGNOSTICA si el ajuste == -(puntos anulados) => doble descuento.
with recalc as (
  select
    j.id, j.nombre, j.ajuste_puntos,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))) filter (where not p.puntaje_anulado), 0) as validos,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))) filter (where p.puntaje_anulado), 0) as anulados
  from jugadores j
  left join pronosticos pr on pr.jugador_id = j.id
  left join partidos p     on p.id = pr.partido_id
                          and p.estado = 'final' and p.goles_local is not null
  where j.activo
  group by j.id, j.nombre, j.ajuste_puntos
)
select
  nombre,
  validos                          as puntos_validos,
  anulados                         as puntos_en_anulados_metrica_de_mas,
  ajuste_puntos                    as ajuste_manual,
  validos + ajuste_puntos          as total_tabla_sin_especiales,
  validos + anulados               as total_metricas_sin_ajuste,
  case
    when ajuste_puntos = -anulados and anulados <> 0
      then '>> DOBLE DESCUENTO: el ajuste repite lo que ya quito la anulacion'
    when ajuste_puntos <> 0 and anulados = 0
      then '?? Ajuste sin partido anulado asociado (revisar motivo)'
    when ajuste_puntos = 0 and anulados <> 0
      then 'Solo metrica infla (no hay doble descuento); tabla OK'
    else ''
  end as diagnostico
from recalc
where ajuste_puntos <> 0 or anulados <> 0
order by nombre;


-- QUERY E) Sanidad: ¿hay pronosticos duplicados? (no deberia por unique) --
select jugador_id, partido_id, count(*) as veces
from pronosticos
group by jugador_id, partido_id
having count(*) > 1;
