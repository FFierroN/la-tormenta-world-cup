-- =====================================================================
-- FIX: Australia vs Turquia (14/06) -> corregir hora + ANULAR PUNTAJE
-- =====================================================================
-- Que paso: el partido se cargo a las 12:00 (mediodia) cuando era 00:00
-- (medianoche) Chile. Error de AM/PM en el fixture. La app creyo que aun no
-- empezaba -> nunca se puso en vivo, siguio pronosticable y editable.
--
-- Decision: el partido SI se jugo y queremos su data real (marcador, goles,
-- tarjetas), pero NO debe sumar puntos para NADIE (ni los que no pronosticaron).
--
-- Enfoque: NO se usa un estado especial. Se agrega la bandera 'puntaje_anulado'
-- en partidos. El partido sigue su curso normal (el robot lo pone 'final' y lo
-- rellena), pero queda EXCLUIDO del calculo de puntaje (tabla_posiciones).
--
-- Idempotente. Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- =====================================================================

-- 1) Bandera nueva (no rompe nada; default false = todos los demas suman normal).
alter table partidos add column if not exists puntaje_anulado boolean not null default false;

-- 2) Recrear tabla_posiciones EXCLUYENDO partidos con puntaje_anulado.
--    (Es la misma vista viva 'nuevo-puntaje' + un AND en el join.)
create or replace view tabla_posiciones as
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
                      and not p.puntaje_anulado   -- <-- EXCLUYE los anulados (no suman para nadie)
  where j.activo
  group by j.id
)
select *, row_number() over (
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- 3) Australia vs Turquia: corregir la hora real y marcarlo puntaje_anulado.
--    Dejamos estado='programado' y goles NULL para que el robot lo procese de
--    cero y lo rellene con los datos reales de la API (marcador, goleadores...).
update partidos
   set fecha           = timestamptz '2026-06-14 00:00:00-04',
       puntaje_anulado = true,
       estado          = 'programado',
       goles_local     = null,
       goles_visita    = null,
       minuto          = null,
       minuto_at       = null,
       finalizado_at   = null
 where equipo_local  = 'Australia'
   and equipo_visita = 'Turquía';

-- Verificacion:
select id, estado, fecha, goles_local, goles_visita, puntaje_anulado
from partidos
where equipo_local='Australia' and equipo_visita='Turquía';
