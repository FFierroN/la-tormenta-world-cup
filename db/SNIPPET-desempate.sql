-- =====================================================================
-- SNIPPET #2: POLITICA DE DESEMPATE (tabla de posiciones sin empates)
-- =====================================================================
-- Que hace: redefine SOLO la vista 'tabla_posiciones'. No toca datos
-- (pronosticos, jugadores, partidos quedan intactos). Es instantaneo y
-- reversible. Cambia COMO se ordena y numera la tabla:
--
--   Antes:  rank()  -> podia haber 2 jugadores en la misma posicion.
--   Ahora:  row_number() -> NUNCA hay empate de posicion.
--
-- Orden de desempate (de mayor a menor prioridad):
--   1. puntos (desc)
--   2. exactos (desc)
--   3. aciertos (desc)        [aciertos = diferencia + resultado, como hoy]
--   4. MENOS fallas (asc)
--   5. orden de inscripcion (id asc)  -> ultimo recurso
--
-- Antes del 1er partido todos estan en 0 y quedan por id (inofensivo:
-- se ordena de verdad apenas haya un resultado).
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- Reversible: si no te gusta, vuelve a correr el SETUP-SUPABASE.sql.
-- =====================================================================

create or replace view tabla_posiciones as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase)),0)
      + coalesce(j.ajuste_puntos, 0)
      + coalesce((
          select pe.puntos_campeon + pe.puntos_finalistas + pe.puntos_semifinalistas
               + pe.puntos_goleador + pe.puntos_mejor_jugador
               + pe.puntos_mejor_arquero + pe.puntos_mejor_joven
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
  where j.activo
  group by j.id
)
-- DESEMPATE: row_number() => nunca hay dos en la misma posicion.
select *, row_number() over (
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- Verificacion: debe traer la tabla ya ordenada y con posiciones unicas 1,2,3...
select posicion, nombre, puntos, exactos, aciertos, fallas
from tabla_posiciones order by posicion;
